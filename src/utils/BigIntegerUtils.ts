import bigInt from 'big-integer';

export class BigIntegerUtils {
    static isNegative(bi: bigInt.BigInteger): boolean {
        return bi.compare(bigInt.zero) < 0;
    }

    static abs(bi: bigInt.BigInteger): bigInt.BigInteger {
        return bi.abs();
    }

    static fromString(value: string): bigInt.BigInteger {
        return bigInt(value);
    }

    static toBuffer(bi: bigInt.BigInteger): Buffer {
        return Buffer.from(bi.toString());
    }
}
