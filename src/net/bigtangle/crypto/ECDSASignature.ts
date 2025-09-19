import bigInt, { BigInteger } from 'big-integer';
import { secp256k1 } from '@noble/curves/secp256k1';
import asn1 from 'asn1.js';

/**
 * An ECKey.ECDSASignature contains the two components of an ECDSA signature (R and S).
 * The ECDSA signature algorithm is a way to prove that a party knows the private key for a given public key,
 * without revealing the private key itself. It produces two numbers, R and S, that are mathematically linked
 * to the private key and the message being signed.
 */
export class ECDSASignature {
    public readonly r: BigInteger;
    public readonly s: BigInteger;

    constructor(r: BigInteger, s: BigInteger) {
        this.r = r;
        this.s = s;
    }

    // Helper: BigInteger to minimal unsigned byte array
    private static bigIntToMinimalBytes(bi: BigInteger): Uint8Array {
        let hex = bi.toString(16);
        if (hex.length % 2 !== 0) hex = '0' + hex;
        let bytes = Buffer.from(hex, 'hex');
        // If the first byte >= 0x80, prepend 0x00 to indicate positive integer in DER
        if (bytes.length > 0 && bytes[0] & 0x80) {
            bytes = Buffer.concat([Buffer.from([0x00]), bytes]);
        }
        return new Uint8Array(bytes);
    }

    // Helper: Uint8Array to hex string
    private static bufferToHex(buf: Uint8Array): string {
        return Buffer.from(buf).toString('hex');
    }

    /**
     * Returns true if the S component is "canonical", meaning it is lower than or equal to half the curve order.
     * This is a Bitcoin-specific rule to prevent signature malleability.
     */
    public isCanonical(): boolean {
        const halfCurveOrder: BigInteger = bigInt(secp256k1.CURVE.n.toString()).divide(bigInt("2"));
        return this.s.compareTo(halfCurveOrder) <= 0;
    }

    /**
     * Will automatically adjust the S component to be lower than or equal to half the curve order, if necessary.
     * This is a Bitcoin-specific rule to prevent signature malleability.
     */
    public toCanonicalised(): ECDSASignature {
        if (!this.isCanonical()) {
            const canonicalS: BigInteger = bigInt(secp256k1.CURVE.n.toString()).subtract(this.s);
            return new ECDSASignature(this.r, canonicalS);
        }
        return this;
    }

    /**
     * DER-encodes the signature. This is a standard way to serialize ECDSA signatures.
     * The format is: 0x30 [total-length] 0x02 [R-length] [R] 0x02 [S-length] [S]
     */
    public derByteStream(): Uint8Array {
        // Manual DER encoding for ECDSA signature
        const rBytes = ECDSASignature.bigIntToMinimalBytes(this.r);
        const sBytes = ECDSASignature.bigIntToMinimalBytes(this.s);
        
        // Calculate total length
        const totalLength = 2 + rBytes.length + 2 + sBytes.length;
        
        // Create buffer for DER encoding
        const der = new Uint8Array(1 + 1 + totalLength); // 0x30 + length byte + total content
        let offset = 0;
        
        // Add sequence tag and length
        der[offset++] = 0x30; // SEQUENCE tag
        der[offset++] = totalLength; // Total length
        
        // Add r value
        der[offset++] = 0x02; // INTEGER tag
        der[offset++] = rBytes.length; // Length of r
        der.set(rBytes, offset);
        offset += rBytes.length;
        
        // Add s value
        der[offset++] = 0x02; // INTEGER tag
        der[offset++] = sBytes.length; // Length of s
        der.set(sBytes, offset);
        
        return der;
    }

    /**
     * Decodes a DER-encoded signature.
     */
    public static decodeFromDER(bytes: Uint8Array): ECDSASignature {
        let offset = 0;
        if (bytes[offset++] !== 0x30) {
            throw new Error("Bad signature: sequence tag not found");
        }
        const totalLength = bytes[offset++];
        if (totalLength !== bytes.length - 2) {
            throw new Error("Bad signature: invalid total length");
        }
        if (bytes[offset++] !== 0x02) {
            throw new Error("Bad signature: R tag not found");
        }
        const rLen = bytes[offset++];
        const r: BigInteger = bigInt(ECDSASignature.bufferToHex(bytes.slice(offset, offset + rLen)), 16);
        offset += rLen;
        if (bytes[offset++] !== 0x02) {
            throw new Error("Bad signature: S tag not found");
        }
        const sLen = bytes[offset++];
        const s: BigInteger = bigInt(ECDSASignature.bufferToHex(bytes.slice(offset, offset + sLen)), 16);
        return new ECDSASignature(r, s);
    }
}
