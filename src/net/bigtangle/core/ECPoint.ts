export class ECPoint {
    private pubKey: Uint8Array; // Store as public key bytes
    private compressed: boolean = true;

    constructor(pubKey: Uint8Array) {
        this.pubKey = pubKey;
    }

    public static decodePoint(encoded: Uint8Array): ECPoint {
        return new ECPoint(encoded);
    }

    public encode(compressed?: boolean): Uint8Array {
        const shouldCompress = compressed ?? this.compressed;
        // secp256k1 library can handle compression
        try {
            // If already in correct format, return as is
            if (this.pubKey.length === 33 && shouldCompress) {
                return this.pubKey;
            } else if (this.pubKey.length === 65 && !shouldCompress) {
                return this.pubKey;
            } else {
                // Need to convert format
                // If input is compressed (33 bytes) but we want uncompressed (65 bytes)
                if (this.pubKey.length === 33 && !shouldCompress) {
                    const uncompressed = require('secp256k1').publicKeyConvert(this.pubKey, false);
                    return uncompressed;
                }
                // If input is uncompressed (65 bytes) but we want compressed (33 bytes)
                else if (this.pubKey.length === 65 && shouldCompress) {
                    const compressed = require('secp256k1').publicKeyConvert(this.pubKey, true);
                    return compressed;
                }
            }
        } catch (e) {
            // If conversion fails, return original
            return this.pubKey;
        }
        return this.pubKey;
    }

    public decompress(): ECPoint {
        // Create a new point with uncompressed format
        const uncompressed = this.encode(false);
        const newPoint = new ECPoint(uncompressed);
        newPoint.setCompressed(false);
        return newPoint;
    }

    public getX(): bigint {
        // Extract X coordinate from public key
        let startIdx = 1;
        if (this.pubKey.length === 65) {
            // Uncompressed format starts at index 1
            startIdx = 1;
        } else if (this.pubKey.length === 33) {
            // Compressed format starts at index 1
            startIdx = 1;
        }
        
        const xBytes = this.pubKey.slice(startIdx, startIdx + 32);
        const hex = Buffer.from(xBytes).toString('hex');
        return BigInt('0x' + hex);
    }

    public getY(): bigint {
        // Extract Y coordinate from public key
        if (this.pubKey.length === 65) {
            // Uncompressed format has Y starting at index 33
            const yBytes = this.pubKey.slice(33, 65);
            const hex = Buffer.from(yBytes).toString('hex');
            return BigInt('0x' + hex);
        } else if (this.pubKey.length === 33) {
            // For compressed, we need to compute Y from X and the prefix
            // This is complex and requires implementing the curve equation
            // For now, we'll return a placeholder - a full implementation would be needed
            throw new Error("Y coordinate computation from compressed point not implemented");
        }
        throw new Error("Invalid public key length");
    }

    public add(other: ECPoint): ECPoint {
        // EC point addition requires more complex implementation with secp256k1
        // This is non-trivial with the secp256k1 library and would need significant work
        throw new Error("EC point addition not implemented with secp256k1 library");
    }

    public multiply(k: bigint): ECPoint {
        // EC point multiplication requires more complex implementation 
        // This is non-trivial with the secp256k1 library and would need significant work
        throw new Error("EC point multiplication not implemented with secp256k1 library");
    }

    public negate(): ECPoint {
        // Negation is complex with the secp256k1 library
        throw new Error("EC point negation not implemented with secp256k1 library");
    }

    public isInfinity(): boolean {
        // The infinity point is a special case
        // In some implementations, it might be a specific byte sequence
        // For now, assume true if it's a specific known infinity representation
        // This is highly dependent on internal representation
        return this.pubKey.length === 0 || (this.pubKey.length === 1 && this.pubKey[0] === 0x00);
    }

    public equals(other: any): boolean {
        if (!(other instanceof ECPoint)) return false;
        if (this.pubKey.length !== other.pubKey.length) return false;
        for (let i = 0; i < this.pubKey.length; i++) {
            if (this.pubKey[i] !== other.pubKey[i]) return false;
        }
        return true;
    }

    public hashCode(): number {
        // Simple hash code based on the encoded point
        const encoded = this.encode(true);
        let hash = 0;
        for (let i = 0; i < encoded.length; i++) {
            hash = (hash << 5) - hash + encoded[i];
            hash |= 0; // Ensure 32-bit integer
        }
        return hash;
    }

    public getDetachedPoint(): ECPoint {
        return new ECPoint(this.pubKey.slice()); // Create a copy
    }

    public isNormalized(): boolean {
        // With the secp256k1 library approach, normalization is implicit
        return true;
    }

    public setCompressed(compressed: boolean): void {
        this.compressed = compressed;
    }

    public getCompressed(): boolean {
        return this.compressed;
    }

    public isCompressed(): boolean {
        return this.compressed;
    }

    public isValid(): boolean {
        try {
            // Use secp256k1 library to validate the public key
            return require('secp256k1').publicKeyVerify(this.pubKey);
        } catch (e) {
            return false;
        }
    }

    public twice(): ECPoint {
        // Point multiplication by 2
        throw new Error("EC point multiplication not implemented with secp256k1 library");
    }

    public twicePlus(b: ECPoint): ECPoint {
        // Point multiplication and addition
        throw new Error("EC point operations not implemented with secp256k1 library");
    }

    public threeTimes(): ECPoint {
        // Point multiplication by 3
        throw new Error("EC point multiplication not implemented with secp256k1 library");
    }

    public getCurve(): any {
        // Return a mock curve object if needed by other classes
        return { curve: "secp256k1" };
    }

    public normalize(): ECPoint {
        return this; // With our approach, points are normalized
    }
}
