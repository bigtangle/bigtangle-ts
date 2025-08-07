const { Utils } = require('./dist/net/bigtangle/utils/Utils.js');
const bigInt = require('big-integer');

// Test the serialization of 100000000
const value = bigInt(100000000);
console.log('Testing value:', value.toString());
console.log('Hex representation:', value.toString(16));

const bytes = Utils.bigIntToBytes(value);
console.log('Serialized bytes:', Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''));
console.log('Length:', bytes.length);

// Verify the bytes represent the correct value
const reconstructed = Utils.bytesToBigInt(bytes);
console.log('Reconstructed value:', reconstructed.toString());
console.log('Matches original:', reconstructed.equals(value));

// Test with the actual value from the logs (10000000000000000)
const largeValue = bigInt('10000000000000000');
console.log('\nTesting large value:', largeValue.toString());
console.log('Hex representation:', largeValue.toString(16));

const largeBytes = Utils.bigIntToBytes(largeValue);
console.log('Serialized bytes:', Array.from(largeBytes).map(b => b.toString(16).padStart(2, '0')).join(''));
console.log('Length:', largeBytes.length);

const reconstructedLarge = Utils.bytesToBigInt(largeBytes);
console.log('Reconstructed value:', reconstructedLarge.toString());
console.log('Matches original:', reconstructedLarge.equals(largeValue));
