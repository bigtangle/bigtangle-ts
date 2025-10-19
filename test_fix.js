// Test to verify the fix
import { BigIntegerConverter } from './dist/net/bigtangle/core/BigIntegerConverter.js';

const originalValue = 10000000n;
console.log('Original value:', originalValue);
console.log('Original value (hex):', originalValue.toString(16));

// Test serialization and deserialization
const converter = new BigIntegerConverter(originalValue);
const bytes = converter.toByteArray();
console.log('Serialized bytes:', Array.from(bytes));
console.log('Serialized bytes (signed):', Array.from(bytes).map(b => b > 127 ? b - 256 : b));

const deserialized = BigIntegerConverter.fromByteArray(bytes);
const resultValue = deserialized.getValue();
console.log('Deserialized value:', resultValue);
console.log('Match:', originalValue === resultValue);

// Test with negative values to make sure we didn't break anything
const negativeValue = -10000000n;
console.log('\nTesting negative value:', negativeValue);
const negConverter = new BigIntegerConverter(negativeValue);
const negBytes = negConverter.toByteArray();
console.log('Negative serialized bytes:', Array.from(negBytes));
console.log('Negative serialized bytes (signed):', Array.from(negBytes).map(b => b > 127 ? b - 256 : b));

const negDeserialized = BigIntegerConverter.fromByteArray(negBytes);
const negResultValue = negDeserialized.getValue();
console.log('Negative deserialized value:', negResultValue);
console.log('Negative match:', negativeValue === negResultValue);