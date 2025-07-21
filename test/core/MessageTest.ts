
import { Buffer } from 'buffer';
import { MainNetParams } from '../../src/net/bigtangle/params/MainNetParams';
import { Message } from '../../src/net/bigtangle/core/Message';
import { VarInt } from '../../src/net/bigtangle/core/VarInt';

describe('MessageTest', () => {
    // If readStr() is vulnerable this causes OutOfMemory
    test('readStrOfExtremeLength', () => {
        expect(() => {
            const params = MainNetParams.get();
            const chunks: Buffer[] = [];
            const writer = { write: (chunk: Buffer) => chunks.push(chunk) };
            VarInt.write(Number.MAX_SAFE_INTEGER, writer);
            const payload = Buffer.concat(chunks);
            new VarStrMessage(params, payload);
        }).toThrow('Claimed value length too large: 9007199254740991');
    });

    class VarStrMessage extends Message {
        constructor(params: any, payload: Buffer) {
            super(params, payload, 0);
        }

        protected parse(): void {
            this.readStr();
        }
    }

    // If readBytes() is vulnerable this causes OutOfMemory
    test('readByteArrayOfExtremeLength', () => {
        expect(() => {
            const params = MainNetParams.get();
            const chunks: Buffer[] = [];
            const writer = { write: (chunk: Buffer) => chunks.push(chunk) };
            VarInt.write(Number.MAX_SAFE_INTEGER, writer);
            const payload = Buffer.concat(chunks);
            new VarBytesMessage(params, payload);
        }).toThrow('Claimed value length too large: 9007199254740991');
    });

    class VarBytesMessage extends Message {
        constructor(params: any, payload: Buffer) {
            super(params, payload, 0);
        }

        protected parse(): void {
            this.readByteArray();
        }
    }
});
