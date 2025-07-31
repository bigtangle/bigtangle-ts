import { sha256 } from '@noble/hashes/sha256';
import { ripemd160 } from '@noble/hashes/ripemd160';
import bigInt, { BigInteger } from 'big-integer'; // Use big-integer
import { VerificationException } from '../exception/VerificationException';
 
import { Buffer } from 'buffer';
import { ContractEventInfo } from '../core/ContractEventInfo';
import { Token } from '../core/Token';
import { TokenKeyValues } from '../core/TokenKeyValues';
import { BaseEncoding } from './BaseEncoding';

import { UnsafeByteArrayOutputStream } from '../core/UnsafeByteArrayOutputStream';
import { DataInputStream } from '../utils/DataInputStream';

/**
 * A collection of various utility methods that are helpful for working with the
 * Bitcoin protocol.
 */
export class Utils {

    public static readonly BITCOIN_SIGNED_MESSAGE_HEADER = "Bitcoin Signed Message:\n";
    public static readonly BITCOIN_SIGNED_MESSAGE_HEADER_BYTES = new TextEncoder().encode(Utils.BITCOIN_SIGNED_MESSAGE_HEADER);

    public static readonly HEX = BaseEncoding.base16().lowerCase();

    /**
     * Converts a BigInteger to a byte array that matches Java's BigInteger.toByteArray() method.
     * This method returns a byte array containing the two's-complement representation of this BigInteger.
     * The byte array will be in big-endian byte-order: the most significant byte is in the zeroth element.
     * The array will contain the minimum number of bytes required to represent this BigInteger,
     * including at least one sign bit, which is (ceil((this.bitLength() + 1)/8)).
     *
     * @param b The BigInteger to convert
     * @returns A byte array representing the BigInteger in two's-complement form
     */
    public static bigIntToBytes(b: BigInteger): Uint8Array {
        if (b === null) {
            return new Uint8Array(0);
        }

        // Handle zero case
        if (b.isZero()) {
            return new Uint8Array([0]);
        }

        // Get the absolute value as bytes
        const isNegative = b.isNegative();
        let absValue = isNegative ? b.abs() : b;

        // Convert to byte array by repeatedly dividing by 256
        const bytes: number[] = [];
        const big256 = bigInt(256);
        
        while (absValue.greater(bigInt(0))) {
            const divmod = absValue.divmod(big256);
            bytes.push(divmod.remainder.toJSNumber());
            absValue = divmod.quotient;
        }
        
        // Reverse to get big-endian format (most significant byte first)
        bytes.reverse();

        // For positive numbers, we might need to add a zero byte at the beginning
        // if the most significant bit is set (to ensure it's interpreted as positive)
        if (!isNegative && bytes.length > 0 && (bytes[0] & 0x80) !== 0) {
            bytes.unshift(0);
        }

        // For negative numbers, we need to compute the two's complement
        if (isNegative) {
            // Ensure we have at least one byte
            if (bytes.length === 0) {
                bytes.push(0);
            }
            
            // Compute two's complement: invert all bits and add 1
            // Invert all bits
            for (let i = 0; i < bytes.length; i++) {
                bytes[i] = ~bytes[i] & 0xFF;
            }
            
            // Add 1 to complete two's complement
            let carry = 1;
            for (let i = bytes.length - 1; i >= 0 && carry > 0; i--) {
                const sum = bytes[i] + carry;
                bytes[i] = sum & 0xFF;
                carry = sum > 0xFF ? 1 : 0;
            }
            
            // If we still have a carry, we need to expand the array
            if (carry > 0) {
                bytes.unshift(1);
            }
            
            // Now ensure the most significant bit is 1 for negative numbers
            if ((bytes[0] & 0x80) === 0) {
                // We need to add a leading byte with all bits set to 1
                bytes.unshift(0xFF);
            }
        }

        return new Uint8Array(bytes);
    }

