// ECDSASignature.ts
// TypeScript translation of ECDSASignature inner class from ECKey.java
// Uses imports from core, utils, exception, params, script

import { Buffer } from 'buffer';
import { secp256k1 } from '@noble/curves/secp256k1';
import { InvalidTransactionDataException } from '../exception/Exceptions';

import bigInt, { BigInteger } from 'big-integer';

export class ECDSASignature {
    public r: bigint;
    public s: bigint;

    constructor(r: bigint, s: bigint) {
        this.r = r;
        this.s = s;
    }

    /**
     * Returns the DER encoding of the signature as a Buffer.
     */
    public encodeDER(): Buffer {
        // Minimal DER encoding for ECDSA signature (r, s)
        function encodeInt(num: bigint): Buffer {
            const hex = num.toString(16).padStart(2, '0');
            const bytes = Buffer.from(hex, 'hex');
            // If the most significant bit is set, add a 00 byte
            if (bytes[0] & 0x80) {
                return Buffer.concat([Buffer.from([0x00]), bytes]);
            }
            return bytes;
        }
        
        const rBytes = encodeInt(this.r);
        const sBytes = encodeInt(this.s);
        const totalLen = 2 + rBytes.length + 2 + sBytes.length;
        const der = Buffer.alloc(2 + totalLen);
        let offset = 0;
        der[offset++] = 0x30; // SEQUENCE
        der[offset++] = totalLen;
        der[offset++] = 0x02; // INTEGER
        der[offset++] = rBytes.length;
        rBytes.copy(der, offset);
        offset += rBytes.length;
        der[offset++] = 0x02; // INTEGER
        der[offset++] = sBytes.length;
        sBytes.copy(der, offset);
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
     */
    public static decodeDER(buffer: Buffer): ECDSASignature {
        // This is a minimal parser for DER-encoded ECDSA signatures.
        if (buffer[0] !== 0x30) throw new InvalidTransactionDataException('Invalid DER sequence');
        let offset = 2;
        if (buffer[offset++] !== 0x02) throw new InvalidTransactionDataException('Invalid DER integer for r');
        const rLen = buffer[offset++];
        const r = BigInt('0x' + buffer.slice(offset, offset + rLen).toString('hex'));
        offset += rLen;
        if (buffer[offset++] !== 0x02) throw new InvalidTransactionDataException('Invalid DER integer for s');
        const sLen = buffer[offset++];
        const s = BigInt('0x' + buffer.slice(offset, offset + sLen).toString('hex'));
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
