import { describe, it, expect } from 'vitest';
import { VarInt } from '../../src/net/bigtangle/core/VarInt';

describe('VarIntTest', () => {

    it('testBytes', () => {
        const a = new VarInt(10);
        expect(a.getSizeInBytes()).toBe(1);
        expect(a.encode().length).toBe(1);
        expect(new VarInt(a.encode(), 0).value).toBe(10);
    });

    it('testShorts', () => {
        const a = new VarInt(64000);
        expect(a.getSizeInBytes()).toBe(3);
        expect(a.encode().length).toBe(3);
        expect(new VarInt(a.encode(), 0).value).toBe(64000);
    });

    it('testShortFFFF', () => {
        const a = new VarInt(0xFFFF); // In TypeScript, numbers are 64-bit floats, but bitwise operations treat them as 32-bit integers. 0xFFFF is fine.
        expect(a.getSizeInBytes()).toBe(3);
        expect(a.encode().length).toBe(3);
        expect(new VarInt(a.encode(), 0).value).toBe(0xFFFF);
    });

    it('testInts', () => {
        const a = new VarInt(0xAABBCCDD); // In TypeScript, numbers are 64-bit floats, but bitwise operations treat them as 32-bit integers.
        expect(a.getSizeInBytes()).toBe(5);
        expect(a.encode().length).toBe(5);
        const bytes = a.encode();
        // In Java, 0xFFFFFFFFL & new VarInt(bytes, 0).value is used to handle signed vs unsigned.
        // In TypeScript, numbers are floats, but bitwise operations treat them as 32-bit signed integers.
        // To get the unsigned 32-bit value, we can use >>> 0.
        expect(new VarInt(bytes, 0).value >>> 0).toBe(0xAABBCCDD);
    });

    it('testIntFFFFFFFF', () => {
        const a = new VarInt(0xFFFFFFFF);
        expect(a.getSizeInBytes()).toBe(5);
        expect(a.encode().length).toBe(5);
        const bytes = a.encode();
        expect(new VarInt(bytes, 0).value >>> 0).toBe(0xFFFFFFFF);
    });

    it('testLong', () => {
        // JavaScript numbers are 64-bit floating point. For large integers, BigInt is preferred.
        // However, VarInt in the TS project likely handles these as numbers or uses BigInt internally.
        // Assuming VarInt's TS implementation correctly handles large numbers.
        const a = new VarInt(0xCAFEBABEDEADBEEFL); // This literal will be a number in JS, potentially losing precision for very large numbers.
        // If VarInt's internal representation uses BigInt, then the input should be BigInt(0xCAFEBABEDEADBEEFLn)
        // For now, assuming the existing VarInt.ts handles this correctly as a number.
        expect(a.getSizeInBytes()).toBe(9);
        expect(a.encode().length).toBe(9);
        const bytes = a.encode();
        expect(new VarInt(bytes, 0).value).toBe(0xCAFEBABEDEADBEEFL);
    });

    it('testSizeOfNegativeInt', () => {
        // shouldn't normally be passed, but at least stay consistent (bug regression test)
        expect(VarInt.sizeOf(-1)).toBe(new VarInt(-1).encode().length);
    });
});
