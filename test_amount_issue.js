// Test to reproduce the exact issue with BigIntegerConverter
const originalValue = 10000000n; // This is what should be in the transaction output
console.log('Original value:', originalValue);
console.log('Original value (hex):', originalValue.toString(16));

// Simulate what BigIntegerConverter.toByteArray() does
function bigIntegerToByteArray(value) {
  if (value === 0n) {
    return new Uint8Array([0]);
  }
  
  // Handle negative numbers correctly
  const isNegative = value < 0n;
  const absValue = isNegative ? -value : value;
  
  // Convert to byte array (big-endian)
  let temp = absValue;
  const bytes = [];
  
  while (temp > 0n) {
    bytes.push(Number(temp & 0xFFn));
    temp >>= 8n;
  }
  
  // Reverse to get big-endian
  bytes.reverse();
  
  // For negative numbers, we need to ensure two's complement representation
  if (isNegative) {
    // If the most significant bit is set, we need to add a leading zero byte
    // to indicate that the number is negative
    if ((bytes[0] & 0x80) !== 0) {
      bytes.unshift(0);
    }
    
    // Convert to two's complement
    let carry = 1;
    for (let i = bytes.length - 1; i >= 0; i--) {
      const inverted = (~bytes[i] & 0xFF) + carry;
      bytes[i] = inverted & 0xFF;
      carry = inverted >> 8;
    }
  }
  
  return new Uint8Array(bytes);
}

// Simulate what BigIntegerConverter.fromByteArray() does
function bigIntegerFromByteArray(bytes) {
  if (bytes.length === 0) return 0n;
  
  // Check if the number is negative (MSB set)
  const isNegative = (bytes[0] & 0x80) !== 0;
  
  if (isNegative) {
    // Convert from two's complement to positive value
    // First, invert all bits
    const invertedBytes = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      invertedBytes[i] = ~bytes[i] & 0xFF;
    }
    
    // Then add 1
    let carry = 1;
    for (let i = invertedBytes.length - 1; i >= 0 && carry > 0; i--) {
      const sum = invertedBytes[i] + carry;
      invertedBytes[i] = sum & 0xFF;
      carry = sum >> 8;
    }
    
    // Convert to bigint
    let result = 0n;
    for (let i = 0; i < invertedBytes.length; i++) {
      result = (result << 8n) | BigInt(invertedBytes[i]);
    }
    
    // Make negative
    result = -result;
    
    return result;
  } else {
    // Positive number
    let result = 0n;
    for (let i = 0; i < bytes.length; i++) {
      result = (result << 8n) | BigInt(bytes[i]);
    }
    
    return result;
  }
}

// Test the serialization/deserialization
const serialized = bigIntegerToByteArray(originalValue);
console.log('Serialized bytes:', Array.from(serialized));
console.log('Serialized bytes (signed):', Array.from(serialized).map(b => b > 127 ? b - 256 : b));

const deserialized = bigIntegerFromByteArray(serialized);
console.log('Deserialized value:', deserialized);
console.log('Match:', originalValue === deserialized);

// Now check what happens if we interpret the bytes as a signed 32-bit integer
// This is what might be happening on the server side
function interpretAsSigned32Bit(bytes) {
  // Pad/truncate to 4 bytes
  const padded = new Uint8Array(4);
  const copyLength = Math.min(bytes.length, 4);
  for (let i = 0; i < copyLength; i++) {
    padded[3 - i] = bytes[bytes.length - 1 - i]; // Little-endian
  }
  
  // Interpret as signed 32-bit
  let result = 0;
  for (let i = 0; i < 4; i++) {
    result = (result << 8) | padded[i];
  }
  
  // Handle sign extension for JavaScript
  if (result >= 0x80000000) {
    result = result - 0x100000000;
  }
  
  return result;
}

const signedInterpretation = interpretAsSigned32Bit(serialized);
console.log('Interpreted as signed 32-bit:', signedInterpretation);

// Check if this matches the server's reported value
console.log('Matches server error value (-6777216):', signedInterpretation === -6777216);