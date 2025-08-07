const bigInt = require('big-integer');

function bigIntToBytes(b) {
    if (b === null) {
        return new Uint8Array(0);
    }

    // Handle zero case
    if (b.isZero()) {
        return new Uint8Array([0]);
    }

    // Get the absolute value as bytes
    const isNegative = b.isNegative();
    let absValue = isNegative ? b.abs() : b;

    // Convert to byte array by repeatedly dividing by 256
    const bytes = [];
    const big256 = bigInt(256);
    
    while (absValue.greater(bigInt(0))) {
        const divmod = absValue.divmod(big256);
        bytes.push(divmod.remainder.toJSNumber());
        absValue = divmod.quotient;
    }
    
    // Reverse to get big-endian format (most significant byte first)
    bytes.reverse();

    // For positive numbers, we might need to add a zero byte at the beginning
    // if the most significant bit is set (to ensure it's interpreted as positive)
    if (!isNegative && bytes.length > 0 && (bytes[0] & 0x80) !== 0) {
        bytes.unshift(0);
    }

    // For negative numbers, we need to compute the two's complement
    if (isNegative) {
        // Ensure we have at least one byte
        if (bytes.length === 0) {
            bytes.push(0);
        }
        
        // Compute two's complement: invert all bits and add 1
        // Invert all bits
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = ~bytes[i] & 0xFF;
        }
        
        // Add 1 to complete two's complement
        let carry = 1;
        for (let i = bytes.length - 1; i >= 0 && carry > 0; i--) {
            const sum = bytes[i] + carry;
            bytes[i] = sum & 0xFF;
            carry = sum > 0xFF ? 1 : 0;
        }
        
        // If we still have a carry, we need to expand the array
        if (carry > 0) {
            bytes.unshift(1);
        }
        
        // Now ensure the most significant bit is 1 for negative numbers
        if ((bytes[0] & 0x80) === 0) {
            // We need to add a leading byte with all bits set to 1
            bytes.unshift(0xFF);
        }
    }

    return new Uint8Array(bytes);
}

function bytesToBigInt(bytes) {
    if (bytes.length === 0) {
        return bigInt(0);
    }

    // Check if the number is negative (MSB of first byte is 1)
    const isNegative = (bytes[0] & 0x80) !== 0;

    if (!isNegative) {
        // Positive number - straightforward conversion
        // Convert each byte to its contribution to the total value
        let result = bigInt(0);
        for (let i = 0; i < bytes.length; i++) {
            result = result.multiply(256).add(bytes[i]);
        }
        return result;
    } else {
        // Negative number - need to convert from two's complement
        // First, invert all bits
        const invertedBytes = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
            invertedBytes[i] = ~bytes[i] & 0xFF;
        }

        // Then add 1 to get the absolute value
        let carry = 1;
        for (let i = invertedBytes.length - 1; i >= 0 && carry > 0; i--) {
            const sum = invertedBytes[i] + carry;
            invertedBytes[i] = sum & 0xFF;
            carry = sum > 0xFF ? 1 : 0;
        }

        // Convert to BigInteger and negate
        let absValue = bigInt(0);
        for (let i = 0; i < invertedBytes.length; i++) {
            absValue = absValue.multiply(256).add(invertedBytes[i]);
        }
        return absValue.negate();
    }
}

// Test how bigIntToBytes and bytesToBigInt work with zero
console.log('Testing zero value serialization:');

// Test with zero
const zeroBigInt = bigInt(0);
console.log('Zero as bigInt:', zeroBigInt.toString());

const zeroBytes = bigIntToBytes(zeroBigInt);
console.log('Zero serialized as bytes:', zeroBytes);
console.log('Zero bytes as hex:', Buffer.from(zeroBytes).toString('hex'));
console.log('Zero bytes length:', zeroBytes.length);

const zeroBack = bytesToBigInt(zeroBytes);
console.log('Zero deserialized back:', zeroBack.toString());

// Test with empty array
try {
  const emptyBytes = new Uint8Array(0);
  console.log('Empty bytes array:', emptyBytes);
  console.log('Empty bytes length:', emptyBytes.length);
  
  const emptyBack = bytesToBigInt(emptyBytes);
  console.log('Empty bytes deserialized:', emptyBack.toString());
} catch (e) {
  console.log('Error with empty bytes:', e);
}

// Test with single zero byte
const singleZeroBytes = new Uint8Array([0]);
console.log('Single zero byte array:', singleZeroBytes);
console.log('Single zero byte as hex:', Buffer.from(singleZeroBytes).toString('hex'));
console.log('Single zero byte length:', singleZeroBytes.length);

const singleZeroBack = bytesToBigInt(singleZeroBytes);
console.log('Single zero byte deserialized:', singleZeroBack.toString());