import { NetworkParameters } from '../params/NetworkParameters';
import { MessageSerializer } from './MessageSerializer';
import { ProtocolException } from '../exception/ProtocolException';
import { DummySerializer } from './DummySerializer';
import { ProtocolVersion } from './ProtocolVersion';
import { Utils } from '../utils/Utils';
import { VarInt } from './VarInt';
import bigInt, { BigInteger } from 'big-integer';
import { Buffer } from 'buffer';
import { Sha256Hash } from './Sha256Hash';
import { UnsafeByteArrayOutputStream } from './UnsafeByteArrayOutputStream';

/**
 * <p>A Message is a data structure that can be serialized/deserialized using the Bitcoin serialization format.
 * Specific types of messages that are used both in the block chain, and on the wire, are derived from this
 * class.</p>
 *
 * <p>Instances of this class are not safe for use by multiple threads.</p>
 */
export abstract class Message {
    public static readonly MAX_SIZE: number = 0x02000000; // 32MB
    public static readonly UNKNOWN_LENGTH: number = Number.MIN_SAFE_INTEGER;

    // The offset is how many bytes into the provided byte array this message payload starts at.
    protected offset: number = 0;
    // The cursor keeps track of where we are in the byte array as we parse it.
    // Note that it's relative to the start of the array NOT the start of the message payload.
    protected cursor: number = 0;

    protected length: number = Message.UNKNOWN_LENGTH;

    // The raw message payload bytes themselves.
    protected payload: Buffer | null = null;

    protected recached: boolean = false;
    protected serializer: MessageSerializer<any> = DummySerializer.DEFAULT;

    protected protocolVersion: number = 0;

    protected params: NetworkParameters | null = null;

    protected constructor();
    protected constructor(params: NetworkParameters);
    protected constructor(params: NetworkParameters, payload: Buffer, offset: number, protocolVersion: number);
    protected constructor(params: NetworkParameters, payload: Buffer, offset: number, protocolVersion: number, serializer: MessageSerializer<any>, length: number);
    protected constructor(params: NetworkParameters, payload: Buffer, offset: number);
    protected constructor(params: NetworkParameters, payload: Buffer, offset: number, serializer: MessageSerializer<any>, length: number);
    protected constructor(...args: any[]) {
        if (args.length === 0) {
            this.serializer = DummySerializer.DEFAULT;
        } else if (args.length === 1) {
            this.params = args[0];
            if (this.params) {
                this.serializer = this.params.getDefaultSerializer();
            }
        } else if (args.length >= 4) {
            const params = args[0];
            const payload = args[1];
            const offset = args[2];
            const protocolVersion = args[3];
            
            if (args.length === 4) {
                // Constructor with 4 parameters
                this.init(params, payload, offset, protocolVersion, params.getDefaultSerializer(), Message.UNKNOWN_LENGTH);
            } else if (args.length === 6) {
                // Constructor with 6 parameters
                const serializer = args[4];
                const length = args[5];
                this.init(params, payload, offset, protocolVersion, serializer, length);
            } else if (args.length === 5 && typeof args[4] === 'number') {
                // Constructor with 5 parameters (last one is length)
                const serializer = params.getDefaultSerializer();
                const length = args[4];
                this.init(params, payload, offset, params.getProtocolVersionNum(ProtocolVersion.CURRENT), serializer, length);
            } else if (args.length === 5) {
                // Constructor with 5 parameters (last one is serializer)
                const serializer = args[4];
                const length = Message.UNKNOWN_LENGTH;
                this.init(params, payload, offset, params.getProtocolVersionNum(ProtocolVersion.CURRENT), serializer, length);
            }
        }
    }

