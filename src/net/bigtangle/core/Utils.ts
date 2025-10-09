import { Buffer } from "buffer";
import crypto from "crypto";
import base58 from "bs58";
import { BaseEncoding } from "../utils/BaseEncoding";
import { Sha256Hash } from "./Sha256Hash";
import { Utils as UtilsHelper } from "../utils/Utils";
export class Utils {
  public static readonly HEX = BaseEncoding.base16().lowerCase();

  public static base58ToBytes(base58String: string): Buffer {
    return Buffer.from(base58.decode(base58String));
  }

  public static bytesToBase58(bytes: Buffer): string {
    return base58.encode(bytes);
  }

  public static toHexString(bytes: Uint8Array): string {
    return Buffer.from(bytes).toString("hex");
  }

  public static reverseBytes(bytes: Buffer): Buffer {
    return Buffer.from(bytes).reverse();
  }

  public static doubleDigest(buffer: Buffer | Uint8Array): Buffer {
    const inputBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const first = crypto.createHash("sha256").update(inputBuffer).digest();
    return crypto.createHash("sha256").update(first).digest();
  }

  public static arraysEqual(a: Buffer, b: Buffer): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  public static uint32ToByteStreamLE(value: number, stream: any): void {
    if (value < 0 || value > 0xffffffff) {
      throw new RangeError(`Value out of range: ${value}`);
    }

    const buffer = Buffer.alloc(4);
    buffer[0] = value & 0xff;
    buffer[1] = (value >>> 8) & 0xff;
    buffer[2] = (value >>> 16) & 0xff;
    buffer[3] = (value >>> 24) & 0xff;

    stream.write(buffer);
  }

  public static int64ToByteStreamLE(value: bigint, stream: any): void {
    if (value < 0n || value > 0xffffffffffffffffn) {
      throw new RangeError(`Value out of range for uint64: ${value}`);
    }

    const buffer = Buffer.alloc(8);
    buffer[0] = Number(value & 0xffn);
    buffer[1] = Number((value >> 8n) & 0xffn);
    buffer[2] = Number((value >> 16n) & 0xffn);
    buffer[3] = Number((value >> 24n) & 0xffn);
    buffer[4] = Number((value >> 32n) & 0xffn);
    buffer[5] = Number((value >> 40n) & 0xffn);
    buffer[6] = Number((value >> 48n) & 0xffn);
    buffer[7] = Number((value >> 56n) & 0xffn);

    stream.write(buffer);
  }

  public static readUint32(buffer: Buffer, offset: number): number {
    if (!buffer || buffer.length === 0) {
      throw new Error("Buffer is empty");
    }
    if (offset < 0 || offset + 4 > buffer.length) {
      throw new Error(
        `Utils.readUint32: not enough bytes to read uint32 at offset=${offset}, buffer length=${buffer.length}`
      );
    }
    return buffer.readUInt32LE(offset);
  }

  public static readInt64(buffer: Buffer, offset: number): bigint {
 
    if (offset + 8 > buffer.length) {
 
      return 0n;
    }
    const value = buffer.readBigUInt64LE(offset);
    // Convert to signed BigInt
    if (value >= 0x8000000000000000n) {
      return value - 0x10000000000000000n;
    }
    return value;
  }

  public static reverseDwordBytes(bytes: Buffer, length: number): Buffer {
    if (length <= 0) {
      // Handle negative or zero length
      return Buffer.alloc(0);
    }
    const buf = Buffer.alloc(length);
    // Process complete 4-byte chunks
    const chunkCount = Math.floor(length / 4);
    for (let i = 0; i < chunkCount; i++) {
      const offset = i * 4;
      const value = bytes.readUInt32BE(offset);
      buf.writeUInt32LE(value, offset);
    }

    // Copy any remaining bytes that don't form a complete dword
    const remainingStart = chunkCount * 4;
    const remainingBytes = length - remainingStart;
    if (remainingBytes > 0) {
      bytes.copy(
        buf,
        remainingStart,
        remainingStart,
        remainingStart + remainingBytes
      );
    }

    return buf;
  }

  public static dateTimeFormat(date: number | Date): string {
    const d = typeof date === "number" ? new Date(date) : date;
    return d.toISOString().replace(/\.\d{3}Z$/, "Z");
  }

