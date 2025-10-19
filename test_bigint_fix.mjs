// Test to verify BigIntegerConverter fix is working
import { BigIntegerConverter } from './dist/net/bigtangle/core/BigIntegerConverter.js';

// Test the specific problematic value
const testValue = 10000000n;
console.log('=== Testing BigIntegerConverter Fix ===');
console.log('Original value:', testValue.toString());
console.log('Original hex:', testValue.toString(16));

// Test serialization
const converter = new BigIntegerConverter(testValue);
const serializedBytes = converter.toByteArray();
console.log('Serialized bytes:', Array.from(serializedBytes).map(b => '0x' + b.toString(16)));

// Test deserialization with the fixed fromByteArray
const deserialized = BigIntegerConverter.fromByteArray(serializedBytes);
const deserializedValue = deserialized.getValue();
console.log('Deserialized value:', deserializedValue.toString());
console.log('Values match:', testValue === deserializedValue);

// Show what would happen if interpreted incorrectly as signed
let signedValue = 0;
for (let i = 0; i < Math.min(serializedBytes.length, 4); i++) {
  signedValue = (signedValue << 8) | serializedBytes[i];
}
// Apply sign extension if needed (MSB set)
if (serializedBytes.length > 0 && serializedBytes[0] & 0x80) {
  const shift = 8 * (4 - Math.min(serializedBytes.length, 4));
  signedValue = (signedValue << shift) >> shift;
}
console.log('Incorrect signed interpretation:', signedValue);

console.log('\n=== Expected Behavior ===');
console.log('Client should serialize 10000000n to [0x98, 0x96, 0x80]');
console.log('Server should deserialize [0x98, 0x96, 0x80] to 10000000n');
console.log('NOT to -6777216 (signed interpretation)');