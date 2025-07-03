export class BigInteger {
    public static ZERO = new BigInteger(0n);
    public static ONE = new BigInteger(1n);

    constructor(private value: bigint) {}

    public static fromNumber(value: number): BigInteger {
        return new BigInteger(BigInt(value));
    }

    public static valueOf(value: number): BigInteger {
        return new BigInteger(BigInt(value));
    }

    public static fromString(value: string): BigInteger {
        return new BigInteger(BigInt(value));
    }

    public abs(): BigInteger {
        return this.value < 0n ? new BigInteger(-this.value) : this;
    }

    public divide(divisor: BigInteger): BigInteger {
        return new BigInteger(this.value / divisor.value);
    }

    public mod(divisor: BigInteger): BigInteger {
        return new BigInteger(this.value % divisor.value);
    }

    public compareTo(other: BigInteger): number {
        if (this.value < other.value) return -1;
        if (this.value > other.value) return 1;
        return 0;
    }

    public compare(other: BigInteger): number {
        return this.compareTo(other);
    }

    public negate(): BigInteger {
        return new BigInteger(-this.value);
    }

    public toString(): string {
        return this.value.toString();
    }

    public toBigInt(): bigint {
        return this.value;
    }

    public getValue(): bigint {
        return this.value;
    }

    public static fromBigInt(value: bigint): BigInteger {
        return new BigInteger(value);
    }
}
