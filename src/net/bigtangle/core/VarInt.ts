import { Utils } from "../utils/Utils";
import bigInt, { BigInteger } from 'big-integer';

/**
 * A variable-length encoded unsigned integer using Satoshi's encoding (a.k.a. "CompactSize").
 */
export class VarInt {
    public readonly value: BigInteger;
    private readonly originallyEncodedSize: number;

    /**
     * Constructs a new VarInt with the given unsigned long value.
     *
     * @param value the unsigned long value (beware widening conversion of negatives!)
     */
    constructor(value: BigInteger | number) {
        this.value = typeof value === 'number' ? bigInt(value) : value;
        this.originallyEncodedSize = this.getSizeInBytes();
    }

    /**
     * Constructs a new VarInt with the value parsed from the specified offset of the given buffer.
     *
     * @param buf the buffer containing the value
     * @param offset the offset of the value
     */
    public static fromBuffer(buf: Buffer, offset: number): VarInt {
        const first = buf[offset] & 0xFF;
        let value: BigInteger;
        let originallyEncodedSize: number;

        if (first < 253) {
            value = bigInt(first);
            originallyEncodedSize = 1; // 1 data byte (8 bits)
        } else if (first === 253) {
            value = bigInt(buf[offset + 1] & 0xFF).or(bigInt(buf[offset + 2] & 0xFF).shiftLeft(8));
            originallyEncodedSize = 3; // 1 marker + 2 data bytes (16 bits)
        } else if (first === 254) {
            value = bigInt(Utils.readUint32(buf, offset + 1));
            originallyEncodedSize = 5; // 1 marker + 4 data bytes (32 bits)
        } else {
            value = bigInt(Utils.readInt64(buf, offset + 1));
            originallyEncodedSize = 9; // 1 marker + 8 data bytes (64 bits)
        }

        const varInt = new VarInt(value);
        (varInt as any).originallyEncodedSize = originallyEncodedSize;
        return varInt;
    }

    /**
     * Returns the original number of bytes used to encode the value if it was
     * deserialized from a byte array, or the minimum encoded size if it was not.
     */
    public getOriginalSizeInBytes(): number {
        return this.originallyEncodedSize;
    }

    /**
     * Returns the minimum encoded size of the value.
     */
    public getSizeInBytes(): number {
        return VarInt.sizeOf(this.value);
    }

    /**
     * Returns the minimum encoded size of the given unsigned long value.
     *
     * @param value the unsigned long value (beware widening conversion of negatives!)
     */
    public static sizeOf(value: BigInteger | number): number {
        const val = typeof value === 'number' ? bigInt(value) : value;
        // if negative, it's actually a very large unsigned long value
        if (val.isNegative()) return 9; // 1 marker + 8 data bytes
        if (val.lesser(253)) return 1; // 1 data byte
        if (val.lesserOrEquals(0xFFFF)) return 3; // 1 marker + 2 data bytes
        if (val.lesserOrEquals(0xFFFFFFFF)) return 5; // 1 marker + 4 data bytes
        return 9; // 1 marker + 8 data bytes
    }

    /**
     * Encodes the value into its minimal representation.
     *
     * @return the minimal encoded bytes of the value
     */
    public encode(): Buffer {
        const size = VarInt.sizeOf(this.value);
        let buf: Buffer;

        switch (size) {
            case 1:
                return Buffer.from([this.value.toJSNumber()]);
            case 3:
                buf = Buffer.alloc(3);
                buf[0] = 253;
                buf[1] = this.value.and(0xFF).toJSNumber();
                buf[2] = this.value.shiftRight(8).and(0xFF).toJSNumber();
                return buf;
            case 5:
                buf = Buffer.alloc(5);
                buf[0] = 254;
                Utils.uint32ToByteArrayLE(this.value.toJSNumber(), buf, 1);
                return buf;
            default:
                buf = Buffer.alloc(9);
                buf[0] = 255;
                Utils.uint64ToByteArrayLE(this.value, buf, 1);
                return buf;
        }
    }
}
