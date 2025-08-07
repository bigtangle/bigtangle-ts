import { Buffer } from 'buffer';
import bigInt from 'big-integer';
import { Utils } from './src/net/bigtangle/utils/Utils';
import { Coin } from './src/net/bigtangle/core/Coin';
import { VarInt } from './src/net/bigtangle/core/VarInt';

// Test serialization of zero value
console.log('Testing zero value serialization:');

// Create a zero-value Coin
const zeroCoin = new Coin(0n);
console.log('Zero coin value:', zeroCoin.getValue().toString());

// Serialize the value
const valueBigInt = zeroCoin.getValue();
let valueBytes: Buffer;

// Handle zero value case properly
if (valueBigInt === 0n) {
    // For zero, we serialize a single zero byte
    // This ensures the Java server gets a non-empty array to parse
    valueBytes = Buffer.from([0]);
    console.log('Serializing zero value as single zero byte:', valueBytes.toString('hex'));
} else {
    // For non-zero values, use the Utils function
    valueBytes = Buffer.from(Utils.bigIntToBytes(bigInt(valueBigInt.toString())));
    console.log('Serializing non-zero value as bytes:', valueBytes.toString('hex'));
}

const valueLengthVarInt = new VarInt(valueBytes.length);
const valueLengthBytes = valueLengthVarInt.encode();
console.log('Value bytes length:', valueBytes.length);
console.log('Value length VarInt value:', valueLengthVarInt.value.toString());
console.log('Value length VarInt encoded bytes:', valueLengthBytes.toString('hex'));
console.log('Value bytes:', valueBytes.toString('hex'));

// Test deserialization
console.log('\nTesting deserialization:');
console.log('Value length bytes:', valueLengthBytes.toString('hex'));
console.log('Value bytes:', valueBytes.toString('hex'));

// Parse the length
const parsedLengthVarInt = VarInt.fromBuffer(valueLengthBytes, 0);
console.log('Parsed length VarInt value:', parsedLengthVarInt.value.toString());

// Parse the value
let parsedValueBigInt = 0n;
if (valueBytes.length > 0) {
    // Special case: if we have a single zero byte, it represents zero value
    if (valueBytes.length === 1 && valueBytes[0] === 0) {
        parsedValueBigInt = 0n;
        console.log('Recognized single zero byte as zero value');
    } else {
        // Convert bytes to BigInt (assuming little-endian)
        const bigIntValue = Utils.bytesToBigInt(valueBytes);
        parsedValueBigInt = BigInt(bigIntValue.toString());
        console.log('Parsed value bytes to BigInt:', parsedValueBigInt.toString());
    }
}

console.log('Parsed value:', parsedValueBigInt.toString());
console.log('Expected value:', valueBigInt.toString());
console.log('Match:', parsedValueBigInt === valueBigInt);