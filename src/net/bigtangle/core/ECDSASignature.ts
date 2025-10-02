// ECDSASignature.ts
// TypeScript translation of ECDSASignature from ECKey.java
// Combined version with strict BIP-66 DER encoding and additional methods

import { Buffer } from 'buffer';
import { secp256k1 } from '@noble/curves/secp256k1';
import * as asn1js from 'asn1js';
import { InvalidTransactionDataException } from '../exception/Exceptions';

// The order of the curve
const CURVE_N = secp256k1.CURVE.n;
// The half order of the curve
const HALF_CURVE_ORDER = CURVE_N / 2n;

export class ECDSASignature {
    public r: bigint;
    public s: bigint;

    /**
     * Constructs a signature with the given components. Does NOT automatically canonicalise the signature.
     */
    constructor(r: bigint, s: bigint) {
        this.r = r;
        this.s = s;
    }

    /**
     * Returns true if the S component is "low", that means it is below HALF_CURVE_ORDER. See
     * <a href="https://github.com/bitcoin/bips/blob/master/bip-0062.mediawiki#Low_S_values_in_signatures">BIP62</a>.
     */
    public isCanonical(): boolean {
        return this.s <= HALF_CURVE_ORDER;
    }

    /**
     * Will automatically adjust the S component to be less than or equal to half the curve order, if necessary.
     * This is required because for every signature (r,s) the signature (r, -s (mod N)) is a valid signature of
     * the same message. However, we dislike the ability to modify the bits of a Bitcoin transaction after it's
     * been signed, as that violates various assumed invariants. Thus in future only one of those forms will be
     * considered legal and the other will be banned.
     */
    public toCanonicalised(): ECDSASignature {
        if (!this.isCanonical()) {
            // The order of the curve is the number of valid points that exist on that curve. If S is in the upper
            // half of the number of valid points, then bring it back to the lower half. Otherwise, imagine that
            //    N = 10
            //    s = 8, so (-8 % 10 == 2) thus both (r, 8) and (r, 2) are valid solutions.
            //    10 - 8 == 2, giving us always the latter solution, which is canonical.
            return new ECDSASignature(this.r, CURVE_N - this.s);
        } else {
            return this;
        }
    }

    /**
     * DER is an international standard for serializing data structures which is widely used in cryptography.
     * It's somewhat like protocol buffers but less convenient. This method returns a standard DER encoding
     * of the signature, as recognized by OpenSSL and other libraries.
     */
    public encodeToDER(): Buffer {
        // Use the BIP-66 compliant implementation to ensure strict compliance
        return this.encodeDERStrict();
    }

    /**
     * Alias for encodeToDER for compatibility with TransactionSignature
     */
    public encodeDER(): Buffer {
        return this.encodeToDER();
    }

    /**
     * Strict BIP-66 DER encoding implementation (for compatibility with crypto version)
     */
    public encodeDERStrict(): Buffer {
        // Convert r and s to minimal signed DER format (following Bitcoin's DER rules)
        
        // Convert r to DER integer format
        let rBytes = this.toDERInteger(this.r);
        
        // Convert s to DER integer format  
        let sBytes = this.toDERInteger(this.s);

        // Calculate total length of the content after the sequence tag
        const totalLen = rBytes.length + sBytes.length;

        // Create buffer with exact size needed for the complete DER signature
        const der = Buffer.alloc(2 + totalLen); // SEQUENCE tag + length byte + content
        let offset = 0;

        der[offset++] = 0x30; // SEQUENCE tag
        der[offset++] = totalLen; // Length of the content that follows

        // Copy r and s DER-encoded integers
        rBytes.copy(der, offset);
        offset += rBytes.length;
        sBytes.copy(der, offset);

        return der;
    }
    
    /**
     * Convert a BigInteger to its DER integer representation following strict DER rules:
     * - If the value has the high bit set (>= 0x80), prepend 0x00 to indicate positive
     * - Ensure minimal encoding (no unnecessary leading 0x00)
     */
    private toDERInteger(value: bigint): Buffer {
        if (value === 0n) {
            return Buffer.from([0x02, 0x01, 0x00]); // INTEGER, length=1, value=0
        }

        // Convert the value to bytes
        let hex = value.toString(16);
        if (hex.length % 2 !== 0) {
            hex = '0' + hex; // Ensure even number of hex chars
        }
        let bytes = Buffer.from(hex, 'hex');
        
        // Remove leading zero bytes as long as they're not needed to maintain sign
        // A leading zero is only necessary if the first byte has the high bit set (>= 0x80)
        while (bytes.length > 1 && bytes[0] === 0x00 && (bytes[1] & 0x80) === 0) {
            bytes = bytes.slice(1);
        }
        
        // If the first byte has the high bit set (>= 0x80), prepend 0x00 to indicate positive value
        if (bytes[0] & 0x80) {
            bytes = Buffer.concat([Buffer.from([0x00]), bytes]);
        }
        
        // Create the DER integer: tag (0x02) + length + value
        const result = Buffer.alloc(2 + bytes.length);
        result[0] = 0x02; // INTEGER tag
        result[1] = bytes.length; // Length of value
        bytes.copy(result, 2);
        
        return result;
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

    /**
     * Alternative DER decoder using asn1js (for compatibility with existing functionality)
     */
    public static decodeFromDER(bytes: Uint8Array): ECDSASignature {
        // First, try the strict BIP-66 decoder
        try {
            return ECDSASignature.decodeDER(Buffer.from(bytes));
        } catch (e) {
            // If BIP-66 fails, try the asn1js decoder as fallback
            try {
                // Create a new ArrayBuffer from the Uint8Array to ensure compatibility
                const arrayBuffer = new ArrayBuffer(bytes.length);
                const uint8Array = new Uint8Array(arrayBuffer);
                uint8Array.set(bytes);
                
                const asn1 = asn1js.fromBER(arrayBuffer);
                if (asn1.offset === -1) {
                    throw new Error("Invalid ASN.1 structure");
                }

                const sequence = asn1.result as asn1js.Sequence;
                const rValue = (sequence.valueBlock as any).value[0].valueBlock.valueHex;
                const sValue = (sequence.valueBlock as any).value[1].valueBlock.valueHex;

                const r = BigInt('0x' + Buffer.from(rValue).toString('hex'));
                const s = BigInt('0x' + Buffer.from(sValue).toString('hex'));

                return new ECDSASignature(r, s);
            } catch (e2) {
                throw new Error(`Could not decode DER: ${e2}`);
            }
        }
    }

    /**
     * Recover public key from signature and message hash
     */
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

    public equals(o: any): boolean {
        if (this === o) return true;
        if (o == null || !(o instanceof ECDSASignature)) return false;
        return this.r === o.r && this.s === o.s;
    }

    public hashCode(): number {
        // This is a simple implementation for API compatibility with the original Java code.
        // In JavaScript, objects are not typically hashed for map keys based on content.
        // Using a simple hashing approach.
        const rStr = this.r.toString();
        const sStr = this.s.toString();
        let hash = 17;
        hash = hash * 31 + rStr.length;
        hash = hash * 31 + sStr.length;
        return hash;
    }
}
