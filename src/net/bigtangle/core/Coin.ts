import { Buffer } from "buffer";

import { MonetaryFormat } from "../utils/MonetaryFormat";
import { JsonProperty } from "jackson-js";
import { NetworkParameters } from "../params/NetworkParameters";
import { Utils } from "./Utils";

export class Coin implements IMonetary, IComparable<Coin> {
  private static readonly serialVersionUID: bigint = 551802452657362699n;
  static readonly FIAT: MonetaryFormat = new MonetaryFormat()
    .withShift(0)
    .withMinDecimals(0);

  @JsonProperty() public value: bigint;
  @JsonProperty() public tokenid: Buffer;

  constructor(satoshis?: bigint, tokenid?: Buffer | string) {
    this.value = satoshis || 0n;

    // Convert tokenid to Buffer if it's a string
    if (typeof tokenid === "string") {
      // Handle base64 encoded strings
      if (/^[A-Za-z0-9+/=]+$/.test(tokenid)) {
        this.tokenid = Buffer.from(tokenid, "base64");
      }
      // Handle hex strings
      else if (/^[0-9a-fA-F]+$/.test(tokenid)) {
        this.tokenid = Buffer.from(tokenid, "hex");
      }
      // Fallback to UTF-8
      else {
        this.tokenid = Buffer.from(tokenid);
      }
    } else {
      this.tokenid =
        tokenid ||
        Buffer.from(
          Utils.HEX.decode(NetworkParameters.BIGTANGLE_TOKENID_STRING)
        );
    }
  }


  public static fromJSON(json: any): Coin {
    const coin = new Coin();
    // Handle both string and number representations for large values
    if (typeof json.value === 'string') {
      coin.value = BigInt(json.value);
    } else {
      // For number values, convert to string first to avoid precision loss
      coin.value = BigInt(json.value.toString());
    }
    if (json.tokenHex) {
      coin.tokenid = Buffer.from(Utils.HEX.decode(json.tokenHex));
    }
    return coin;
  }

  public static valueOf(satoshis: bigint, tokenid?: Buffer): Coin {
    return new Coin(
      satoshis,
      tokenid || NetworkParameters.getBIGTANGLE_TOKENID()
    );
  }

  public static valueOfString(satoshis: bigint, tokenid?: string): Coin {
    const tokenIdBuffer = tokenid ? Buffer.from(tokenid, "hex") : undefined;
    return new Coin(
      satoshis,
      tokenIdBuffer || NetworkParameters.getBIGTANGLE_TOKENID()
    );
  }

  public static fromBigInteger(value: bigint, tokenid: Uint8Array): Coin {
    return new Coin(value, Buffer.from(tokenid));
  }

  public getValue(): bigint {
    return this.value;
  }

  public setValue(value: bigint): void {
    this.value = value;
  }

  public getTokenHex(): string {
    return   Utils.HEX.encode(this.tokenid );
  }

  public add(value: Coin): Coin {
    if (Buffer.compare(this.tokenid, value.tokenid) !== 0) {
      throw new Error("Token IDs must match for addition");
    }
    // Ensure both values are BigInt before addition
    const thisVal = BigInt(this.value);
    const valueVal = BigInt(value.value);
    const result = thisVal + valueVal;

    // Check for overflow - if both operands are positive and result is negative, we overflowed
    if (thisVal > 0n && valueVal > 0n && result < 0n) {
      throw new Error("Addition overflow");
    }
    // Check for underflow - if both operands are negative and result is positive, we underflowed
    if (thisVal < 0n && valueVal < 0n && result > 0n) {
      throw new Error("Addition underflow");
    }


    return new Coin(result, this.tokenid);
  }

  public plus(value: Coin): Coin {
    return this.add(value);
  }

  public subtract(value: Coin): Coin {
    if (!this.tokenid.equals(value.tokenid)) {
      throw new Error("Token IDs must match for subtraction");
    }
    const result = this.value - value.value;

    // Check for overflow - if minuend is positive, subtrahend is negative, and result is negative, we overflowed
    if (this.value > 0n && value.value < 0n && result < 0n) {
      throw new Error("Subtraction overflow");
    }
    // Check for underflow - if minuend is negative, subtrahend is positive, and result is positive, we underflowed
    if (this.value < 0n && value.value > 0n && result > 0n) {
      throw new Error("Subtraction underflow");
    }

    if (
      result > BigInt(Number.MAX_SAFE_INTEGER) ||
      result < BigInt(Number.MIN_SAFE_INTEGER)
    ) {
      throw new Error("Result out of range");
    }
    return new Coin(result, this.tokenid);
  }

  public minus(value: Coin): Coin {
    return this.subtract(value);
  }

  public multiply(factor: bigint | number): Coin {
    if (typeof factor === "number") factor = BigInt(factor);

    // Check for overflow before multiplication
    if (this.value !== 0n && factor !== 0n) {
      const result = this.value * factor;

      // Check if we overflowed by seeing if division gives us back the original values
      if (result / factor !== this.value) {
        throw new Error("Multiplication overflow");
      }

      return new Coin(result, this.tokenid);
    }

    return new Coin(0n, this.tokenid);
  }

  public times(factor: bigint | number): Coin {
    return this.multiply(factor);
  }

  public divideBy(divisor: Coin): bigint {
    if (!this.tokenid.equals(divisor.tokenid)) {
      throw new Error("Token IDs must match for division");
    }
    return this.value / divisor.value;
  }

  public divide(divisor: bigint | number): Coin {
    if (typeof divisor === "number") divisor = BigInt(divisor);
    if (divisor === 0n) {
      throw new Error("Division by zero");
    }

    // Check for overflow before division
    const result = this.value / divisor;

    // Check if we overflowed by seeing if multiplication gives us back the original value
    // This isn't perfect but catches most cases
    if (result * divisor !== this.value && this.value !== 0n) {
      throw new Error("Division result out of range");
    }

    return new Coin(result, this.tokenid);
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
    return this.tokenid.equals(NetworkParameters.getBIGTANGLE_TOKENID());
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
    const tokenHex = this.tokenid.toString("hex");
    const valueStr = this.value.toString();
    result = prime * result + this.stringHashCode(tokenHex);
    result = prime * result + this.stringHashCode(valueStr);
    return result;
  }

  private stringHashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
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
      tokenid: this.tokenid.toString("hex"),
    };
  }
}

interface IComparable<T> {
  compareTo(other: T): number;
}

interface IMonetary {
  getValue(): bigint;
}