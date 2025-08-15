// Type definitions for Node.js Buffer
// Project: https://nodejs.org/
// Definitions by: Microsoft TypeScript <https://github.com/Microsoft>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare global {
    namespace NodeJS {
        interface Buffer extends Uint8Array {
            write(string: string, offset?: number, length?: number, encoding?: string): number;
            toJSON(): { type: 'Buffer'; data: any[] };
            equals(otherBuffer: Uint8Array): boolean;
            compare(otherBuffer: Uint8Array, targetStart?: number, targetEnd?: number, sourceStart?: number, sourceEnd?: number): number;
            copy(targetBuffer: Uint8Array, targetStart?: number, sourceStart?: number, sourceEnd?: number): number;
            slice(start?: number, end?: number): Buffer;
            subarray(start?: number, end?: number): Buffer;
            writeUIntLE(value: number, offset: number, byteLength: number): number;
            writeUIntBE(value: number, offset: number, byteLength: number): number;
            writeIntLE(value: number, offset: number, byteLength: number): number;
            writeIntBE(value: number, offset: number, byteLength: number): number;
            readUIntLE(offset: number, byteLength: number): number;
            readUIntBE(offset: number, byteLength: number): number;
            readIntLE(offset: number, byteLength: number): number;
            readIntBE(offset: number, byteLength: number): number;
            readUInt8(offset: number): number;
            readUInt16LE(offset: number): number;
            readUInt16BE(offset: number): number;
            readUInt32LE(offset: number): number;
            readUInt32BE(offset: number): number;
            readInt8(offset: number): number;
            readInt16LE(offset: number): number;
            readInt16BE(offset: number): number;
            readInt32LE(offset: number): number;
            readInt32BE(offset: number): number;
            readFloatLE(offset: number): number;
            readFloatBE(offset: number): number;
            readDoubleLE(offset: number): number;
            readDoubleBE(offset: number): number;
            reverse(): this;
            swap16(): Buffer;
            swap32(): Buffer;
            swap64(): Buffer;
            writeUInt8(value: number, offset: number): number;
            writeUInt16LE(value: number, offset: number): number;
            writeUInt16BE(value: number, offset: number): number;
            writeUInt32LE(value: number, offset: number): number;
            writeUInt32BE(value: number, offset: number): number;
            writeInt8(value: number, offset: number): number;
            writeInt16LE(value: number, offset: number): number;
            writeInt16BE(value: number, offset: number): number;
            writeInt32LE(value: number, offset: number): number;
            writeInt32BE(value: number, offset: number): number;
            writeFloatLE(value: number, offset: number): number;
            writeFloatBE(value: number, offset: number): number;
            writeDoubleLE(value: number, offset: number): number;
            writeDoubleBE(value: number, offset: number): number;
            fill(value: any, offset?: number, end?: number): this;
            indexOf(value: string | number | Uint8Array, byteOffset?: number, encoding?: string): number;
            lastIndexOf(value: string | number | Uint8Array, byteOffset?: number, encoding?: string): number;
            includes(value: string | number | Buffer, byteOffset?: number, encoding?: string): boolean;
            
            // Additional properties
            readonly length: number;
            toString(encoding?: string, start?: number, end?: number): string;
        }

        interface BufferConstructor {
            new(size: number): Buffer;
            new(array: any[]): Buffer;
            new(buffer: Buffer): Buffer;
            new(str: string, encoding?: string): Buffer;
            new(arrayBuffer: ArrayBuffer, byteOffset?: number, length?: number): Buffer;
            
            from(arrayBuffer: ArrayBuffer, byteOffset?: number, length?: number): Buffer;
            from(data: any[]): Buffer;
            from(buffer: Buffer): Buffer;
            from(str: string, encoding?: string): Buffer;
            alloc(size: number, fill?: string | Buffer | number, encoding?: string): Buffer;
            allocUnsafe(size: number): Buffer;
            allocUnsafeSlow(size: number): Buffer;
            byteLength(string: string, encoding?: string): number;
            isBuffer(obj: any): obj is Buffer;
            isEncoding(encoding: string): boolean;
            concat(list: Uint8Array[], totalLength?: number): Buffer;
            compare(buf1: Uint8Array, buf2: Uint8Array): number;
        }

        const Buffer: BufferConstructor;
    }
}

// Export the Buffer type
export = Buffer;
export as namespace Buffer;
