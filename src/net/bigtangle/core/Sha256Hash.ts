import { createHash } from 'crypto';
import { Buffer } from 'buffer';
import { Utils } from '../utils/Utils';

/**
 * A Sha256Hash just wraps a byte[] so that equals and hashcode work correctly, allowing it to be used as keys in a
 * map. It also checks that the length is correct and provides a bit more type safety.
 */
export class Sha256Hash {
    private static readonly serialVersionUID = 7806870908693322289n;

    public static readonly LENGTH = 32; // bytes

    public static readonly ZERO_HASH = new Sha256Hash(Buffer.alloc(32));

    private bytes: Buffer;

    /**
     * Use {@link #wrap(byte[])} instead.
     */
    constructor(rawHashBytes: Buffer) {
        if (rawHashBytes.length !== Sha256Hash.LENGTH) {
            throw new Error(`Sha256Hash must be exactly ${Sha256Hash.LENGTH} bytes`);
        }
        this.bytes = rawHashBytes;
    }

    public static wrap(rawHashBytes: Buffer ): Sha256Hash {
       // if (rawHashBytes === null || rawHashBytes.length === 0) return null;
        return new Sha256Hash(rawHashBytes);
    }

    /**
     * Creates a new instance that wraps the given hash value (represented as a hex string).
     *
     * @param hexString a hash value represented as a hex string
     * @return a new instance
     * @throws IllegalArgumentException if the given string is not a valid
     *         hex string, or if it does not represent exactly 32 bytes
     */
    public static wrapString(hexString: string): Sha256Hash   {
        const buffer = Buffer.from(hexString, 'hex');
     //   if (buffer.length !== Sha256Hash.LENGTH) return null;
        return new Sha256Hash(buffer);
    }

    /**
     * Creates a new instance that wraps the given hash value, but with byte order reversed.
     *
     * @param rawHashBytes the raw hash bytes to wrap
     * @return a new instance
     * @throws IllegalArgumentException if the given array length is not exactly 32
     */
    public static wrapReversed(rawHashBytes: Buffer): Sha256Hash  {
      //  if (rawHashBytes.length !== Sha256Hash.LENGTH) return null;
        const reversed = Buffer.from(Utils.reverseBytes(rawHashBytes));
        return new Sha256Hash(reversed);
    }

    /**
     * Returns a new instance containing the calculated (one-time) hash of the given bytes.
     *
     * @param contents the bytes on which the hash value is calculated
     * @return a new instance containing the calculated (one-time) hash
     */
    public static of(contents: Buffer): Sha256Hash {
        return new Sha256Hash(Sha256Hash.hash(contents));
    }

    /**
     * Creates a new instance containing the hash of the calculated hash of the given bytes.
     *
     * @param contents the bytes on which the hash value is calculated
     * @return a new instance containing the calculated (two-time) hash
     */
    public static twiceOf(contents: Buffer): Sha256Hash {
        return new Sha256Hash(Sha256Hash.hashTwice(contents));
    }

    /**
     * Returns the internal byte array as a Buffer.
     */
    public getBuffer(): Buffer {
        return Buffer.from(this.bytes);
    }

    /**
     * Returns a new SHA-256 MessageDigest instance.
     * <p>
     * This is a convenience method which wraps the checked
     * exception that can never occur with a RuntimeException.
     *
     * @return a new SHA-256 MessageDigest instance
     */
    private static newDigest(): any {
        return createHash('sha256');
    }

    /**
     * Calculates the SHA-256 hash of the given bytes.
     *
     * @param input the bytes to hash
     * @return the hash (in big-endian order)
     */
    public static hash(input: Buffer): Buffer {
        return Sha256Hash.hashRange(input, 0, input.length);
    }

    /**
     * Calculates the SHA-256 hash of the given byte range.
     *
     * @param input the array containing the bytes to hash
     * @param offset the offset within the array of the bytes to hash
     * @param length the number of bytes to hash
     * @return the hash (in big-endian order)
     */
    public static hashRange(input: Buffer, offset: number, length: number): Buffer {
        const digest = Sha256Hash.newDigest();
        const subarray = input.subarray(offset, offset + length);
        // Convert Uint8Array to Buffer if necessary
        const bufferInput = Buffer.isBuffer(subarray) ? subarray : Buffer.from(subarray);
        digest.update(bufferInput);
        return Buffer.from(digest.digest());
    }

