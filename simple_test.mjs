// Simple test to verify value serialization
const testValue = 10000000n;
console.log('Testing value:', testValue.toString());
console.log('Hex representation:', testValue.toString(16));

// Serialize the value to bytes manually (big-endian)
let temp = testValue;
const bytes = [];
while (temp > 0n) {
  bytes.push(Number(temp & 0xFFn));
  temp >>= 8n;
}
bytes.reverse();
console.log('Serialized bytes (big-endian):', Array.from(bytes).map(b => '0x' + b.toString(16).padStart(2, '0')));

// Show the bytes as signed interpretation
console.log('Bytes as signed:', Array.from(bytes).map(b => b > 127 ? b - 256 : b));

// If these bytes were interpreted as a signed 32-bit integer, what would be the result?
let signedValue = 0;
for (let i = 0; i < Math.min(bytes.length, 4); i++) {
  signedValue = (signedValue << 8) | bytes[i];
}
// Apply sign extension if needed (MSB set)
if (bytes.length > 0 && bytes[0] & 0x80) {
  const shift = 8 * (4 - Math.min(bytes.length, 4));
  signedValue = (signedValue << shift) >> shift;
}
console.log('If interpreted as signed 32-bit:', signedValue);

// What the server should see if it correctly interprets as unsigned
let unsignedValue = 0n;
for (let i = 0; i < bytes.length; i++) {
  unsignedValue = (unsignedValue << 8n) | BigInt(bytes[i]);
}
console.log('If interpreted as unsigned:', unsignedValue.toString());

console.log('\nThe issue is that the server is interpreting the bytes as signed instead of unsigned.');
console.log('The client is correctly serializing 10000000n to [0x98, 0x96, 0x80].');
console.log('If interpreted as signed, this becomes -6777216.');
console.log('If interpreted as unsigned, this correctly becomes 10000000.');

console.log('\nSolution: The server needs to interpret Bitcoin transaction values as unsigned.');