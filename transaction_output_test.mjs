// Test to verify TransactionOutput serialization format
import fs from 'fs';

// Test the exact serialization that TransactionOutput should do
const testValue = 10000000n;
console.log('=== Testing TransactionOutput Serialization ===');
console.log('Original value:', testValue.toString());
console.log('Original hex:', testValue.toString(16));

// Simulate what BigIntegerConverter.toByteArray() should do with the fixed version
function bigIntegerToByteArrayFixed(value) {
  if (value === 0n) {
    return new Uint8Array([0]);
  }
  
  // For Bitcoin transaction values, always treat as unsigned
  // The MSB being set does not indicate a negative number in Bitcoin context
  let result = 0n;
  let temp = value;
  const bytes = [];
  
  while (temp > 0n) {
    bytes.push(Number(temp & 0xFFn));
    temp >>= 8n;
  }
  
  // Reverse to get big-endian
  bytes.reverse();
  
  return new Uint8Array(bytes);
}

// Simulate what TransactionOutput serialization does
const valuebytes = bigIntegerToByteArrayFixed(testValue);
console.log('\nValue bytes (fixed):', Array.from(valuebytes).map(b => '0x' + b.toString(16)));

// Simulate length-prefix encoding (VarInt)
const lengthPrefix = []; // This would be VarInt(valuebytes.length).encode()
const length = valuebytes.length;
if (length < 0xFD) {
  lengthPrefix.push(length);
} else if (length <= 0xFFFF) {
  lengthPrefix.push(0xFD);
  lengthPrefix.push(length & 0xFF);
  lengthPrefix.push((length >> 8) & 0xFF);
} else if (length <= 0xFFFFFFFF) {
  lengthPrefix.push(0xFE);
  lengthPrefix.push(length & 0xFF);
  lengthPrefix.push((length >> 8) & 0xFF);
  lengthPrefix.push((length >> 16) & 0xFF);
  lengthPrefix.push((length >> 24) & 0xFF);
} else {
  lengthPrefix.push(0xFF);
  lengthPrefix.push(length & 0xFF);
  lengthPrefix.push((length >> 8) & 0xFF);
  lengthPrefix.push((length >> 16) & 0xFF);
  lengthPrefix.push((length >> 24) & 0xFF);
  lengthPrefix.push((length >> 32) & 0xFF);
  lengthPrefix.push((length >> 40) & 0xFF);
  lengthPrefix.push((length >> 48) & 0xFF);
  lengthPrefix.push((length >> 56) & 0xFF);
}

console.log('Length prefix (VarInt):', Array.from(lengthPrefix).map(b => '0x' + b.toString(16)));

// Full serialized data
const serializedData = [...lengthPrefix, ...Array.from(valuebytes)];
console.log('Full serialized data:', serializedData.map(b => '0x' + b.toString(16)));

// Now simulate what the server should do when reading this data
// Server should first read the length prefix
let cursor = 0;
let lengthRead;
if (lengthPrefix[cursor] < 0xFD) {
  lengthRead = lengthPrefix[cursor];
  cursor++;
} else if (lengthPrefix[cursor] === 0xFD) {
  cursor++;
  lengthRead = lengthPrefix[cursor] | (lengthPrefix[cursor + 1] << 8);
  cursor += 2;
} else if (lengthPrefix[cursor] === 0xFE) {
  cursor++;
  lengthRead = lengthPrefix[cursor] | (lengthPrefix[cursor + 1] << 8) | (lengthPrefix[cursor + 2] << 16) | (lengthPrefix[cursor + 3] << 24);
  cursor += 4;
} else {
  cursor++;
  // For simplicity, just read 8 bytes for 0xFF
  lengthRead = lengthPrefix[cursor] | (lengthPrefix[cursor + 1] << 8) | (lengthPrefix[cursor + 2] << 16) | (lengthPrefix[cursor + 3] << 24) |
    (lengthPrefix[cursor + 4] << 32) | (lengthPrefix[cursor + 5] << 40) | (lengthPrefix[cursor + 6] << 48) | (lengthPrefix[cursor + 7] << 56);
  cursor += 8;
}

console.log('\nServer reads length:', lengthRead);

// Server then reads the value bytes
const valueBytesRead = serializedData.slice(cursor, cursor + lengthRead);
console.log('Server reads value bytes:', valueBytesRead.map(b => '0x' + b.toString(16)));

// Server then deserializes the value bytes using BigIntegerConverter.fromByteArray with the fixed version
function bigIntegerFromByteArrayFixed(bytes) {
  if (bytes.length === 0) return 0n;
  
  // For Bitcoin transaction values, always treat as unsigned
  // The MSB being set does not indicate a negative number in Bitcoin context
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = (result << 8n) | BigInt(bytes[i]);
  }
  
  // Return the unsigned interpretation for Bitcoin transaction values
  return result;
}

// Server deserializes the value bytes
const serverDeserializedValue = bigIntegerFromByteArrayFixed(new Uint8Array(valueBytesRead));
console.log('Server deserialized value:', serverDeserializedValue.toString());
console.log('Server value matches original:', testValue === serverDeserializedValue);

// Show what would happen if server uses old interpretation (signed)
let oldServerValue = 0;
for (let i = 0; i < Math.min(valueBytesRead.length, 4); i++) {
  oldServerValue = (oldServerValue << 8) | valueBytesRead[i];
}
// Apply sign extension if needed (MSB set)
if (valueBytesRead.length > 0 && valueBytesRead[0] & 0x80) {
  const shift = 8 * (4 - Math.min(valueBytesRead.length, 4));
  oldServerValue = (oldServerValue << shift) >> shift;
}
console.log('Old server interpretation (signed):', oldServerValue);
console.log('This matches the server error:', oldServerValue === -6777216);

console.log('\n=== Summary ===');
console.log('Client serializes 10000000n to bytes [0x98, 0x96, 0x80]');
console.log('Server with FIXED BigIntegerConverter reads [0x98, 0x96, 0x80] and gets 10000000n');
console.log('Server with OLD BigIntegerConverter reads [0x98, 0x96, 0x80] and gets -6777216');
console.log('The fix should make them match!');