    /**
     * Converts a BigInteger to a byte array with a specified length.
     * This is the original implementation that pads or truncates to a specific number of bytes.
     *
     * @param b The BigInteger to convert
     * @param numBytes The number of bytes to return
     * @returns A byte array of the specified length
     */
    private static bigIntToBytesFixed(b: BigInteger, numBytes: number): Uint8Array {
        if (b === null) {
            return new Uint8Array(0);
        }
        // big-integer's toArray(256) returns { value: number[], isNegative: boolean }
        const biArrayResult = b.toArray(256);
        const biBytes = new Uint8Array(biArrayResult.value).reverse(); // Convert to Uint8Array and then reverse

        const bytes = new Uint8Array(numBytes);
        // Fill from right to left (LSB to MSB)
        for (let i = 0; i < Math.min(biBytes.length, numBytes); i++) {
            bytes[numBytes - 1 - i] = biBytes[i];
        }
        return bytes;
    }

    /**
     * Converts a byte array to a BigInteger, matching Java's BigInteger(byte[]) constructor.
     * This method interprets the byte array as a two's-complement representation of a BigInteger.
     * The first byte's most significant bit indicates the sign (1 for negative, 0 for positive).
     *
     * @param bytes The byte array to convert
     * @returns A BigInteger representing the value in the byte array
     */
    public static bytesToBigInt(bytes: Uint8Array): BigInteger {
        if (bytes.length === 0) {
            return bigInt(0);
        }

        // Check if the number is negative (MSB of first byte is 1)
        const isNegative = (bytes[0] & 0x80) !== 0;

        if (!isNegative) {
            // Positive number - straightforward conversion
            // Convert each byte to its contribution to the total value
            let result = bigInt(0);
            for (let i = 0; i < bytes.length; i++) {
                result = result.multiply(256).add(bytes[i]);
            }
            return result;
        } else {
            // Negative number - need to convert from two's complement
            // First, invert all bits
            const invertedBytes = new Uint8Array(bytes.length);
            for (let i = 0; i < bytes.length; i++) {
                invertedBytes[i] = ~bytes[i] & 0xFF;
            }

            // Then add 1 to get the absolute value
            let carry = 1;
            for (let i = invertedBytes.length - 1; i >= 0 && carry > 0; i--) {
                const sum = invertedBytes[i] + carry;
                invertedBytes[i] = sum & 0xFF;
                carry = sum > 0xFF ? 1 : 0;
            }

            // Convert to BigInteger and negate
            let absValue = bigInt(0);
            for (let i = 0; i < invertedBytes.length; i++) {
                absValue = absValue.multiply(256).add(invertedBytes[i]);
            }
            return absValue.negate();
        }
    }

    public static uint32ToByteArrayBE(val: number, out: Uint8Array, offset: number): void {
        out[offset] = (val >>> 24) & 0xFF;
        out[offset + 1] = (val >>> 16) & 0xFF;
        out[offset + 2] = (val >>> 8) & 0xFF;
        out[offset + 3] = val & 0xFF;
    }

    public static uint32ToByteArrayLE(val: number, out: Uint8Array, offset: number): void {
        out[offset] = val & 0xFF;
        out[offset + 1] = (val >>> 8) & 0xFF;
        out[offset + 2] = (val >>> 16) & 0xFF;
        out[offset + 3] = (val >>> 24) & 0xFF;
    }

    public static uint64ToByteArrayLE(val: BigInteger, out: Uint8Array, offset: number): void {
        const bytes = Utils.bigIntToBytesFixed(val, 8);
        for (let i = 0; i < 8; i++) {
            out[offset + i] = bytes[7 - i]; // Reverse for LE
        }
    }

    public static bytesToByteStream(b: Uint8Array, stream: any): void {
        stream.write(b);
    }

    public static uint32ToByteStreamLE(val: number, stream: any): void {
        stream.write(val & 0xFF);
        stream.write((val >>> 8) & 0xFF);
        stream.write((val >>> 16) & 0xFF);
        stream.write((val >>> 24) & 0xFF);
    }

    public static writeVarIntLE(value: number, stream: any): void {
        while (value >= 0x80) {
            stream.write((value & 0x7F) | 0x80);
            value >>>= 7;
        }
        stream.write(value & 0x7F);
    }

    
    public static isLessThanUnsigned(n1: number, n2: number): boolean {
        return (n1 < n2) !== (n1 < 0 !== n2 < 0);
    }

    public static isLessThanOrEqualToUnsigned(n1: number, n2: number): boolean {
        return (n1 <= n2) !== (n1 < 0 !== n2 < 0);
    }

