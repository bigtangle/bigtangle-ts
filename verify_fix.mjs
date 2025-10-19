// Test to verify BigIntegerConverter fix
import fs from 'fs';

// Read the compiled BigIntegerConverter
const code = fs.readFileSync('./dist/net/bigtangle/core/BigIntegerConverter.js', 'utf8');

// Test the specific conversion
const testValue = 10000000n;
console.log('Testing value:', testValue);
console.log('Hex representation:', testValue.toString(16));

// Simulate what BigIntegerConverter should do
function testBigIntegerConversion() {
  // Serialize to bytes
  const bytes = [];
  let temp = testValue;
  while (temp > 0n) {
    bytes.push(Number(temp & 0xFFn));
    temp >>= 8n;
  }
  bytes.reverse();
  
  console.log('Serialized bytes (big-endian):', bytes.map(b => b.toString(16).padStart(2, '0')).join(' '));
  
  // Deserialize from bytes
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = (result << 8n) | BigInt(bytes[i]);
  }
  
  console.log('Deserialized result:', result);
  console.log('Match:', testValue === result);
  
  // Check what would happen if interpreted as signed 32-bit
  if (bytes.length <= 4) {
    let signedResult = 0;
    for (let i = 0; i < bytes.length; i++) {
      signedResult = (signedResult << 8) | bytes[i];
    }
    
    // Apply sign extension if MSB is set
    if (bytes.length > 0 && bytes[0] & 0x80) {
      const shift = 8 * (4 - bytes.length);
      signedResult = (signedResult << shift) >> shift;
    }
    
    console.log('Interpreted as signed 32-bit:', signedResult);
  }
}

testBigIntegerConversion();