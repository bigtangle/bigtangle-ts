const { Buffer } = require('buffer');

// Test data from testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');
console.log('Total buffer length:', buffer.length);

// Let's examine the actual bytes starting from position 312
console.log('=== Detailed Byte Analysis from Position 312 ===');
let offset = 312;

// Output count
const outputCount = buffer[offset];
console.log(`Byte ${offset}: Output count = ${outputCount}`);
offset += 1;

// Value - let's examine this more carefully
console.log('\n=== Value Encoding Analysis ===');
const valueLength = buffer[offset];
console.log(`Byte ${offset}: Value length = ${valueLength}`);
offset += 1;

// The value might be encoded as a compact representation
// Let's examine the next bytes
console.log('Next bytes after value length:');
for (let i = 0; i < 10; i++) {
    if (offset + i < buffer.length) {
        console.log(`  Byte ${offset + i}: 0x${buffer[offset + i].toString(16).padStart(2, '0')} (${buffer[offset + i]})`);
    }
}

// Let's try to understand the actual encoding
// The Java code might be using a different encoding scheme
console.log('\n=== Alternative Value Encoding ===');

// Let's look for the value 100000000 in different ways
// 100000000 = 0x05F5E100
const targetValue = 100000000;
const targetHex = targetValue.toString(16).padStart(8, '0');
console.log('Target value 100000000 in hex:', targetHex);

// Let's search for this value in the buffer
const hexStr = buffer.toString('hex');
const pos = hexStr.indexOf(targetHex);
console.log('Target value found at hex position:', pos);
console.log('Target value found at byte position:', pos / 2);

// Let's examine the bytes around this position
if (pos !== -1) {
    const bytePos = pos / 2;
    console.log('\nBytes around target value:');
    const start = Math.max(0, bytePos - 10);
    const end = Math.min(buffer.length, bytePos + 20);
    console.log('Context:', buffer.slice(start, end).toString('hex'));
}

// Let's try to parse the actual structure
console.log('\n=== Actual Structure Parsing ===');
offset = 312;

// Output count
const outCount = buffer[offset];
console.log('Output count:', outCount);
offset += 1;

// Let's examine the next bytes more carefully
console.log('Bytes starting from offset 313:');
const bytes = buffer.slice(313, 313 + 50);
console.log('Hex:', bytes.toString('hex'));

// Let's try to parse as:
// 1. Value length (varint)
// 2. Value bytes
// 3. Token ID length (varint)
// 4. Token ID bytes
// 5. Script length (varint)
// 6. Script bytes

let current = 313;

// Value length
const valLen = buffer[current];
console.log('\nValue length:', valLen);
current += 1;

if (valLen > 0) {
    const valBytes = buffer.slice(current, current + valLen);
    console.log('Value bytes:', valBytes.toString('hex'));
    
    // Convert to number
    let val = 0n;
    for (let i = 0; i < valBytes.length; i++) {
        val = (val << 8n) | BigInt(valBytes[i]);
    }
    console.log('Value:', val.toString());
    current += valLen;
} else {
    console.log('Value: 0 (empty)');
}

// Token ID length
const tokLen = buffer[current];
console.log('Token ID length:', tokLen);
current += 1;

if (tokLen > 0) {
    const tokBytes = buffer.slice(current, current + tokLen);
    console.log('Token ID:', tokBytes.toString('hex'));
    current += tokLen;
} else {
    console.log('Token ID: empty');
}

// Script length
const scrLen = buffer[current];
console.log('Script length:', scrLen);
current += 1;

if (scrLen > 0) {
    const scrBytes = buffer.slice(current, current + scrLen);
    console.log('Script:', scrBytes.toString('hex'));
    current += scrLen;
} else {
    console.log('Script: empty');
}

// Let's also check if the value is encoded differently
console.log('\n=== Alternative Encodings ===');

// Check if value is encoded as 4-byte little-endian
const leValue = buffer.readUInt32LE(313);
console.log('4-byte LE value at 313:', leValue);

// Check if value is encoded as 8-byte little-endian
const leValue64 = buffer.readBigUInt64LE(313);
console.log('8-byte LE value at 313:', leValue64.toString());

// Check if value is encoded as 4-byte big-endian
const beValue = buffer.readUInt32BE(313);
console.log('4-byte BE value at 313:', beValue);

// Check if value is encoded as 8-byte big-endian
const beValue64 = buffer.readBigUInt64BE(313);
console.log('8-byte BE value at 313:', beValue64.toString());

// Let's examine the actual bytes more carefully
console.log('\n=== Byte-by-byte from 312 ===');
for (let i = 312; i < Math.min(312 + 100, buffer.length); i++) {
    console.log(`Byte ${i}: 0x${buffer[i].toString(16).padStart(2, '0')} (${buffer[i]})`);
}

// Let's look for the actual value 100000000 in the data
console.log('\n=== Search for 100000000 ===');
const searchValue = 100000000;
const searchHex = searchValue.toString(16);
console.log('Searching for:', searchHex);

// Search in different byte orders
const searchBuffer = Buffer.alloc(4);
searchBuffer.writeUInt32LE(searchValue);
console.log('LE 4-byte:', searchBuffer.toString('hex'));

const searchBufferBE = Buffer.alloc(4);
searchBufferBE.writeUInt32BE(searchValue);
console.log('BE 4-byte:', searchBufferBE.toString('hex'));

const searchBuffer64 = Buffer.alloc(8);
searchBuffer64.writeBigUInt64LE(BigInt(searchValue));
console.log('LE 8-byte:', searchBuffer64.toString('hex'));

const searchBuffer64BE = Buffer.alloc(8);
searchBuffer64BE.writeBigUInt64BE(BigInt(searchValue));
console.log('BE 8-byte:', searchBuffer64BE.toString('hex'));

// Find positions
const le4Pos = hexStr.indexOf(searchBuffer.toString('hex'));
const be4Pos = hexStr.indexOf(searchBufferBE.toString('hex'));
const le8Pos = hexStr.indexOf(searchBuffer64.toString('hex'));
const be8Pos = hexStr.indexOf(searchBuffer64BE.toString('hex'));

console.log('LE 4-byte position:', le4Pos);
console.log('BE 4-byte position:', be4Pos);
console.log('LE 8-byte position:', le8Pos);
console.log('BE 8-byte position:', be8Pos);
