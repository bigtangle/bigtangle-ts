// ECDSASignature.ts
// TypeScript translation of ECDSASignature from ECKey.java

import { Buffer } from 'buffer';
import { secp256k1 } from '@noble/curves/secp256k1';
import * as asn1js from 'asn1js';

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
        // Convert r and s to 32-byte buffers
        const rBytes = this.bigIntToBytes(this.r, 32);
        const sBytes = this.bigIntToBytes(this.s, 32);

        // Ensure proper DER encoding by handling leading zeros
        const rBa = this.ensureProperDERInteger(rBytes);
        const sBa = this.ensureProperDERInteger(sBytes);

        const rInteger = new asn1js.Integer({ valueHex: rBa });
        const sInteger = new asn1js.Integer({ valueHex: sBa });

        const sequence = new asn1js.Sequence({
            value: [rInteger, sInteger],
        });

        const der = sequence.toBER(false);
        return Buffer.from(der);
    }

    /**
     * Helper method to convert bigint to bytes with proper padding
     */
    private bigIntToBytes(value: bigint, length: number): Buffer {
        let hex = value.toString(16).padStart(length * 2, '0');
        // Ensure we don't exceed the desired length
        if (hex.length > length * 2) {
            hex = hex.substring(hex.length - length * 2);
        }
        return Buffer.from(hex, 'hex');
    }

    /**
     * Ensure proper DER encoding by handling leading zeros and high bit
     */
    private ensureProperDERInteger(bytes: Buffer): Buffer {
        // If the first byte has the high bit set (>= 0x80), we need to prepend 0x00
        if (bytes[0] >= 0x80) {
            const result = Buffer.alloc(bytes.length + 1);
            result[0] = 0x00;
            bytes.copy(result, 1);
            return result;
        }
        
        // Remove any unnecessary leading zeros, but keep at least one byte
        let start = 0;
        while (start < bytes.length - 1 && bytes[start] === 0x00) {
            start++;
        }
        
        return bytes.slice(start);
    }

    /**
     * Alias for encodeToDER for compatibility with TransactionSignature
     */
    public encodeDER(): Buffer {
        return this.encodeToDER();
    }

    public static decodeFromDER(bytes: Uint8Array): ECDSASignature {
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
        } catch (e) {
            throw new Error(`Could not decode DER: ${e}`);
        }
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
