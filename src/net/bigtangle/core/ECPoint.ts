import { secp256k1 } from '@noble/curves/secp256k1';
import bigInt from 'big-integer';
import { Utils } from '../utils/Utils';

export class ECPoint {
    private point: ReturnType<typeof secp256k1.Point.fromHex>;

    constructor(point: ReturnType<typeof secp256k1.Point.fromHex>) {
        this.point = point;
    }
    public static decodePoint(encoded: Uint8Array): ECPoint {
        return new ECPoint(secp256k1.Point.fromHex(encoded));
    }

    public encode(compressed?: boolean): Uint8Array {
        const useCompressed = compressed ?? this.compressed;
        return this.point.toRawBytes(useCompressed);
    }

    public decompress(): ECPoint {
        // Create a new point with the same coordinates but uncompressed
        const decompressedPoint = new ECPoint(new secp256k1.Point(this.point.x, this.point.y, 1n));
        decompressedPoint.setCompressed(false);
        return decompressedPoint;
    }

    public getX(): bigInt.BigInteger {
        return bigInt(this.point.x.toString());
    }

    public getY(): bigInt.BigInteger {
        return bigInt(this.point.y.toString());
    }

    public add(other: ECPoint): ECPoint {
        return new ECPoint(this.point.add(other.point));
    }

    public multiply(k: bigInt.BigInteger): ECPoint {
        return new ECPoint(this.point.multiply(BigInt(k.toString())));
    }

    public negate(): ECPoint {
        return new ECPoint(this.point.negate());
    }

    public isInfinity(): boolean {
        // Check if the point is the point at infinity (the identity element)
        return this.point.equals(secp256k1.Point.ZERO);
    }

    public equals(other: any): boolean {
        if (!(other instanceof ECPoint)) return false;
        return this.point.equals(other.point);
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

    // Placeholder for methods that might be needed by other classes
    // Placeholder for methods that might be needed by other classes
    public getDetachedPoint(): ECPoint {
        return new ECPoint(new secp256k1.Point(this.point.x, this.point.y, 1n));
    }
    public isNormalized(): boolean {
        // Noble curves points are always normalized
        return true;
    }

    private compressed: boolean = true;

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
            secp256k1.Point.fromHex(this.encode(true));
            return true;
        } catch (e) {
            return false;
        }
    }

    public twice(): ECPoint {
        return new ECPoint(this.point.double());
    }

    public twicePlus(b: ECPoint): ECPoint {
        return new ECPoint(this.point.double().add(b.point));
    }

    public threeTimes(): ECPoint {
        return new ECPoint(this.point.double().add(this.point));
    }

    public getCurve(): any {
        // Return a mock or actual curve object if needed by other classes
        return secp256k1;
    }

    public normalize(): ECPoint {
        return this; // Noble curves points are always normalized
    }
}
