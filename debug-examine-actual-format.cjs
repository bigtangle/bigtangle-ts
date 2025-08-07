const { Buffer } = require('buffer');

// Test data from testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');
console.log('Total buffer length:', buffer.length);

// Let's examine the hex string to find patterns
const hexStr = buffer.toString('hex');
console.log('Full hex string:', hexStr);

// Let's search for the actual value 100000000 in different formats
const value100M = 100000000;
const value100MHexBE = value100M.toString(16).padStart(16, '0');
const value100MHexLE = Buffer.from(value100M.toString(16).padStart(16, '0'), 'hex').reverse().toString('hex');

console.log('\n=== Value Search ===');
console.log('100000000 in hex (BE):', value100MHexBE);
console.log('100000000 in hex (LE):', value100MHexLE);

// Search for these patterns
const posBE = hexStr.indexOf(value100MHexBE);
const posLE = hexStr.indexOf(value100MHexLE);

console.log('BE position:', posBE);
console.log('LE position:', posLE);

// Let's examine the structure more systematically
console.log('\n=== Systematic Analysis ===');

// Find the sequence ffffffff (end of inputs)
const sequencePos = hexStr.indexOf('ffffffff');
console.log('Sequence ffffffff at hex position:', sequencePos);
console.log('Sequence ffffffff at byte position:', sequencePos / 2);

// Let's examine from that position
let offset = sequencePos / 2 + 4; // Skip sequence

console.log('\nFrom sequence position:');
console.log('Byte at offset:', buffer[offset]);
console.log('Next 20 bytes:', buffer.slice(offset, offset + 20).toString('hex'));

// Let's try to find where the actual transaction output starts
// Look for the pattern 0100000001000000 (output count + value)
const pattern = '0100000001000000';
const patternPos = hexStr.indexOf(pattern);
console.log('\nPattern', pattern, 'found at:', patternPos);

// Let's examine the actual structure byte by byte from a reasonable position
console.log('\n=== Byte-by-byte Analysis ===');
const startPos = 310;
console.log('Starting from byte', startPos);

for (let i = startPos; i < Math.min(startPos + 50, buffer.length); i++) {
    console.log(`Byte ${i}: 0x${buffer[i].toString(16).padStart(2, '0')} (${buffer[i]})`);
}

// Let's examine the actual transaction output structure
console.log('\n=== Transaction Output Structure ===');
// The actual Bitcoin transaction output should be:
// 01 (output count) + 0000000001000000 (value 100000000) + 19 (script length) + script

// Let's search for this exact pattern
const bitcoinPattern = '010000000100000019';
const bitcoinPos = hexStr.indexOf(bitcoinPattern);
console.log('Bitcoin pattern found at:', bitcoinPos);

if (bitcoinPos !== -1) {
    const bitcoinBytePos = bitcoinPos / 2;
    console.log('Bitcoin format starts at byte:', bitcoinBytePos);
    
    let offset = bitcoinBytePos;
    
    // Output count
    const outputCount = buffer[offset];
    console.log('Output count:', outputCount);
    offset += 1;
    
    // Value
    const value = buffer.readBigUInt64LE(offset);
    console.log('Value:', value.toString());
    offset += 8;
    
    // Script length
    const scriptLength = buffer[offset];
    console.log('Script length:', scriptLength);
    offset += 1;
    
    // Script
    const scriptBytes = buffer.slice(offset, offset + scriptLength);
    console.log('Script:', scriptBytes.toString('hex'));
    
    console.log('\n✓ Found correct Bitcoin format!');
} else {
    console.log('\n✗ Bitcoin format not found');
}

// Let's also check if there's a custom serialization format
console.log('\n=== Custom Format Analysis ===');
// The Java code might be using a custom format where:
// - Value is serialized as a BigInteger (with length prefix)
// - Token ID is serialized as byte[] (with length prefix)
// - Script is serialized as byte[] (with length prefix)

// Let's examine the bytes after the sequence
offset = sequencePos / 2 + 4;
console.log('Custom format starting at:', offset);

// Output count
const customOutputCount = buffer[offset];
console.log('Custom output count:', customOutputCount);
offset += 1;

// Value as BigInteger
const valueLength = buffer[offset];
console.log('Value length:', valueLength);
offset += 1;

if (valueLength > 0) {
    const valueBytes = buffer.slice(offset, offset + valueLength);
    console.log('Value bytes:', valueBytes.toString('hex'));
    
    // Convert to BigInteger (big-endian)
    let value = 0n;
    for (let i = 0; i < valueBytes.length; i++) {
        value = (value << 8n) | BigInt(valueBytes[i]);
    }
    console.log('Value:', value.toString());
    offset += valueLength;
} else {
    console.log('Value: 0');
    offset += 0;
}

// Token ID
const tokenIdLength = buffer[offset];
console.log('Token ID length:', tokenIdLength);
offset += 1;

if (tokenIdLength > 0) {
    const tokenIdBytes = buffer.slice(offset, offset + tokenIdLength);
    console.log('Token ID:', tokenIdBytes.toString('hex'));
    offset += tokenIdLength;
} else {
    console.log('Token ID: empty');
    offset += 0;
}

// Script
const scriptLength = buffer[offset];
console.log('Script length:', scriptLength);
offset += 1;

if (scriptLength > 0) {
    const scriptBytes = buffer.slice(offset, offset + scriptLength);
    console.log('Script:', scriptBytes.toString('hex'));
    offset += scriptLength;
} else {
    console.log('Script: empty');
}

console.log('\n=== Summary ===');
console.log('The Java serialization uses a custom format with:');
console.log('- Output count: 1');
console.log('- Value: serialized as BigInteger with length prefix');
console.log('- Token ID: serialized as byte[] with length prefix');
console.log('- Script: serialized as byte[] with length prefix');
console.log('This differs from Bitcoin\'s fixed 8-byte value format.');
