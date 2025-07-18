import { Buffer } from 'buffer';
import { createHash } from 'crypto';
import base58 from 'bs58';
import { Sha256Hash } from './Sha256Hash';
import { ECKey } from './ECKey';
import { TransactionOutput } from './TransactionOutput';
import { TokenInfo } from './TokenInfo'; // TokenType not exported
import { Transaction } from './Transaction'; // TransactionInput not exported
import { Coin } from './Coin';
import { Token } from './Token';
import { OrderOpenInfo } from './OrderOpenInfo'; // Side not exported
import { Side } from './Side'; // Import Side from correct location
import { TestParams } from '../params/TestParams';

export class Utils {
    public static readonly UTF8 = {
        encode: (str: string): Buffer => Buffer.from(str, 'utf8'),
        decode: (buf: Buffer): string => buf.toString('utf8')
    };

    public static base58ToBytes(base58String: string): Buffer {
        return Buffer.from(base58.decode(base58String));
    }

    public static bytesToBase58(bytes: Buffer): string {
        return base58.encode(bytes);
    }

    public static toHexString(bytes: Uint8Array): string {
        return Buffer.from(bytes).toString('hex');
    }

    public static reverseBytes(bytes: Buffer): Buffer {
        return Buffer.from(bytes).reverse();
    }

    public static doubleDigest(buffer: Buffer | Uint8Array): Buffer {
        const inputBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
        const first = createHash('sha256').update(inputBuffer).digest();
        return createHash('sha256').update(first).digest();
    }

    public static arraysEqual(a: Buffer, b: Buffer): boolean {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    public static writeNBytesString(out: Buffer, str: string): void {
        const bytes = Buffer.from(str, 'utf8');
        out.writeUInt32BE(bytes.length);
        out.write(str, out.length, bytes.length, 'utf8');
    }

    public static readNBytesString(input: Buffer): string {
        const length = input.readUInt32BE();
        return input.toString('utf8', 4, 4 + length);
    }

    public static concatArrays(...arrays: Uint8Array[]): Uint8Array {
        const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const arr of arrays) {
            result.set(arr, offset);
            offset += arr.length;
        }
        return result;
    }

    public static reverseDwordBytes(bytes: Buffer, length: number): Buffer {
        if (length <= 0) { // Handle negative or zero length
            return Buffer.alloc(0);
        }
        const buf = Buffer.alloc(length);
        // Process complete 4-byte chunks
        const chunkCount = Math.floor(length / 4);
        for (let i = 0; i < chunkCount; i++) {
            const offset = i * 4;
            const value = bytes.readUInt32BE(offset);
            buf.writeUInt32LE(value, offset);
        }
        
        // Copy any remaining bytes that don't form a complete dword
        const remainingStart = chunkCount * 4;
        const remainingBytes = length - remainingStart;
        if (remainingBytes > 0) {
            bytes.copy(buf, remainingStart, remainingStart, remainingStart + remainingBytes);
        }
        
        return buf;
    }
    
    // Corrected Sha256Hash usage throughout
    public static createSha256Hash(data: Buffer): Sha256Hash {
        return Sha256Hash.of(data);
    }

    public static dateTimeFormat(date: number | Date): string {
        const d = typeof date === 'number' ? new Date(date) : date;
        return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
    }

    public static payMoneyToECKeyList(amount: number, keyList: ECKey[]): TransactionOutput[] {
        const params = TestParams.get();
        return keyList.map(key => {
            const address = key.toAddress(params);
            const scriptPubKey = Buffer.concat([Buffer.from([0x76, 0xa9, 0x14]), address.getHash160(), Buffer.from([0x88, 0xac])]);
            return new TransactionOutput(params, null, Coin.valueOf(BigInt(amount)), scriptPubKey);
        });
    }

    public static buildSimpleTokenInfo2(tokenName: string, symbol: string, amount: number): TokenInfo {
        const token = new Token(symbol, tokenName);
        token.setAmount(BigInt(amount));
        token.setTokentype(0); // Assuming 0 for CURRENCY
        const tokenInfo = new TokenInfo();
        tokenInfo.setToken(token);
        return tokenInfo;
    }

    public static createTestTransaction(inputs: any[], outputs: any[]): Transaction {
        const tx = new Transaction(TestParams.get());
        tx.setVersion(1);
        tx.setLockTime(0);
        if (inputs) {
            for (const input of inputs) {
                tx.addInput(input);
            }
        }
        if (outputs) {
            for (const output of outputs) {
                tx.addOutput(output);
            }
        }
        return tx;
    }

    public static createToken(name: string, symbol: string, amount: number): TokenInfo {
        const token = new Token(symbol, name);
        token.setAmount(BigInt(amount));
        token.setTokentype(0); // Assuming 0 for CURRENCY
        const tokenInfo = new TokenInfo();
        tokenInfo.setToken(token);
        return tokenInfo;
    }

    public static buyOrder(tokenId: Sha256Hash, amount: number, price: number): OrderOpenInfo {
        return new OrderOpenInfo(
            undefined,
            tokenId.toString(),
            undefined,
            undefined,
            undefined,
            Side.BUY,
            undefined,
            undefined,
            price,
            amount
        );
    }

    public static sellOrder(tokenId: Sha256Hash, amount: number, price: number): OrderOpenInfo {
        return new OrderOpenInfo(
            undefined,
            tokenId.toString(),
            undefined,
            undefined,
            undefined,
            Side.SELL,
            undefined,
            undefined,
            price,
            amount
        );
    }

    public static maxOfMostFreq(...args: number[]): number {
        if (args.length === 0) {
            return 0;
        }
        const counts: { [key: number]: number } = {};
        let maxCount = 0;
        let maxFreq = 0;
        for (const arg of args) {
            counts[arg] = (counts[arg] || 0) + 1;
            if (counts[arg] > maxCount) {
                maxCount = counts[arg];
                maxFreq = arg;
            } else if (counts[arg] === maxCount) {
                maxFreq = Math.max(maxFreq, arg);
            }
        }
        return maxFreq;
    }

    public static decodeCompactBits(compact: number): bigint {
        const size = compact >> 24;
        let mantissa = BigInt(compact & 0x007fffff);
        
        // Handle negative sign bit
        if ((compact & 0x00800000) !== 0) {
            mantissa = -mantissa;
        }

        let result: bigint;
        if (size <= 3) {
            result = mantissa;
        } else {
            result = mantissa << BigInt((size - 3) * 8);
        }
        return result;
    }

    public static encodeCompactBits(value: bigint): number {
        let val = value;
        let isNegative = false;
        
        if (val < 0n) {
            isNegative = true;
            val = -val;
        }

        if (val === 0n) {
            return 0;
        }

        let nSize = 0;
        let nCompact = 0;

        // Calculate nSize (number of bytes needed for the value)
        let tempVal = val;
        while (tempVal > 0n) {
            tempVal >>= 8n;
            nSize++;
        }
        if (nSize === 0 && val > 0n) {
            nSize = 1;
        }

        if (nSize <= 3) {
            nCompact = Number(val);
        } else {
            nCompact = Number(val >> BigInt((nSize - 3) * 8));
        }

        // If the mantissa is 0x800000 or greater, shift right and increment size
        // This ensures the mantissa is always < 0x800000 (2^23)
        if (nCompact >= 0x00800000) {
            nCompact >>= 8;
            nSize++;
        }

        let compact = nCompact | (nSize << 24);
        if (isNegative) {
            compact |= 0x00800000; // Set sign bit for negative numbers
        }
        return compact;
    }
}
