import { NetworkParameters } from '../params/NetworkParameters';
import { MessageSerializer } from './MessageSerializer';
import { ProtocolException } from '../exception/ProtocolException';
import { VarInt } from './VarInt';
import { Utils } from '../utils/Utils';
import { Sha256Hash } from './Sha256Hash';
import { UnsafeByteArrayOutputStream } from './UnsafeByteArrayOutputStream';
 

/**
 * A Message is a data structure that can be serialized/deserialized using the Bitcoin serialization format.
 * Specific types of messages that are used both in the block chain, and on the wire, are derived from this
 * class.
 *
 * Instances of this class are not safe for use by multiple threads.
 */
export abstract class Message {
    public static readonly MAX_SIZE = 0x02000000; // 32MB
    public static readonly UNKNOWN_LENGTH = Number.MIN_SAFE_INTEGER;

    // The offset is how many bytes into the provided byte array this message payload starts at.
    protected offset: number = 0;
    // The cursor keeps track of where we are in the byte array as we parse it.
    // Note that it's relative to the start of the array NOT the start of the message payload.
    protected cursor: number = 0;

    protected length: number = Message.UNKNOWN_LENGTH;

    // The raw message payload bytes themselves.
    protected payload: Buffer | null = null;

    protected recached: boolean = false;
    protected serializer: MessageSerializer<NetworkParameters>;

    protected protocolVersion: number = 0;

    protected params!: NetworkParameters;

    protected constructor(params?: NetworkParameters) {
        if (params) {
            this.params = params;
            this.serializer = params.getDefaultSerializer();
        } else {
            // Using DummySerializer.DEFAULT equivalent
            this.serializer = {
                params: null,
                parseRetain: false,
                isParseRetainMode: () => false,
                deserialize: () => { throw new Error("Not implemented"); },
                makeAlertMessage: () => { throw new Error("Not implemented"); },
                makeBlock: () => { throw new Error("Not implemented"); },
                makeZippedBlock: async () => { throw new Error("Not implemented"); },
                makeZippedBlockStream: async () => { throw new Error("Not implemented"); },
                makeTransaction: () => { throw new Error("Not implemented"); },
                makeTransactionFromBytes: () => { throw new Error("Not implemented"); },
                seekPastMagicBytes: () => { throw new Error("Not implemented"); },
                serialize: () => { throw new Error("Not implemented"); },
                serializeMessage: () => { throw new Error("Not implemented"); }
            } as unknown as MessageSerializer<NetworkParameters>;
        }
    }

    /**
     * @param params NetworkParameters object.
     * @param payload Bitcoin protocol formatted byte array containing message content.
     * @param offset The location of the first payload byte within the array.
     * @param protocolVersion Bitcoin protocol version.
     * @param serializer the serializer to use for this message.
     * @param length The length of message payload if known. Usually this is provided when deserializing of the wire
     * as the length will be provided as part of the header. If unknown then set to Message.UNKNOWN_LENGTH
     * @throws ProtocolException
     */
    protected parseWithParams(
        params: NetworkParameters,
        payload: Buffer,
        offset: number,
        protocolVersion: number,
        serializer: MessageSerializer<any>,
        length: number
    ): void {
        this.serializer = serializer;
        this.protocolVersion = protocolVersion;
        this.params = params;
        this.payload = payload;
        this.cursor = this.offset = offset;
        this.length = length;

        this.parse();

        if (this.length === Message.UNKNOWN_LENGTH) {
            throw new Error(`Length field has not been set in constructor for ${this.constructor.name} after parse.`);
        }

        if (!serializer.isParseRetainMode()) {
            this.payload = null;
        }
    }

    // These methods handle the serialization/deserialization using the custom Bitcoin protocol.
    protected abstract parse(): void;

    /**
     * Serialize this message to the provided OutputStream using the bitcoin wire format.
     *
     * @param stream
     */
    public bitcoinSerialize(stream: UnsafeByteArrayOutputStream): void {
        // 1st check for cached bytes.
        if (this.payload != null && this.length !== Message.UNKNOWN_LENGTH) {
            if (this.offset === 0 && this.payload.length === this.length) {
                stream.write(this.payload);
            } else {
                stream.write(this.payload.subarray(this.offset, this.offset + this.length));
            }
            return;
        }

        this.bitcoinSerializeToStream(stream);
    }

    /**
     * used for unit testing
     */
    public isCached(): boolean {
        return this.payload !== null;
    }

    public isRecached(): boolean {
        return this.recached;
    }
 
