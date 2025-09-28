// ECDSASignature.ts
// TypeScript translation of ECDSASignature inner class from ECKey.java
// Uses imports from core, utils, exception, params, script

import { Buffer } from 'buffer';
import { secp256k1 } from '@noble/curves/secp256k1';
import { InvalidTransactionDataException } from '../exception/Exceptions';


export class ECDSASignature {
    public r: bigint;
    public s: bigint;

    constructor(r: bigint, s: bigint) {
        this.r = r;
        this.s = s;
    }
    
    public toCanonicalised(): ECDSASignature {
        const HALF_CURVE_ORDER = secp256k1.CURVE.n / BigInt(2);
        if (this.s > HALF_CURVE_ORDER) {
            // The order of the curve is the number of valid points that exist on that curve.
            // If S is above the order of the curve divided by two, its complement modulo N (the curve order) is used instead.
            return new ECDSASignature(this.r, secp256k1.CURVE.n - this.s);
        } else {
            return this;
        }
    }

    public isCanonical(): boolean {
        const HALF_CURVE_ORDER = secp256k1.CURVE.n / BigInt(2);
        return this.s <= HALF_CURVE_ORDER;
    }

    /**
     * Returns the DER encoding of the signature as a Buffer.
     * This is a strict implementation that follows Bitcoin's BIP-66.
     */
    public encodeDER(): Buffer {
        let rHex = this.r.toString(16);
        if (rHex.length % 2 !== 0) rHex = '0' + rHex;
        let r = Buffer.from(rHex, 'hex');

        let sHex = this.s.toString(16);
        if (sHex.length % 2 !== 0) sHex = '0' + sHex;
        let s = Buffer.from(sHex, 'hex');

        // Ensure positive integers
        if (r.length > 0 && (r[0] & 0x80)) {
            r = Buffer.concat([Buffer.from([0x00]), r]);
        }
        if (s.length > 0 && (s[0] & 0x80)) {
            s = Buffer.concat([Buffer.from([0x00]), s]);
        }

        // Remove unnecessary leading zeros
        while (r.length > 1 && r[0] === 0x00 && !(r[1] & 0x80)) {
            r = r.slice(1);
        }
        while (s.length > 1 && s[0] === 0x00 && !(s[1] & 0x80)) {
            s = s.slice(1);
        }

        const totalLen = 2 + r.length + 2 + s.length;
        const der = Buffer.alloc(2 + totalLen);
        let offset = 0;

        der[offset++] = 0x30; // SEQUENCE
        der[offset++] = totalLen;

        der[offset++] = 0x02; // INTEGER
        der[offset++] = r.length;
        r.copy(der, offset);
        offset += r.length;

        der[offset++] = 0x02; // INTEGER
        der[offset++] = s.length;
        s.copy(der, offset);

        return der;
    }

    /**
     * Returns the signature as a Buffer in compact format (r, s concatenated, 64 bytes).
     */
    public toCompact(): Buffer {
        const rBuf = Buffer.from(this.r.toString(16).padStart(64, '0'), 'hex');
        const sBuf = Buffer.from(this.s.toString(16).padStart(64, '0'), 'hex');
        return Buffer.concat([rBuf, sBuf]);
    }

    /**
     * Returns the signature as a hex string (DER encoded).
     */
    public toHexDER(): string {
        return this.encodeDER().toString('hex');
    }

    /**
     * Returns the signature as a hex string (compact format).
     */
    public toHexCompact(): string {
        return this.toCompact().toString('hex');
    }

    /**
     * Parse a DER-encoded signature Buffer into an ECDSASignature.
     * This is a strict implementation that follows Bitcoin's BIP-66.
     */
    public static decodeDER(buffer: Buffer): ECDSASignature {
        if (buffer.length < 8 || buffer.length > 72) throw new InvalidTransactionDataException('Invalid DER signature length');
        if (buffer[0] !== 0x30) throw new InvalidTransactionDataException('Invalid DER sequence');
        
        const totalLen = buffer[1];
        if (totalLen !== buffer.length - 2) throw new InvalidTransactionDataException('Invalid DER length');

        let offset = 2;
        if (buffer[offset] !== 0x02) throw new InvalidTransactionDataException('Invalid DER integer for r');
        offset++;

        const rLen = buffer[offset];
        offset++;
        if (rLen === 0) throw new InvalidTransactionDataException('r length is zero');
        if (buffer[offset] & 0x80) throw new InvalidTransactionDataException('r is negative');
        if (rLen > 1 && buffer[offset] === 0x00 && !(buffer[offset + 1] & 0x80)) throw new InvalidTransactionDataException('r is not minimally encoded');
        
        const rSlice = buffer.slice(offset, offset + rLen);
        const r = BigInt('0x' + rSlice.toString('hex'));
        offset += rLen;

        if (buffer[offset] !== 0x02) throw new InvalidTransactionDataException('Invalid DER integer for s');
        offset++;

        const sLen = buffer[offset];
        offset++;
        if (sLen === 0) throw new InvalidTransactionDataException('s length is zero');
        if (buffer[offset] & 0x80) throw new InvalidTransactionDataException('s is negative');
        if (sLen > 1 && buffer[offset] === 0x00 && !(buffer[offset + 1] & 0x80)) throw new InvalidTransactionDataException('s is not minimally encoded');

        const sSlice = buffer.slice(offset, offset + sLen);
        const s = BigInt('0x' + sSlice.toString('hex'));
        offset += sLen;

        if (offset !== buffer.length) throw new InvalidTransactionDataException('Extra data at end of signature');

        return new ECDSASignature(r, s);
    }

    public recoverPublicKey(messageHash: Uint8Array, recoveryId: number): Uint8Array {
        // Recover public key using noble/secp256k1
        const signature = new Uint8Array(64);
        const rBytes = new Uint8Array(Buffer.from(this.r.toString(16).padStart(64, '0'), 'hex'));
        const sBytes = new Uint8Array(Buffer.from(this.s.toString(16).padStart(64, '0'), 'hex'));
        signature.set(rBytes, 0);
        signature.set(sBytes, 32);
        
        const publicKeyPoint = secp256k1.Signature.fromCompact(signature).recoverPublicKey(messageHash);
        return publicKeyPoint.toRawBytes(true); // compressed format
    }
}
