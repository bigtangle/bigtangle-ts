import { describe, it, expect } from 'vitest';
import { VarInt } from '../../src/net/bigtangle/core/VarInt';

// Helper function to encode a VarInt
function encodeVarInt(value: number): Buffer {
    const varInt = new VarInt(value);
    return varInt.encode();
}

describe('VarIntTest', () => {

    it('testBytes', () => {
        const value = 10;
        const size = VarInt.sizeOf(value);
        const encoded = encodeVarInt(value);
        const decoded = VarInt.fromBuffer(encoded, 0);
        
        expect(size).toBe(1);
        expect(encoded.length).toBe(1);
        expect(decoded.value.toJSNumber()).toBe(value);
    });

    it('testShorts', () => {
        const value = 64000;
        const size = VarInt.sizeOf(value);
        const encoded = encodeVarInt(value);
        const decoded = VarInt.fromBuffer(encoded, 0);
        
        expect(size).toBe(3);
        expect(encoded.length).toBe(3);
        expect(decoded.value.toJSNumber()).toBe(value);
    });

    it('testShortFFFF', () => {
        const value = 0xFFFF;
        const size = VarInt.sizeOf(value);
        const encoded = encodeVarInt(value);
        const decoded = VarInt.fromBuffer(encoded, 0);
        
        expect(size).toBe(3);
        expect(encoded.length).toBe(3);
        expect(decoded.value.toJSNumber()).toBe(value);
    });

    it('testInts', () => {
        const value = 0xAABBCCDD;
        const size = VarInt.sizeOf(value);
        const encoded = encodeVarInt(value);
        const decoded = VarInt.fromBuffer(encoded, 0);
        
        expect(size).toBe(5);
        expect(encoded.length).toBe(5);
        expect(decoded.value.toJSNumber() >>> 0).toBe(value);
    });

    it('testIntFFFFFFFF', () => {
        const value = 0xFFFFFFFF;
        const size = VarInt.sizeOf(value);
        const encoded = encodeVarInt(value);
        const decoded = VarInt.fromBuffer(encoded, 0);
        
        expect(size).toBe(5);
        expect(encoded.length).toBe(5);
        expect(decoded.value.toJSNumber() >>> 0).toBe(value);
    });

    it('testSizeOfNegativeInt', () => {
        expect(VarInt.sizeOf(-1)).toBe(9); // Negative values are treated as large unsigned integers
    });
});