    /**
     * Serialize this message to a byte array that conforms to the bitcoin wire protocol.
     * <br/>
     * This method may return the original byte array used to construct this message if the
     * following conditions are met:
     * <ol>
     * <li>1) The message was parsed from a byte array with parseRetain = true</li>
     * <li>2) The message has not been modified</li>
     * <li>3) The array had an offset of 0 and no surplus bytes</li>
     * </ol>
     *
     * If condition 3 is not met then an copy of the relevant portion of the array will be returned.
     * Otherwise a full serialize will occur. For this reason you should only use this API if you can guarantee you
     * will treat the resulting array as read only.
     *
     * @return a byte array owned by this object, do NOT mutate it.
     */
    public unsafeBitcoinSerialize(): Buffer {
        // 1st attempt to use a cached array.
        if (this.payload) {
            if (this.offset === 0 && this.length === this.payload.length) {
                // Cached byte array is the entire message with no extras so we can return as is and avoid an array
                // copy.
                return this.payload;
            }

            return this.payload.subarray(this.offset, this.offset + this.length);
        }

        // No cached array available so serialize parts by stream.
        const stream = new UnsafeByteArrayOutputStream(
            this.length < 32 ? 32 : this.length + 32
        );
        this.bitcoinSerializeToStream(stream);

        if (this.serializer.isParseRetainMode()) {
            // A free set of steak knives!
            // If there happens to be a call to this method we gain an opportunity to recache
            // the byte array and in this case it contains no bytes from parent messages.
            // This give a dual benefit.  Releasing references to the larger byte array so that it
            // it is more likely to be GC'd.  And preventing double serializations.  E.g. calculating
            // merkle root calls this method.  It is will frequently happen prior to serializing the block
            // which means another call to bitcoinSerialize is coming.  If we didn't recache then internal
            // serialization would occur a 2nd time and every subsequent time the message is serialized.
            this.payload = stream.toByteArray();
            this.cursor = this.cursor - this.offset;
            this.offset = 0;
            this.recached = true;
            this.length = stream.size();
            return this.payload;
        }
        // Record length. If this Message wasn't parsed from a byte stream it won't have length field
        // set (except for static length message types).  Setting it makes future streaming more efficient
        // because we can preallocate the ByteArrayOutputStream buffer and avoid resizing.
        return stream.toByteArray();
    }
    public adjustLength(newArraySize: number, adjustment: number): void {
        // Default implementation - can be overridden by subclasses
        this.length += adjustment;
    }

  
    /**
     * Serialize this message to the provided OutputStream using the bitcoin wire format.
     *
     * @param stream
     */
    public bitcoinSerializeToStream(stream: UnsafeByteArrayOutputStream): void {
        // Default implementation does nothing
        // This method should be overridden by subclasses
    }

    /**
     * This method is a NOP for all classes except Block and Transaction.  It is only declared in Message
     * so BitcoinSerializer can avoid 2 instanceof checks + a casting.
     */
    public getHash(): Sha256Hash {
        throw new Error('Method not implemented.');
    }

    /**
     * This returns a correct value by parsing the message.
     */
    public getMessageSize(): number {
        if (this.length === Message.UNKNOWN_LENGTH) {
            throw new Error(`Length field has not been set in ${this.constructor.name}.`);
        }
        return this.length;
    }

    protected readUint32(): number {
        try {
            if (!this.payload) throw new Error("Payload is null");
            const u = Utils.readUint32(this.payload, this.cursor);
            this.cursor += 4;
            return u;
        } catch (e) {
            throw new ProtocolException(e instanceof Error ? e.message : String(e));
        }
    }

    protected readInt64(): bigint {
        try {
            if (!this.payload) throw new Error("Payload is null");
            const u = Utils.readInt64(this.payload, this.cursor);
            this.cursor += 8;
            return BigInt(u);
        } catch (e) {
            throw new ProtocolException(e instanceof Error ? e.message : String(e));
        }
    }

    protected readUint64(): bigint {
        // Java does not have an unsigned 64 bit type. So scrape it off the wire then flip.
        return BigInt(`0x${Utils.reverseBytes(this.readBytes(8)).toString()}`);
    }

    protected readVarInt(offset: number = 0): bigint {
        try {
            if (!this.payload) throw new Error("Payload is null");
            const varint = VarInt.fromBuffer(this.payload, this.cursor + offset);
            this.cursor += offset + varint.getOriginalSizeInBytes();
            return BigInt(varint.value.toString());
        } catch (e) {
            throw new ProtocolException(e instanceof Error ? e.message : String(e));
        }
    }
    protected readBytes(length: number): Buffer {
        if (length > Message.MAX_SIZE) {
            throw new ProtocolException(`Claimed value length too large: ${Message.MAX_SIZE}`);
        }
        try {
            if (!this.payload) throw new Error("Payload is null");
            // Check if we have enough bytes to read
            if (this.cursor + length > this.payload.length) {
                throw new ProtocolException(`Not enough bytes to read: requested ${length}, available ${this.payload.length - this.cursor}`);
            }
            const b = this.payload.subarray(this.cursor, this.cursor + length);
            this.cursor += length;
            return b;
        } catch (e) {
            throw new ProtocolException(e instanceof Error ? e.message : String(e));
        }
    }
    protected readByteArray(): Buffer {
        const len = this.readVarInt();
        return this.readBytes(Number(len));
    }
    protected readStr(): string {
        const length = this.readVarInt();
        return length === 0n ? '' : Utils.toString(this.readBytes(Number(length)), 'utf-8'); // optimization for empty strings
    }
    protected readHash(): Sha256Hash {
        // We have to flip it around, as it's been read off the wire in little endian.
        // Not the most efficient way to do this but the clearest.
        const bytes = this.readBytes(32);
        const wrapped = Sha256Hash.wrapReversed(bytes);
        return wrapped || Sha256Hash.ZERO_HASH;
    }
    protected hasMoreBytes(): boolean {
        return this.payload !== null && this.cursor < this.payload.length;
    }
    public unCache(payload: Buffer | null = null): void {
        this.payload = null;
    }

    public getParams(): NetworkParameters {
        return this.params;
    }
  
    /**
     * Serialize this message to a byte array that conforms to the bitcoin wire protocol.
     * <br/>
     * This method returns a freshly allocated copy of the serialized byte array.
     * bitcoinSerialize()
     * @return a freshly allocated serialized byte array
     */
    public bitcoinSerializeCopy(): Buffer {
        const bytes = this.unsafeBitcoinSerialize();
        const copy = Buffer.alloc(bytes.length);
        bytes.copy(copy, 0, 0, bytes.length);
        return copy;
    }
}
