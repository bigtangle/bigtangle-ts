const { Buffer } = require('buffer');

// Test data from testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');
console.log('Total buffer length:', buffer.length);

// The actual custom format starts right after the sequence ffffffff
const sequencePos = 308; // From previous analysis
let offset = sequencePos + 4; // Skip ffffffff

console.log('=== Custom Format Parsing ===');
console.log('Starting at byte:', offset);

// Output count (1 byte)
const outputCount = buffer[offset];
console.log('Output count:', outputCount);
offset += 1;

// Value as BigInteger
const valueLength = buffer[offset];
console.log('Value length:', valueLength);
offset += 1;

let value = 0n;
if (valueLength > 0) {
    const valueBytes = buffer.slice(offset, offset + valueLength);
    console.log('Value bytes:', valueBytes.toString('hex'));
    
    // Convert to BigInteger (big-endian)
    for (let i = 0; i < valueBytes.length; i++) {
        value = (value << 8n) | BigInt(valueBytes[i]);
    }
    console.log('Value:', value.toString());
    offset += valueLength;
} else {
    console.log('Value: 0');
}

// Token ID as byte[]
const tokenIdLength = buffer[offset];
console.log('Token ID length:', tokenIdLength);
offset += 1;

let tokenId = null;
if (tokenIdLength > 0) {
    const tokenIdBytes = buffer.slice(offset, offset + tokenIdLength);
    console.log('Token ID:', tokenIdBytes.toString('hex'));
    tokenId = tokenIdBytes;
    offset += tokenIdLength;
} else {
    console.log('Token ID: empty');
}

// Script as byte[]
const scriptLength = buffer[offset];
console.log('Script length:', scriptLength);
offset += 1;

let script = null;
if (scriptLength > 0) {
    const scriptBytes = buffer.slice(offset, offset + scriptLength);
    console.log('Script:', scriptBytes.toString('hex'));
    script = scriptBytes;
    offset += scriptLength;
} else {
    console.log('Script: empty');
}

console.log('\n=== Verification ===');
console.log('Expected values:');
console.log('- Output count: 1');
console.log('- Value: 100000000');
console.log('- Token ID: empty (length 0)');
console.log('- Script: 76a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac');

console.log('\nActual values:');
console.log('- Output count:', outputCount);
console.log('- Value:', value.toString());
console.log('- Token ID length:', tokenId ? tokenId.length : 0);
console.log('- Script:', script ? script.toString('hex') : 'empty');

// Check if they match
if (outputCount === 1 && value === 100000000n && 
    (!tokenId || tokenId.length === 0) && 
    script && script.toString('hex') === '76a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac') {
    console.log('✓ Custom format matches expected values');
} else {
    console.log('✗ Custom format mismatch');
}

// Let's also check if there's a Bitcoin format embedded within
console.log('\n=== Bitcoin Format Search ===');
const hexStr = buffer.toString('hex');
const bitcoinPattern = '00000000010000001976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac';
const bitcoinPos = hexStr.indexOf(bitcoinPattern);
console.log('Bitcoin pattern found at:', bitcoinPos);

if (bitcoinPos !== -1) {
    const bitcoinBytePos = bitcoinPos / 2;
    console.log('Bitcoin format starts at byte:', bitcoinBytePos);
    
    // Check the context around this
    console.log('Context around Bitcoin format:');
    const start = Math.max(0, bitcoinBytePos - 10);
    const end = Math.min(buffer.length, bitcoinBytePos + 50);
    console.log('Bytes:', buffer.slice(start, end).toString('hex'));
}

// Let's examine the actual bytes at the expected position
console.log('\n=== Detailed Byte Analysis ===');
const expectedStart = 312;
console.log('Bytes starting at 312:');
for (let i = expectedStart; i < Math.min(expectedStart + 50, buffer.length); i++) {
    console.log(`Byte ${i}: 0x${buffer[i].toString(16).padStart(2, '0')} (${buffer[i]})`);
}

// Let's check if the value 100000000 appears in any format
console.log('\n=== Value 100000000 Search ===');
const value100M = 100000000;
const value100MHex = value100M.toString(16);
console.log('100000000 in hex:', value100MHex);

// Search for different byte orderings
const valueBytes = Buffer.alloc(8);
valueBytes.writeBigUInt64LE(BigInt(value100M));
console.log('Little-endian:', valueBytes.toString('hex'));

const valueBytesBE = Buffer.alloc(8);
valueBytesBE.writeBigUInt64BE(BigInt(value100M));
console.log('Big-endian:', valueBytesBE.toString('hex'));

// Search in the buffer
const lePos = hexStr.indexOf(valueBytes.toString('hex'));
const bePos = hexStr.indexOf(valueBytesBE.toString('hex'));
console.log('Little-endian position:', lePos);
console.log('Big-endian position:', bePos);
