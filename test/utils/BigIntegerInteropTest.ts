import { describe, test, expect } from 'vitest';
import { Utils } from '../../src/net/bigtangle/utils/Utils';
import bigInt, { BigInteger } from 'big-integer';

describe('BigInteger Interoperability Tests', () => {
    // Test cases for positive numbers
    test('should correctly convert positive BigInteger to bytes and back', () => {
        const testValues = [
            bigInt(0),
            bigInt(1),
            bigInt(127),
            bigInt(128),
            bigInt(255),
            bigInt(256),
            bigInt(1000),
            bigInt(65535),
            bigInt(65536),
            bigInt('12345678901234567890')
        ];

        for (const value of testValues) {
            const bytes = Utils.bigIntToBytes(value);
            const restored = Utils.bytesToBigInt(bytes);
            console.log(`Value: ${value.toString()}, Bytes: [${Array.from(bytes).join(',')}], Restored: ${restored.toString()}`);
            expect(restored.equals(value)).toBe(true);
        }
    });

    // Test cases for negative numbers
    test('should correctly convert negative BigInteger to bytes and back', () => {
        const testValues = [
            bigInt(-1),
            bigInt(-128),
            bigInt(-255),
            bigInt(-256),
            bigInt(-1000),
            bigInt(-65535),
            bigInt(-65536),
            bigInt('-12345678901234567890')
        ];

        for (const value of testValues) {
            const bytes = Utils.bigIntToBytes(value);
            const restored = Utils.bytesToBigInt(bytes);
            expect(restored.equals(value)).toBe(true);
        }
    });

    // Test specific byte patterns that might be problematic
    test('should handle edge cases correctly', () => {
        // Test value that would need sign bit
        const positiveWithMSB = bigInt(128); // 0x80
        const bytes1 = Utils.bigIntToBytes(positiveWithMSB);
        const restored1 = Utils.bytesToBigInt(bytes1);
        expect(restored1.equals(positiveWithMSB)).toBe(true);
        // Should have leading zero to indicate positive
        expect(bytes1[0]).toBe(0);
        expect(bytes1[1]).toBe(128);

        // Test negative value
        const negative = bigInt(-128); // -0x80
        const bytes2 = Utils.bigIntToBytes(negative);
        const restored2 = Utils.bytesToBigInt(bytes2);
        expect(restored2.equals(negative)).toBe(true);
        // Should have MSB set to indicate negative
        expect((bytes2[0] & 0x80) !== 0).toBe(true);
    });

    // Test round-trip conversion
    test('should maintain round-trip conversion integrity', () => {
        const testValues = [
            bigInt(0),
            bigInt(1),
            bigInt(-1),
            bigInt(127),
            bigInt(-128),
            bigInt(255),
            bigInt(-255),
            bigInt('9223372036854775807'), // Max safe integer in JavaScript
            bigInt('-9223372036854775808'), // Min safe integer in JavaScript
        ];

        for (const value of testValues) {
            // Convert to bytes and back
            const bytes = Utils.bigIntToBytes(value);
            const restored = Utils.bytesToBigInt(bytes);
            
            // Verify the restored value equals the original
            expect(restored.equals(value)).toBe(true);
            
            // Verify the string representations match
            expect(restored.toString()).toBe(value.toString());
        }
    });
});
