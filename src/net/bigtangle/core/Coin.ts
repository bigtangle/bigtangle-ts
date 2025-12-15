
import { MonetaryFormat } from "../utils/MonetaryFormat";
import { JsonProperty } from "jackson-js";
import { NetworkParameters } from "../params/NetworkParameters";

// Define a helper function to check array equality to avoid circular dependencies
function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export class Coin implements IMonetary, IComparable<Coin> {
  private static readonly serialVersionUID: bigint = 551802452657362699n;

  @JsonProperty() public value: bigint;
  @JsonProperty() public tokenid: Uint8Array;

  constructor(satoshis?: bigint, tokenid?: Uint8Array | string) {
    this.value = satoshis || 0n;

    // Convert tokenid to Buffer if it's a string
    if (typeof tokenid === "string") {
      // Handle base64 encoded strings
      if (/^[A-Za-z0-9+/=]+$/.test(tokenid)) {
        this.tokenid = Uint8Array.from(atob(tokenid), c => c.charCodeAt(0));
      }
      // Handle hex strings
      else if (/^[0-9a-fA-F]+$/.test(tokenid)) {
        const bytes = [];
        for (let i = 0; i < tokenid.length; i += 2) {
          bytes.push(parseInt(tokenid.substr(i, 2), 16));
        }
        this.tokenid = new Uint8Array(bytes);
      }
      // Fallback to UTF-8
      else {
        this.tokenid = new TextEncoder().encode(tokenid);
      }
    } else {
      // Use the string constant directly instead of calling a method that might cause circular deps
      this.tokenid = tokenid || this.stringToByteArray(NetworkParameters.BIGTANGLE_TOKENID_STRING);
    }
  }

  private stringToByteArray(str: string): Uint8Array {
    // Simple hex decoder to replace Utils.HEX.decode
    const bytes = [];
    for (let i = 0; i < str.length; i += 2) {
      bytes.push(parseInt(str.substr(i, 2), 16));
    }
    return new Uint8Array(bytes);
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
      coin.tokenid = new Uint8Array(coin.stringToByteArray(json.tokenHex));
    }
    return coin;
  }

  public static valueOf(satoshis: bigint, tokenid?: Uint8Array): Coin {
    return new Coin(
      satoshis,
      tokenid || Coin.getBigtangleTokenId()
    );
  }

  // Static method to get the default BigTangle token ID without circular dependency
  private static getBigtangleTokenId(): Uint8Array {
    // Simple hex decoder to replace Utils.HEX.decode
    const tokenString = "bc"; // Using the constant inline
    const bytes = [];
    for (let i = 0; i < tokenString.length; i += 2) {
      bytes.push(parseInt(tokenString.substr(i, 2), 16));
    }
    return new Uint8Array(bytes);
  }

  public static valueOfString(satoshis: bigint, tokenid?: string): Coin {
    let tokenIdBuffer: Uint8Array | undefined;
    if (tokenid) {
      const bytes = [];
      for (let i = 0; i < tokenid.length; i += 2) {
        bytes.push(parseInt(tokenid.substr(i, 2), 16));
      }
      tokenIdBuffer = new Uint8Array(bytes);
    }
    return new Coin(
      satoshis,
      tokenIdBuffer || Coin.getBigtangleTokenId()
    );
  }

  public static fromBigInteger(value: bigint, tokenid: Uint8Array): Coin {
    return new Coin(value, new Uint8Array(tokenid));
  }

  public getValue(): bigint {
    return this.value;
  }

  public setValue(value: bigint): void {
    this.value = value;
  }

  public getTokenHex(): string {
    return this.byteArrayToHex(this.tokenid);
  }

  private byteArrayToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  public add(value: Coin): Coin {
    if (!arraysEqual(this.tokenid, value.tokenid)) {
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
    if (!arraysEqual(this.tokenid, value.tokenid)) {
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
    if (!arraysEqual(this.tokenid, divisor.tokenid)) {
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
    return arraysEqual(this.tokenid, Coin.getBigtangleTokenId());
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
    const tokenHex = Array.from(this.tokenid)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
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
    return arraysEqual(this.tokenid, other.tokenid) && this.value === other.value;
  }

  public compareTo(other: Coin): number {
    if (this.value > other.value) return 1;
    if (this.value < other.value) return -1;
    return 0;
  }

  public getTokenid(): Uint8Array {
    return this.tokenid;
  }

  public toJSON() {
    return {
      value: this.value.toString(),
      tokenid: Array.from(this.tokenid)
        .map(b => b.toString(16).padStart(2, '0'))
        .join(''),
    };
  }
}

interface IComparable<T> {
  compareTo(other: T): number;
}

interface IMonetary {
  getValue(): bigint;
}