  public static maxOfMostFreq(...args: number[]): number {
    if (args.length === 0) {
      return 0;
    }
    const counts: { [key: number]: number } = {};
    let maxCount = 0;
    let maxFreq = 0;
    for (const arg of args) {
      counts[arg] = (counts[arg] || 0) + 1;
      if (counts[arg] > maxCount) {
        maxCount = counts[arg];
        maxFreq = arg;
      } else if (counts[arg] === maxCount) {
        maxFreq = Math.max(maxFreq, arg);
      }
    }
    return maxFreq;
  }

  public static decodeCompactBits(compact: number): bigint {
    const size = compact >> 24;
    let mantissa = BigInt(compact & 0x007fffff);

    // Handle negative sign bit
    if ((compact & 0x00800000) !== 0) {
      mantissa = -mantissa;
    }

    let result: bigint;
    if (size <= 3) {
      result = mantissa;
    } else {
      result = mantissa << BigInt((size - 3) * 8);
    }
    return result;
  }

  public static encodeCompactBits(value: bigint): number {
    let val = value;
    let isNegative = false;

    if (val < 0n) {
      isNegative = true;
      val = -val;
    }

    if (val === 0n) {
      return 0;
    }

    let nSize = 0;
    let nCompact = 0;

    // Calculate nSize (number of bytes needed for the value)
    let tempVal = val;
    while (tempVal > 0n) {
      tempVal >>= 8n;
      nSize++;
    }
    if (nSize === 0 && val > 0n) {
      nSize = 1;
    }

    if (nSize <= 3) {
      nCompact = Number(val);
    } else {
      nCompact = Number(val >> BigInt((nSize - 3) * 8));
    }

    // If the mantissa is 0x800000 or greater, shift right and increment size
    // This ensures the mantissa is always < 0x800000 (2^23)
    if (nCompact >= 0x00800000) {
      nCompact >>= 8;
      nSize++;
    }

    let compact = nCompact | (nSize << 24);
    if (isNegative) {
      compact |= 0x00800000; // Set sign bit for negative numbers
    }
    return compact;
  }

  /**
   * Calculates RIPEMD160(SHA256(input)). This is used in Address calculations.
   * @param {Buffer|Uint8Array} input - The input data to hash
   * @returns {Buffer} - 20-byte RIPEMD160 hash of SHA256(input)
   */
  public static sha256hash160(input: Buffer | Uint8Array): Buffer {
    // First apply SHA256
    const sha256Hash = crypto.createHash("sha256").update(input).digest();

    // Then apply RIPEMD160 to the SHA256 result
    const ripemd160Hash = crypto
      .createHash("ripemd160")
      .update(sha256Hash)
      .digest();

    return ripemd160Hash;
  }

  /**
   * Converts a BigInteger to a byte array that matches Java's BigInteger.toByteArray() method.
 
   * @param b The BigInteger to convert
   * @returns A byte array representing the BigInteger in two's-complement form
   */
  public static bigIntToBytes(value: bigint): Uint8Array {
    return UtilsHelper.bigIntToBytes(value);
  }

  public static addAll(buffer1: Buffer, buffer2: Buffer): Buffer {
    const result = Buffer.alloc(buffer1.length + buffer2.length);
    buffer1.copy(result, 0);
    buffer2.copy(result, buffer1.length);
    return result;
  }

  public static calculateMerkleRoot(hashes: Sha256Hash[]): Sha256Hash {
    // Implement merkle root calculation
    if (hashes.length === 0) {
      return Sha256Hash.ZERO_HASH;
    }

    let tree = [...hashes];
    while (tree.length > 1) {
      const newTree: Sha256Hash[] = [];
      for (let i = 0; i < tree.length; i += 2) {
        const left = tree[i];
        const right = i + 1 < tree.length ? tree[i + 1] : left;
        const combined = Buffer.concat([left.getBytes(), right.getBytes()]);
        const hash = Sha256Hash.hashTwice(combined);
        newTree.push(Sha256Hash.wrap(hash));
      }
      tree = newTree;
    }
    return tree[0];
  }
}
