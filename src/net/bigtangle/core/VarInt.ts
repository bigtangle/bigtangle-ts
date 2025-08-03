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
    constructor(value: BigInteger | number | Buffer, offset?: number) {
        if (Buffer.isBuffer(value)) {
            // Constructor with buffer and offset
            const buf = value;
            if (offset === undefined) {
                throw new Error("Offset must be provided when constructing from buffer");
            }
            
            const first = 0xFF & buf[offset];
            if (first < 253) {
                this.value = bigInt(first);
                this.originallyEncodedSize = 1; // 1 data byte (8 bits)
            } else if (first === 253) {
                this.value = bigInt(0xFF & buf[offset + 1]).or(bigInt(0xFF & buf[offset + 2]).shiftLeft(8));
                this.originallyEncodedSize = 3; // 1 marker + 2 data bytes (16 bits)
            } else if (first === 254) {
                this.value = bigInt(Utils.readUint32(buf, offset + 1));
                this.originallyEncodedSize = 5; // 1 marker + 4 data bytes (32 bits)
            } else {
                this.value = Utils.readUint64(buf, offset + 1);
                this.originallyEncodedSize = 9; // 1 marker + 8 data bytes (64 bits)
            }
        } else {
            // Constructor with value
            this.value = typeof value === 'number' ? bigInt(value) : value;
            this.originallyEncodedSize = this.getSizeInBytes();
        }
    }

    /**
     * Constructs a new VarInt with the value parsed from the specified offset of the given buffer.
     *
     * @param buf the buffer containing the value
     * @param offset the offset of the value
     */
    public static fromBuffer(buf: Buffer, offset: number): VarInt {
        return new VarInt(buf, offset);
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
                return Buffer.from([253, this.value.and(0xFF).toJSNumber(), this.value.shiftRight(8).and(0xFF).toJSNumber()]);
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
