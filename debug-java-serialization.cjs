// Simple test to understand how Java serializes zero values
console.log('Testing Java-like serialization of zero values:');

// In Java, a zero-value output would be serialized as:
// 1. A VarInt with value 0 (for the length of the value bytes)
// 2. No value bytes (since the length is 0)

// But Java's BigInteger constructor throws an exception when given an empty byte array.

// Let's see what happens when we serialize a zero value in our TypeScript code:
const zeroValue = 0n;
console.log('Zero value:', zeroValue.toString());

// Let's see what our Utils.bigIntToBytes function returns for zero:
const bigInt = require('big-integer');
const { Utils } = require('./dist/src/net/bigtangle/utils/Utils');

const zeroBytes = Utils.bigIntToBytes(bigInt(0));
console.log('Zero bytes from Utils.bigIntToBytes:', zeroBytes);

// Let's see what happens when we create a VarInt with value 0:
const { VarInt } = require('./dist/src/net/bigtangle/core/VarInt');

const zeroLengthVarInt = new VarInt(0);
const zeroLengthBytes = zeroLengthVarInt.encode();
console.log('Zero length VarInt value:', zeroLengthVarInt.value.toString());
console.log('Zero length VarInt encoded bytes:', zeroLengthBytes);

// This is what we're currently sending:
console.log('Currently sending:');
console.log('  Length VarInt bytes:', zeroLengthBytes);
console.log('  Value bytes: (none)');

// But the Java server expects to be able to create a BigInteger from the value bytes,
// which throws an exception when given an empty byte array.

// Let's see what we should be sending instead:
// We should send a single zero byte for zero values:
const singleZeroByte = Buffer.from([0]);
console.log('Single zero byte:', singleZeroByte);

const singleZeroLengthVarInt = new VarInt(1);
const singleZeroLengthBytes = singleZeroLengthVarInt.encode();
console.log('Single zero byte length VarInt value:', singleZeroLengthVarInt.value.toString());
console.log('Single zero byte length VarInt encoded bytes:', singleZeroLengthBytes);

console.log('Should be sending:');
console.log('  Length VarInt bytes:', singleZeroLengthBytes);
console.log('  Value bytes:', singleZeroByte);