// Test file to reproduce the BigIntegerConverter issue
const originalValue = 10000000n;
console.log('Original value:', originalValue);
console.log('Original value (hex):', originalValue.toString(16));

// Manually simulate what BigIntegerConverter.toByteArray() should do
// Convert to bytes (big-endian)
let temp = originalValue;
const bytes = [];
while (temp > 0n) {
  bytes.push(Number(temp & 0xFFn));
  temp >>= 8n;
}
bytes.reverse();
console.log('Bytes (big-endian):', bytes);
console.log('Bytes (signed):', bytes.map(b => b > 127 ? b - 256 : b));

// Manually simulate what BigIntegerConverter.fromByteArray() should do
// Convert bytes back to BigInt (big-endian)
let result = 0n;
for (let i = 0; i < bytes.length; i++) {
  result = (result << 8n) | BigInt(bytes[i]);
}
console.log('Result value:', result);
console.log('Match:', originalValue === result);

// Now check what happens if we interpret as signed
// This simulates the server-side interpretation issue
let signedResult = 0;
for (let i = 0; i < Math.min(bytes.length, 4); i++) {
  signedResult = (signedResult << 8) | bytes[i];
}
// Apply sign extension if needed (MSB set)
if (bytes.length > 0 && bytes[0] & 0x80) {
  // Sign extend to 32 bits
  signedResult |= (-1 << (8 * Math.min(bytes.length, 4))) & 0xFFFFFFFF;
}
console.log('Signed interpretation (32-bit):', signedResult);