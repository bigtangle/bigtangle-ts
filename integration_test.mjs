// Integration test to verify the fix works
import { BigIntegerConverter } from './src/net/bigtangle/core/BigIntegerConverter';

// Test the specific problematic value
const testValue = 10000000n;

console.log('=== Testing BigIntegerConverter Fix ===');
console.log('Original value:', testValue);
console.log('Original hex:', testValue.toString(16));

// Test serialization
const converter = new BigIntegerConverter(testValue);
const serializedBytes = converter.toByteArray();
console.log('Serialized bytes:', Array.from(serializedBytes).map(b => '0x' + b.toString(16)));

// Test deserialization
const deserialized = BigIntegerConverter.fromByteArray(serializedBytes);
const deserializedValue = deserialized.getValue();
console.log('Deserialized value:', deserializedValue);
console.log('Values match:', testValue === deserializedValue);

// Show the problematic interpretation
const problematicInterpretation = new Int32Array(new Uint8Array([...serializedBytes]).buffer)[0];
console.log('Problematic 32-bit signed interpretation:', problematicInterpretation);

console.log('\n=== Expected Behavior ===');
console.log('Client should serialize 10000000n to [0x98, 0x96, 0x80]');
console.log('Server should deserialize [0x98, 0x96, 0x80] to 10000000n');
console.log('NOT to -6777216 (signed 32-bit interpretation)');