    public static reverseBytes(bytes: Uint8Array): Uint8Array {
        const buf = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
            buf[i] = bytes[bytes.length - 1 - i];
        }
        return buf;
    }

    public static reverseDwordBytes(bytes: Uint8Array, trimLength: number): Uint8Array {
        if (bytes.length % 4 !== 0) throw new Error("bytes.length must be divisible by 4");
        if (trimLength >= 0 && trimLength % 4 !== 0) throw new Error("trimLength must be divisible by 4 or negative");

        const rev = new Uint8Array(trimLength >= 0 && bytes.length > trimLength ? trimLength : bytes.length);

        for (let i = 0; i < rev.length; i += 4) {
            rev[i] = bytes[i + 3];
            rev[i + 1] = bytes[i + 2];
            rev[i + 2] = bytes[i + 1];
            rev[i + 3] = bytes[i];
        }
        return rev;
    }

    public static readUint32(bytes: Uint8Array, offset: number): number {
        if (offset + 4 > bytes.length) {
            throw new Error("Attempt to read 4 bytes from position " + offset + " with only " + bytes.length + " bytes available");
        }
        return (bytes[offset] & 0xff) |
               ((bytes[offset + 1] & 0xff) << 8) |
               ((bytes[offset + 2] & 0xff) << 16) |
               ((bytes[offset + 3] & 0xff) << 24);
    }

    public static readInt64(bytes: Uint8Array, offset: number): number {
        const low = (bytes[offset] & 0xff) |
                    ((bytes[offset + 1] & 0xff) << 8) |
                    ((bytes[offset + 2] & 0xff) << 16) |
                    ((bytes[offset + 3] & 0xff) << 24);
        const high = (bytes[offset + 4] & 0xff) |
                     ((bytes[offset + 5] & 0xff) << 8) |
                     ((bytes[offset + 6] & 0xff) << 16) |
                     ((bytes[offset + 7] & 0xff) << 24);
        return low + high * Math.pow(2, 32);
    }

    public static readUint32BE(bytes: Uint8Array, offset: number): number {
        return ((bytes[offset] & 0xff) << 24) |
               ((bytes[offset + 1] & 0xff) << 16) |
               ((bytes[offset + 2] & 0xff) << 8) |
               (bytes[offset + 3] & 0xff);
    }

    public static readNBytesString(dis: DataInputStream): string | null {
        const hasValue = dis.readBoolean();
        if (hasValue) {
            const length = dis.readInt();
            const buf = dis.readBytes(length);
            return new TextDecoder('utf-8').decode(buf);
        } else {
            return null;
        }
    }

    public static readNBytes(dis: DataInputStream): Uint8Array | null {
        const hasValue = dis.readBoolean();
        if (hasValue) {
            const length = dis.readInt();
            const message = dis.readBytes(length);
            return message;
        } else {
            return null;
        }
    }

    public static writeNBytesString(dos: UnsafeByteArrayOutputStream, message: string | null): void {
        dos.writeBoolean(message !== null);
        if (message !== null) {
            const bytes = new TextEncoder().encode(message);
            dos.writeInt(bytes.length);
            dos.write(Buffer.from(bytes));
        }
    }

    public static writeLong(dos: UnsafeByteArrayOutputStream, message: number | null): void {
        dos.writeBoolean(message !== null);
        if (message !== null) {
            dos.writeLong(message);
        }
    }

    public static readLong(dis: DataInputStream): number | null {
        const hasValue = dis.readBoolean();
        if (hasValue) {
            return dis.readLong();
        } else {
            return null;
        }
    }

    public static writeNBytes(dos: UnsafeByteArrayOutputStream, message: Uint8Array | null): void {
        dos.writeBoolean(message !== null);
        if (message !== null) {
            dos.writeInt(message.length);
            dos.write(Buffer.from(message));
        }
    }

    public static readUint16BE(bytes: Uint8Array, offset: number): number {
        return ((bytes[offset] & 0xff) << 8) | (bytes[offset + 1] & 0xff);
    }

    public static sha256hash160(input: Uint8Array): Uint8Array {
        const sha256Result = sha256(input);
        return ripemd160(sha256Result);
    }

    public static decodeMPI(mpi: Uint8Array, hasLength: boolean): BigInteger {
        let buf: Uint8Array;
        if (hasLength) {
            const length = Utils.readUint32BE(mpi, 0);
            buf = mpi.subarray(4, 4 + length);
        } else {
            buf = mpi;
        }
        if (buf.length === 0) {
            return bigInt(0); // Use bigInt(0)
        }
        const isNegative = (buf[0] & 0x80) === 0x80;
        if (isNegative) {
            buf[0] &= 0x7f;
        }
        const result = bigInt(Utils.HEX.encode(buf), 16); // Use bigInt()
        return isNegative ? result.negate() : result;
    }

    public static encodeMPI(value: BigInteger, includeLength: boolean): Uint8Array {
        if (value.equals(bigInt(0))) {
            if (!includeLength) {
                return new Uint8Array(0);
            } else {
                return new Uint8Array([0x00, 0x00, 0x00, 0x00]);
            }
        }
        const isNegative = value.isNegative();
        const absValue = isNegative ? value.abs() : value;

        // Get bytes from big-integer, most significant byte first
        const arrayResult = absValue.toArray(256);
        const array = new Uint8Array(arrayResult.value).reverse(); // Convert to Uint8Array and then reverse

        // Ensure the highest bit is not set if positive, or is set if negative (for MPI format)
        let length = array.length;
        if (array.length > 0 && (array[0] & 0x80) === 0x80) {
            length++;
        }

        let resultBytes: Uint8Array;
        if (length !== array.length) {
            resultBytes = new Uint8Array(length);
            resultBytes.set(array, 1);
        } else {
            resultBytes = array;
        }

        if (isNegative) {
            resultBytes[0] |= 0x80;
        }

        if (includeLength) {
            const finalResult = new Uint8Array(resultBytes.length + 4);
            Utils.uint32ToByteArrayBE(resultBytes.length, finalResult, 0);
            finalResult.set(resultBytes, 4);
            return finalResult;
        } else {
            return resultBytes;
        }
    }

    public static decodeCompactBits(compact: number): BigInteger {
        const size = (compact >>> 24) & 0xFF;
        const b = new Uint8Array(4);
        b[0] = (compact >>> 16) & 0xFF;
        b[1] = (compact >>> 8) & 0xFF;
        b[2] = compact & 0xFF;
        b[3] = 0;

        let mantissa = bigInt(Utils.HEX.encode(b.slice(0, 3)), 16);

        if ((compact & 0x00800000) !== 0) {
            mantissa = mantissa.negate();
        }
        
        if (size <= 3) {
            return mantissa.shiftRight(8 * (3 - size));
        } else {
            return mantissa.shiftLeft(8 * (size - 3));
        }
    }

    public static encodeCompactBits(value: BigInteger): number {
        if (value.isZero()) {
            return 0;
        }

        const absValue = value.abs();
        let hex = absValue.toString(16);
        if (hex.length % 2 !== 0) {
            hex = '0' + hex;
        }
        let size = hex.length / 2;

        let mantissaHex;
        if (size <= 3) {
            mantissaHex = hex;
            while (mantissaHex.length < 6) {
                mantissaHex = '00' + mantissaHex;
            }
        } else {
            mantissaHex = hex.substring(0, 6);
        }
        
        let mantissa = parseInt(mantissaHex, 16);

        if (mantissa & 0x800000) {
            mantissa >>= 8;
            size++;
        }

        let compact = (size << 24) | mantissa;
        if (value.isNegative()) {
            compact |= 0x800000;
        }
        return compact;
    }

    public static mockTime: Date | null = null;

    public static rollMockClock(seconds: number): Date {
        return Utils.rollMockClockMillis(seconds * 1000);
    }

    public static rollMockClockMillis(millis: number): Date {
        if (Utils.mockTime === null) {
            throw new Error("You need to use setMockClock() first.");
        }
        Utils.mockTime = new Date(Utils.mockTime.getTime() + millis);
        return Utils.mockTime;
    }

    public static unsetMockClock(): void {
        Utils.mockTime = null;
    }

    public static setMockClock(): void {
        Utils.mockTime = new Date();
    }

    public static setMockClockWithSeconds(mockClockSeconds: number): void {
        Utils.mockTime = new Date(mockClockSeconds * 1000);
    }

    public static now(): Date {
        return Utils.mockTime !== null ? Utils.mockTime : new Date();
    }

    public static currentTimeMillis(): number {
        return Utils.mockTime !== null ? Utils.mockTime.getTime() : Date.now();
    }

    public static currentTimeSeconds(): number {
        return Math.floor(Utils.currentTimeMillis() / 1000);
    }

    public static dateTimeFormat(dateTime: Date | number): string {
        const date = typeof dateTime === 'number' ? new Date(dateTime) : dateTime;
        return date.toISOString().replace(/\.\d{3}Z$/, 'Z'); // Simple ISO 8601 format
    }

    public static join(items: Iterable<any>): string {
        return Array.from(items).join(" ");
    }

    public static copyOf(input: Buffer, length: number): Buffer {
        const out = Buffer.alloc(length);
        input.copy(out, 0, 0, Math.min(length, input.length));
        return out;
    }

    public static appendByte(bytes: Uint8Array, b: number): Uint8Array {
        const result = new Uint8Array(bytes.length + 1);
        result.set(bytes, 0);
        result[bytes.length] = b;
        return result;
    }

    public static toString(bytes: Uint8Array, charsetName: string): string {
        return new TextDecoder(charsetName).decode(bytes);
    }

    
    public static isWindows(): boolean {
        return false; // Node.js/browser environment, not Windows
    }
 

    public static checkBitLE(data: Uint8Array, index: number): boolean {
        return ((data[index >>> 3] || 0) & (1 << (7 & index))) !== 0;
    }

    public static setBitLE(data: Uint8Array, index: number): void {
        data[index >>> 3] |= (1 << (7 & index));
    }

    public static isBlank(cs: string | null | undefined): boolean {
        if (cs === null || cs === undefined || cs.length === 0) {
            return true;
        }
        for (let i = 0; i < cs.length; i++) {
            if (!/\s/.test(cs.charAt(i))) {
                return false;
            }
        }
        return false;
    }

    public static strLength(cs: string | null | undefined): number {
        return cs === null || cs === undefined ? 0 : cs.length;
    }

    public static addAll(array1: Uint8Array, array2: Uint8Array): Uint8Array {
        const joinedArray = new Uint8Array(array1.length + array2.length);
        joinedArray.set(array1, 0);
        joinedArray.set(array2, array1.length);
        return joinedArray;
    }

    public static clone(array: Uint8Array | null): Uint8Array | null {
        if (array === null) {
            return null;
        }
        return new Uint8Array(array);
    }

    public checkContractBase(contractEventInfo: ContractEventInfo, contract: Token): void {
        const amountStr = this.findContractValue(contract.getTokenKeyValues(), "amount");
        if (amountStr !== null) {
            const amount = bigInt(amountStr); // Use bigInt()
            if (contractEventInfo.getOfferValue() !== null && contractEventInfo.getOfferValue()!.mod(amount).compareTo(bigInt(0)) !== 0) { // Use bigInt(0)
                throw new VerificationException(`only module base amount is allowed ${contractEventInfo.getOfferValue()} % ${amount}`);
            }
        }
        const tokenid = this.findContractValue(contract.getTokenKeyValues(), "token"); 
        if (tokenid !== null && contractEventInfo.getOfferTokenid() !== null && tokenid !== contractEventInfo.getOfferTokenid()) {
            throw new VerificationException("ContractEventInfo tokenidis not correct  ");
        }
    }

    public findContractValue(t: TokenKeyValues | null, key: string): string | null {
        if (t === null || t.getKeyvalues() === null) {
            return null;
        }
        for (const kv of t.getKeyvalues()!) {
            if (kv.getKey() === key) {
                return kv.getValue();
            }
        }
        return null;
    }

    static arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
        if (a === b) return true;
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }
    
    /**
     * Compares two Buffers for byte-wise equality.
     */
    public static bytesEqual(a: Buffer, b: Buffer): boolean {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    public static hashCode(data: Uint8Array): number {
        let hash = 0;
        for (const element of data) {
            const char = element;
            hash = (hash << 5) - hash + char;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }
}