    private init(params: NetworkParameters, payload: Buffer, offset: number, protocolVersion: number, serializer: MessageSerializer<any>, length: number): void {
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
     * <p>To be called before any change of internal values including any setters. This ensures any cached byte array is
     * removed.<p/>
     * <p>Child messages of this object(e.g. Transactions belonging to a Block) will not have their internal byte caches
     * invalidated unless they are also modified internally.</p>
     */
    protected unCache(): void {
        this.payload = null;
        this.recached = false;
    }

    protected adjustLength(newArraySize: number, adjustment: number): void {
        if (this.length === Message.UNKNOWN_LENGTH)
            return;
        // Our own length is now unknown if we have an unknown length adjustment.
        if (adjustment === Message.UNKNOWN_LENGTH) {
            this.length = Message.UNKNOWN_LENGTH;
            return;
        }
        this.length += adjustment;
        // Check if we will need more bytes to encode the length prefix.
        if (newArraySize === 1)
            this.length++;  // The assumption here is we never call adjustLength with the same arraySize as before.
        else if (newArraySize !== 0)
            this.length += VarInt.sizeOf(newArraySize) - VarInt.sizeOf(newArraySize - 1);
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
     * Returns a copy of the array returned by {@link Message#unsafeBitcoinSerialize()}, which is safe to mutate.
     * If you need extra performance and can guarantee you won't write to the array, you can use the unsafe version.
     *
     * @return a freshly allocated serialized byte array
     */
    public bitcoinSerializeCopy(): Buffer {
        const bytes = this.unsafeBitcoinSerialize();

        const copy = Buffer.alloc(bytes.length);
        bytes.copy(copy, 0, 0, bytes.length);
        return copy;
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
        if (this.payload !== null) {
            if (this.offset === 0 && this.length === this.payload.length) {
                // Cached byte array is the entire message with no extras so we can return as is and avoid an array
                // copy.
                return this.payload;
            }

            const buf = Buffer.alloc(this.length);
            this.payload.copy(buf, 0, this.offset, this.offset + this.length);
            return buf;
        }

        // No cached array available so serialize parts by stream.
        const stream = new UnsafeByteArrayOutputStream(this.length < 32 ? 32 : this.length + 32);
        try {
            this.bitcoinSerializeToStream(stream);
        } catch (e) {
            // Cannot happen, we are serializing to a memory stream.
        }

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
            this.length = this.payload.length;
            return this.payload;
        }
        // Record length. If this Message wasn't parsed from a byte stream it won't have length field
        // set (except for static length message types).  Setting it makes future streaming more efficient
        // because we can preallocate the ByteArrayOutputStream buffer and avoid resizing.
        const buf = stream.toByteArray();
        this.length = buf.length;
        return buf;
    }

    /**
     * Serialize this message to the provided OutputStream using the bitcoin wire format.
     *
     * @param stream
     */
    public bitcoinSerialize(stream: any): void {
        // 1st check for cached bytes.
        if (this.payload !== null && this.length !== Message.UNKNOWN_LENGTH) {
            stream.write(this.payload, this.offset, this.length);
            return;
        }

        this.bitcoinSerializeToStream(stream);
    }

    /**
     * Serializes this message to the provided stream. If you just want the raw bytes use bitcoinSerialize().
     */
    protected bitcoinSerializeToStream(stream: any): void {
        console.error(`Error: ${this.constructor.name} class has not implemented bitcoinSerializeToStream method. Generating message with no payload`);
    }

    /**
     * This method is a NOP for all classes except Block and Transaction.  It is only declared in Message
     * so BitcoinSerializer can avoid 2 instanceof checks + a casting.
     */
    public getHash(): Sha256Hash {
        throw new Error("Unsupported operation");
    }

    /**
     * This returns a correct value by parsing the message.
     */
    public getMessageSize(): number {
        if (this.length === Message.UNKNOWN_LENGTH)
            throw new Error(`Length field has not been set in ${this.constructor.name}.`);
        return this.length;
    }

    protected readUint32(): number {
        try {
            if (this.payload === null) {
                throw new ProtocolException("Payload is null");
            }
            const u = this.payload.readUInt32LE(this.cursor);
            this.cursor += 4;
            return u;
        } catch (e) {
            if (e instanceof Error) {
                throw new ProtocolException(e.message, e);
            } else {
                throw new ProtocolException(String(e));
            }
        }
    }

    protected readInt64(): BigInteger {
        try {
            if (this.payload === null) {
                throw new ProtocolException("Payload is null");
            }
            const u = Utils.readInt64(this.payload, this.cursor);
            this.cursor += 8;
            return u;
        } catch (e) {
            if (e instanceof Error) {
                throw new ProtocolException(e.message, e);
            } else {
                throw new ProtocolException(String(e));
            }
        }
    }

    protected readUint64(): BigInteger {
        // Java does not have an unsigned 64 bit type. So scrape it off the wire then flip.
        if (this.payload === null) {
            throw new ProtocolException("Payload is null");
        }
        return bigInt(Utils.HEX.encode(Utils.reverseBytes(this.readBytes(8))), 16);
    }

    protected readVarInt(): number;
    protected readVarInt(offset: number): number;
    protected readVarInt(offset?: number): number {
        const actualOffset = offset || 0;
        try {
            if (this.payload === null) {
                throw new ProtocolException("Payload is null");
            }
            const varint = VarInt.fromBuffer(this.payload, this.cursor + actualOffset);
            this.cursor += actualOffset + varint.getOriginalSizeInBytes();
            return varint.value.toJSNumber();
        } catch (e) {
            if (e instanceof Error) {
                throw new ProtocolException(e.message, e);
            } else {
                throw new ProtocolException(String(e));
            }
        }
    }

    protected readBytes(length: number): Buffer {
        if (length > Message.MAX_SIZE) {
            throw new ProtocolException("Claimed value length too large: " + length);
        }
        try {
            if (this.payload === null) {
                throw new ProtocolException("Payload is null");
            }
            const b = Buffer.alloc(length);
            this.payload.copy(b, 0, this.cursor, this.cursor + length);
            this.cursor += length;
            return b;
        } catch (e) {
            if (this.payload !== null) {
                console.debug(" payload.length " + this.payload.length + " readBytes" + length);
            }
            if (e instanceof Error) {
                throw new ProtocolException(e.message, e);
            } else {
                throw new ProtocolException(String(e));
            }
        }
    }

    protected readByteArray(): Buffer {
        const len = this.readVarInt();
        return this.readBytes(len);
    }

    protected readStr(): string {
        const length = this.readVarInt();
        return length === 0 ? "" : Utils.toString(this.readBytes(length), "UTF-8"); // optimization for empty strings
    }

    protected readHash(): Sha256Hash {
        // We have to flip it around, as it's been read off the wire in little endian.
        // Not the most efficient way to do this but the clearest.
        return Sha256Hash.wrapReversed(this.readBytes(32));
    }

    protected hasMoreBytes(): boolean {
        return this.payload !== null && this.cursor < this.payload.length;
    }

    /** Network parameters this message was created with. */
    public getParams(): NetworkParameters  {
        if( this.params === null) {
            throw new Error("Network parameters are not set for this message.");
        }
        return this.params;
    }

    /**
     * Set the serializer for this message when deserialized by Java.
     */
    private readObject(inStream: any): void {
        // This is a placeholder for Java deserialization compatibility
        // In TypeScript, we don't need to implement this method
        if (this.params !== null) {
            this.serializer = this.params.getDefaultSerializer();
        }
    }
}
