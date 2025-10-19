// Debug script to understand what's being serialized
import { BigIntegerConverter } from './src/net/bigtangle/core/BigIntegerConverter';

// Test with the specific value from the error
const testValue = 10000000n;
console.log('Testing value:', testValue);

const converter = new BigIntegerConverter(testValue);
const bytes = converter.toByteArray();

console.log('Bytes (unsigned):', Array.from(bytes));
console.log('Bytes (signed interpretation):', Array.from(bytes).map(b => b > 127 ? b - 256 : b));

// Show hex representation
console.log('Hex (unsigned):', Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''));
console.log('Hex (signed):', Array.from(bytes).map(b => (b > 127 ? b - 256 : b).toString(16).padStart(2, '0')).join(''));

// Test deserialization
const deserialized = BigIntegerConverter.fromByteArray(bytes);
console.log('Deserialized value:', deserialized.getValue());
console.log('Match:', testValue === deserialized.getValue());

// Now test with the problematic negative value
const negativeTestValue = -6777216n;
console.log('\nTesting negative value:', negativeTestValue);

const negConverter = new BigIntegerConverter(negativeTestValue);
const negBytes = negConverter.toByteArray();

console.log('Negative bytes (unsigned):', Array.from(negBytes));
console.log('Negative bytes (signed interpretation):', Array.from(negBytes).map(b => b > 127 ? b - 256 : b));

// Show hex representation
console.log('Negative hex (unsigned):', Array.from(negBytes).map(b => b.toString(16).padStart(2, '0')).join(''));
console.log('Negative hex (signed):', Array.from(negBytes).map(b => (b > 127 ? b - 256 : b).toString(16).padStart(2, '0')).join(''));

// Test deserialization
const negDeserialized = BigIntegerConverter.fromByteArray(negBytes);
console.log('Negative deserialized value:', negDeserialized.getValue());
console.log('Negative match:', negativeTestValue === negDeserialized.getValue());