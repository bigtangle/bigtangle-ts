import { Monetary } from './Monetary';
import { Buffer } from 'buffer';
import * as Utils from './Utils';
import { Constants } from './Constants';
import { MonetaryFormat } from '../utils/MonetaryFormat';
import { BigInteger } from '../../../core/BigInteger';

export class Coin implements IMonetary, IComparable<Coin> {
    private static readonly serialVersionUID: bigint = 551802452657362699n;
    static FIAT: MonetaryFormat = new MonetaryFormat().withShift(0).withMinDecimals(0);

    // Static constants
    public static readonly ZERO: Coin = Coin.valueOf(0n, Constants.BIGTANGLE_TOKENID);
    public static readonly COIN: Coin = Coin.valueOf(1000000n, Constants.BIGTANGLE_TOKENID);
    public static readonly SATOSHI: Coin = Coin.valueOf(1n, Constants.BIGTANGLE_TOKENID);
    public static readonly NEGATIVE_SATOSHI: Coin = Coin.valueOf(-1n, Constants.BIGTANGLE_TOKENID);
    public static readonly FEE_DEFAULT: Coin = Coin.valueOf(1000n, Constants.BIGTANGLE_TOKENID);

    private value: bigint;
    private tokenid: Buffer;

    constructor(satoshis: bigint, tokenid: Buffer | Uint8Array | string) {
        this.value = satoshis;
        
        if (typeof tokenid === 'string') {
            this.tokenid = Buffer.from(tokenid, 'hex');
        } else if (tokenid instanceof Uint8Array) {
            this.tokenid = Buffer.from(tokenid);
        } else {
            this.tokenid = tokenid;
        }
    }

    public static valueOf(satoshis: bigint, tokenid?: Buffer | string): Coin {
        return new Coin(satoshis, tokenid || Constants.BIGTANGLE_TOKENID);
    }

    public static fromBigInteger(value: BigInteger, tokenid: Uint8Array): Coin {
        return new Coin(value.getValue(), Buffer.from(tokenid));
    }

    public getValue(): bigint {
        return this.value;
    }

    public toBigInteger(): BigInteger {
        return BigInteger.fromBigInt(this.value);
    }

    public setValue(value: bigint): void {
        this.value = value;
    }

    public getTokenHex(): string {
        return this.tokenid.toString('hex');
    }

    public add(value: Coin): Coin {
        if (!this.tokenid.equals(value.tokenid)) {
            throw new Error('Token IDs must match for addition');
        }
        return new Coin(this.value + value.value, this.tokenid);
    }

    public plus(value: Coin): Coin {
        return this.add(value);
    }

    public subtract(value: Coin): Coin {
        if (!this.tokenid.equals(value.tokenid)) {
            throw new Error('Token IDs must match for subtraction');
        }
        return new Coin(this.value - value.value, this.tokenid);
    }

    public minus(value: Coin): Coin {
        return this.subtract(value);
    }

    public multiply(factor: bigint | number): Coin {
        if (typeof factor === 'number') factor = BigInt(factor);
        return new Coin(this.value * factor, this.tokenid);
    }

    public times(factor: bigint | number): Coin {
        return this.multiply(factor);
    }

    public divideBy(divisor: Coin): bigint {
        if (!this.tokenid.equals(divisor.tokenid)) {
            throw new Error('Token IDs must match for division');
        }
        return this.value / divisor.value;
    }

    public divide(divisor: bigint | number): Coin {
        if (typeof divisor === 'number') divisor = BigInt(divisor);
        return new Coin(this.value / divisor, this.tokenid);
    }

    public isPositive(): boolean {
        return this.signum() === 1;
    }

    public isNegative(): boolean {
        return this.signum() === -1;
    }

    public isZero(): boolean {
        return this.signum() === 0;
    }

    public isBIG(): boolean {
        return this.tokenid.equals(Constants.BIGTANGLE_TOKENID);
    }

    public isGreaterThan(other: Coin): boolean {
        return this.compareTo(other) > 0;
    }

    public isLessThan(other: Coin): boolean {
        return this.compareTo(other) < 0;
    }

    public signum(): number {
        return this.value > 0n ? 1 : this.value < 0n ? -1 : 0;
    }

    public negate(): Coin {
        return new Coin(-this.value, this.tokenid);
    }

    public toString(): string {
        return `[${this.value.toString()}:${this.getTokenHex()}]`;
    }

    public hashCode(): number {
        const prime = 31;
        let result = 1;
        const tokenHex = this.tokenid.toString('hex');
        const valueStr = this.value.toString();
        result = prime * result + this.stringHashCode(tokenHex);
        result = prime * result + this.stringHashCode(valueStr);
        return result;
    }

    private stringHashCode(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

    public equals(obj: any): boolean {
        if (this === obj) return true;
        if (obj === null) return false;
        if (this.constructor !== obj.constructor) return false;
        
        const other = obj as Coin;
        return this.tokenid.equals(other.tokenid) && this.value === other.value;
    }

    public compareTo(other: Coin): number {
        if (this.value > other.value) return 1;
        if (this.value < other.value) return -1;
        return 0;
    }

    public getTokenid(): Buffer {
        return Buffer.from(this.tokenid);
    }

    public toJSON() {
        return {
            value: this.value.toString(),
            tokenid: this.tokenid.toString('hex')
        };
    }
}

interface IComparable<T> {
    compareTo(other: T): number;
}

interface IMonetary {
    getValue(): bigint;
}
