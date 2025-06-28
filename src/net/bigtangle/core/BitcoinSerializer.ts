import { MessageSerializer } from './MessageSerializer';
import { NetworkParameters } from '../params/NetworkParameters';
import { ProtocolException } from '../exception/Exceptions';
import { Message } from './Message';
import { Block } from './Block';
import { Transaction } from './Transaction';
import { AlertMessage } from './AlertMessage';
import { BloomFilter } from './BloomFilter';
import { Sha256Hash } from './Sha256Hash';
import { Utils } from './Utils';
import { Buffer } from 'buffer';
// We'll use a simple writeable stream interface
interface WriteableStream {
    write(chunk: Buffer): void;
}

// Define BitcoinPacketHeader locally since we removed the separate file
class BitcoinPacketHeader {
    static readonly HEADER_LENGTH = 12 + 4 + 4; // COMMAND_LEN (12) + size (4) + checksum (4)

    constructor(
        public readonly command: string,
        public readonly size: number,
        public readonly checksum: Buffer
    ) {}
}

const COMMAND_LEN = 12;

export class BitcoinSerializer extends MessageSerializer {
    private static readonly names = new Map<Function, string>([
        [Block, "block"],
        [Transaction, "tx"],
        [BloomFilter, "filterload"]
    ]);

    constructor(params: NetworkParameters, parseRetain: boolean) {
        super(params, parseRetain);
    }

    public serializeMessage(message: Message): Buffer {
        const name = BitcoinSerializer.names.get(message.constructor);
        if (!name) {
            throw new Error(`BitcoinSerializer doesn't currently know how to serialize ${message.constructor.name}`);
        }
        const buffer = message.bitcoinSerialize();
        const chunks: Buffer[] = [];
        this.serialize(name, Buffer.from(buffer), chunks);
        return Buffer.concat(chunks);
    }

    public serialize(name: string, message: Buffer, out: Buffer[]): void {
        const header = Buffer.alloc(4 + COMMAND_LEN + 4 + 4);
        const messageBuffer = Buffer.from(message);
        
        const hash = Sha256Hash.hashTwice(messageBuffer);
        const checksum = hash.toBuffer().subarray(0, 4);

        const packetMagic = (this.params as any).getPacketMagic ? 
            (this.params as any).getPacketMagic() : 
            0xf9beb4d9;
        header.writeUInt32BE(packetMagic, 0);

        for (let i = 0; i < name.length && i < COMMAND_LEN; i++) {
            header[4 + i] = name.charCodeAt(i) & 0xFF;
        }

        header.writeUInt32LE(message.length, 4 + COMMAND_LEN);
        header.write(checksum.toString('hex'), 4 + COMMAND_LEN + 4, 4, 'hex');

        out.push(header);
        out.push(messageBuffer);
    }


    deserialize(inBuffer: Buffer): Message {
        const newBuffer = this.seekPastMagicBytes(inBuffer);
        const header = this.deserializeHeader(newBuffer);
        return this.deserializePayload(header, newBuffer.subarray(BitcoinPacketHeader.HEADER_LENGTH));
    }

    deserializePayload(header: BitcoinPacketHeader, inBuffer: Buffer): Message {
        const payloadBytes = inBuffer.subarray(0, header.size);
        // inBuffer position is advanced by header.size
        // No need to reassign inBuffer since we return the message

        // Verify checksum
        const hash = Sha256Hash.hashTwice(payloadBytes);
        const checksum = hash.subarray(0, 4);
        // Compare checksums manually
        let checksumMatch = true;
        for (let i = 0; i < 4; i++) {
            if (checksum[i] !== header.checksum[i]) {
                checksumMatch = false;
                break;
            }
        }
        
        if (!checksumMatch) {
            throw new ProtocolException(`Checksum failed to verify`);
        }

        return this.makeMessage(header.command, header.size, payloadBytes, hash.toBuffer(), header.checksum);
    }

    private makeMessage(command: string, length: number, payloadBytes: Buffer, hash: Buffer, checksum: Buffer): Message {
        if (command === "block") {
            return this.makeBlock(payloadBytes, 0, length);
        } else if (command === "tx") {
            return this.makeTransaction(payloadBytes, 0, length, hash);
        } else if (command === "alert") {
            return this.makeAlertMessage(payloadBytes);
        } else if (command === "filterload") {
            return this.makeBloomFilter(payloadBytes);
        } else {
            throw new ProtocolException(`No support for deserializing message with name ${command}`);
        }
    }

    getParameters(): NetworkParameters {
        return this.params;
    }

    makeAlertMessage(payloadBytes: Buffer): AlertMessage {
        return new AlertMessage(this.params, payloadBytes);
    }

    public makeBlock(payloadBytes: Buffer): Block;
    public makeBlock(payloadBytes: Buffer, offset: number, length: number): Block;
    public makeBlock(payloadBytes: Buffer, offset?: number, length?: number): Block {
        if (offset === undefined) {
            return new Block(this.params, payloadBytes, 0, this, payloadBytes.length);
        }
        return new Block(this.params, payloadBytes, offset, this, length ?? payloadBytes.length);
    }

    public makeTransaction(payloadBytes: Buffer, offset: number, length: number, hash: Buffer | null): Transaction {
        const tx = new Transaction(this.params, payloadBytes, offset, this);
        if (hash) {
            tx.setHash(Sha256Hash.wrap(hash));
        }
        return tx;
    }

    public seekPastMagicBytes(inBuffer: Buffer): Buffer {
        let magicCursor = 3;
        let position = 0;
        const magic = (this.params as any).getPacketMagic ? 
            (this.params as any).getPacketMagic() : 
            0xf9beb4d9;
        
        while (position < inBuffer.length) {
            const b = inBuffer[position];
            const expectedByte = (magic >>> (magicCursor * 8)) & 0xFF;
            
            if (b === expectedByte) {
                magicCursor--;
                position++;
                if (magicCursor < 0) {
                    return inBuffer.subarray(position);
                }
            } else {
                magicCursor = 3;
                position++;
            }
        }
        throw new Error("Magic bytes not found");
    }

    public isParseRetainMode(): boolean {
        return typeof this.parseRetain !== 'undefined' ? !!this.parseRetain : false;
    }

    public makeBloomFilter(payloadBytes: Buffer): BloomFilter {
        return new BloomFilter(this.params, payloadBytes, 0, this);
    }

    deserializeHeader(inBuffer: Buffer): BitcoinPacketHeader {
        const header = inBuffer.subarray(0, BitcoinPacketHeader.HEADER_LENGTH);
        // inBuffer position is advanced by HEADER_LENGTH in caller
        // We don't modify the original buffer here

        let cursor = 0;
        let commandEnd = 0;

        // Find command end (null-terminated string)
        for (; commandEnd < COMMAND_LEN && header[commandEnd] !== 0; commandEnd++);
        const command = header.subarray(0, commandEnd).toString('ascii');
        cursor = COMMAND_LEN;

        // Read size
        const size = header.readUInt32LE(cursor);
        cursor += 4;

        const MAX_MESSAGE_SIZE = 10 * 1024 * 1024; // 10MB max message size
        if (size > MAX_MESSAGE_SIZE || size < 0) {
            throw new ProtocolException(`Message size too large: ${size}`);
        }

        // Read checksum
        const checksum = header.subarray(cursor, cursor + 4);
        cursor += 4;

        return new BitcoinPacketHeader(command, size, checksum);
    }
}

// BitcoinPacketHeader is defined at the top of the file
