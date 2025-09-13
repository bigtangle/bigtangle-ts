import { Buffer } from 'buffer';

import { MonetaryFormat } from '../utils/MonetaryFormat';
import { JsonCreator } from 'jackson-js';
import { NetworkParameters } from '../params/NetworkParameters';
import { Utils } from './Utils';

export class Coin implements IMonetary, IComparable<Coin> {
 
    private static readonly serialVersionUID: bigint = 551802452657362699n;
    static readonly FIAT: MonetaryFormat = new MonetaryFormat().withShift(0).withMinDecimals(0);

    // Static constants
    public static readonly ZERO: Coin = Coin.valueOfString(0n,  "bc"  );
    public static readonly COIN: Coin = Coin.valueOfString(1000000n, "bc"  );
    public static readonly SATOSHI: Coin = Coin.valueOfString(1n, "bc"  );
    public static readonly NEGATIVE_SATOSHI: Coin = Coin.valueOfString(-1n, "bc"  );
    public static readonly FEE_DEFAULT: Coin = Coin.valueOfString(1000n, "bc"  );

    public value: bigint;
    public tokenid: Buffer;

    constructor(satoshis?: bigint, tokenid?: Buffer | string) {
        this.value = satoshis || 0n;
        
        // Convert tokenid to Buffer if it's a string
        if (typeof tokenid === 'string') {
            // Handle base64 encoded strings
            if (/^[A-Za-z0-9+/=]+$/.test(tokenid)) {
                this.tokenid = Buffer.from(tokenid, 'base64');
            } 
            // Handle hex strings
            else if (/^[0-9a-fA-F]+$/.test(tokenid)) {
                this.tokenid = Buffer.from(tokenid, 'hex');
            }
            // Fallback to UTF-8
            else {
                this.tokenid = Buffer.from(tokenid);
            }
        } else {
            this.tokenid = tokenid || Buffer.from(Utils.HEX.decode(NetworkParameters.BIGTANGLE_TOKENID_STRING));
        }
    }

@JsonCreator()
public static fromJSON(json: any): Coin {
    const coin = new Coin();
    coin.value = BigInt(json.value);
    if (json.tokenHex) {
        coin.tokenid = Buffer.from(Utils.HEX.decode(json.tokenHex ));
    }
    return coin;
}

    public static valueOf(satoshis: bigint, tokenid?: Buffer ): Coin {
        return new Coin(satoshis, tokenid || NetworkParameters.getBIGTANGLE_TOKENID() );
    }


    public static valueOfString(satoshis: bigint, tokenid?: string): Coin {
        const tokenIdBuffer = tokenid ? Buffer.from(tokenid, 'hex') : undefined;
        return new Coin(satoshis, tokenIdBuffer || NetworkParameters.getBIGTANGLE_TOKENID() );
    }

    public static fromBigInteger(value: bigint, tokenid: Uint8Array): Coin {
        return new Coin(value , Buffer.from(tokenid));
    }

    public getValue(): bigint {
        return this.value;
    }

     
    public setValue(value: bigint): void {
        this.value = value;
    }

    public getTokenHex(): string {
        return this.tokenid.toString('hex');
    }

    public add(value: Coin): Coin {
        if (Buffer.compare(this.tokenid, value.tokenid) !== 0) {
            throw new Error('Token IDs must match for addition');
        }
        // Ensure both values are BigInt before addition
        const thisVal = BigInt(this.value);
        const valueVal = BigInt(value.value);
        const result = thisVal + valueVal;
        
        return new Coin(result, this.tokenid);
    }

    public plus(value: Coin): Coin {
        return this.add(value);
    }

    public subtract(value: Coin): Coin {
        if (!this.tokenid.equals(value.tokenid)) {
            throw new Error('Token IDs must match for subtraction');
        }
        const result = this.value - value.value;
        if (result > BigInt(Number.MAX_SAFE_INTEGER) || result < BigInt(Number.MIN_SAFE_INTEGER)) {
            throw new Error("Result out of range");
        }
        return new Coin(result, this.tokenid);
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
        return this.tokenid.equals(NetworkParameters.getBIGTANGLE_TOKENID() );
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
        return this.tokenid;
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