    /**
     * Calculates the SHA-256 hash of the given bytes,
     * and then hashes the resulting hash again.
     *
     * @param input the bytes to hash
     * @return the double-hash (in big-endian order)
     */
    public static hashTwice(input: Buffer): Buffer {
        return Sha256Hash.hashTwiceRange(input, 0, input.length);
    }

    /**
     * Calculates the SHA-256 hash of the given byte range,
     * and then hashes the resulting hash again.
     *
     * @param input the array containing the bytes to hash
     * @param offset the offset within the array of the bytes to hash
     * @param length the number of bytes to hash
     * @return the double-hash (in big-endian order)
     */
    public static hashTwiceRange(input: Buffer, offset: number, length: number): Buffer {
        const digest = Sha256Hash.newDigest();
        const subarray = input.subarray(offset, offset + length);
        // Convert Uint8Array to Buffer if necessary
        const bufferInput = Buffer.isBuffer(subarray) ? subarray : Buffer.from(subarray);
        digest.update(bufferInput);
        const hash1 = digest.digest();
        const digest2 = Sha256Hash.newDigest();
        digest2.update(hash1);
        return Buffer.from(digest2.digest());
    }

    /**
     * Calculates the hash of hash on the given byte ranges. This is equivalent to
     * concatenating the two ranges and then passing the result to {@link #hashTwice(byte[])}.
     */
    public static hashTwiceRanges(input1: Buffer, offset1: number, length1: number,
                                input2: Buffer, offset2: number, length2: number): Buffer {
        const digest = Sha256Hash.newDigest();
        const subarray1 = input1.subarray(offset1, offset1 + length1);
        const subarray2 = input2.subarray(offset2, offset2 + length2);
        // Convert Uint8Array to Buffer if necessary
        const bufferInput1 = Buffer.isBuffer(subarray1) ? subarray1 : Buffer.from(subarray1);
        const bufferInput2 = Buffer.isBuffer(subarray2) ? subarray2 : Buffer.from(subarray2);
        digest.update(bufferInput1);
        digest.update(bufferInput2);
        const hash1 = digest.digest();
        const digest2 = Sha256Hash.newDigest();
        digest2.update(hash1);
        return Buffer.from(digest2.digest());
    }

    public equals(other: Sha256Hash  ): boolean {
        if (this === other) return true;
        if (other === null || !(other instanceof Sha256Hash)) return false;
        return this.bytes.equals(other.bytes);
    }

    /**
     * Returns the last four bytes of the wrapped hash. This should be unique enough to be a suitable hash code even for
     * blocks, where the goal is to try and get the first bytes to be zeros (i.e. the value as a big integer lower
     * than the target value).
     */
    public hashCode(): number {
        // Use the last 4 bytes, not the first 4 which are often zeros in Bitcoin.
        return this.bytes.readUInt32BE(this.bytes.length - 4);
    }

    public toString(): string {
        return Utils.HEX.encode(this.bytes);
    }

    /**
     * Returns the bytes interpreted as a positive integer.
     */
    public toBigInteger(): bigint {
        return BigInt('0x' + this.toString());
    }

    /**
     * Returns the internal byte array, without defensively copying. Therefore do NOT modify the returned array.
     */
    public getBytes(): Buffer {
        return this.bytes;
    }

    /**
     * Returns a reversed copy of the internal byte array.
     */
    public getReversedBytes(): Buffer {
        return Buffer.from(Utils.reverseBytes(this.bytes));
    }

    public compareTo(other: Sha256Hash): number {
        for (let i = Sha256Hash.LENGTH - 1; i >= 0; i--) {
            const thisByte = this.bytes[i] & 0xff;
            const otherByte = other.bytes[i] & 0xff;
            if (thisByte > otherByte)
                return 1;
            if (thisByte < otherByte)
                return -1;
        }
        return 0;
    }
}
