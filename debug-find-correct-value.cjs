const { Buffer } = require('buffer');

// Test data from testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');
console.log('Total buffer length:', buffer.length);

// Let's search for the correct Bitcoin value (100000000 = 0x00f2052a01000000 in little-endian)
const expectedValueHex = '00f2052a01000000'; // 100000000 in little-endian
const expectedValuePos = buffer.toString('hex').indexOf(expectedValueHex);
console.log('Expected value found at hex position:', expectedValuePos);
console.log('Expected value found at byte position:', expectedValuePos / 2);

// Let's examine the bytes around this position
const valueBytePos = expectedValuePos / 2;
console.log('\n=== Bitcoin Format at Correct Position ===');
console.log('Starting from byte:', valueBytePos - 1); // -1 for output count

let offset = valueBytePos - 1;

// Output count
const outputCount = buffer[offset];
console.log('Output count:', outputCount);
offset += 1;

// Value (8 bytes, little-endian)
const value = buffer.readBigUInt64LE(offset);
console.log('Value (satoshis):', value.toString());
offset += 8;

// Script length (varint)
let scriptLength = buffer[offset];
let scriptLengthBytes = 1;
if (scriptLength === 0xfd) {
    scriptLength = buffer.readUInt16LE(offset + 1);
    scriptLengthBytes = 3;
} else if (scriptLength === 0xfe) {
    scriptLength = buffer.readUInt32LE(offset + 1);
    scriptLengthBytes = 5;
} else if (scriptLength === 0xff) {
    scriptLength = Number(buffer.readBigUInt64LE(offset + 1));
    scriptLengthBytes = 9;
}
console.log('Script length:', scriptLength);
offset += scriptLengthBytes;

// Script
const scriptBytes = buffer.slice(offset, offset + scriptLength);
console.log('Script:', scriptBytes.toString('hex'));
offset += scriptLength;

console.log('\n=== Verification ===');
console.log('Expected Bitcoin values:');
console.log('- Output count: 1');
console.log('- Value: 100000000 (1 BTC in satoshis)');
console.log('- Script length: 25');
console.log('- Script: 76a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac');

console.log('\nActual Bitcoin values:');
console.log('- Output count:', outputCount);
console.log('- Value:', value.toString());
console.log('- Script length:', scriptLength);
console.log('- Script:', scriptBytes.toString('hex'));

// Check if they match
if (value === 100000000n && scriptLength === 25 && scriptBytes.toString('hex') === '76a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac') {
    console.log('✓ Bitcoin format matches expected values');
} else {
    console.log('✗ Bitcoin format mismatch');
}

// Let's also check what comes after the Bitcoin transaction
console.log('\n=== Transaction End ===');
console.log('Transaction ends at byte:', offset);

// Check for locktime
if (offset + 4 <= buffer.length) {
    const locktime = buffer.readUInt32LE(offset);
    console.log('Locktime:', locktime);
    offset += 4;
}

// Check for additional data
if (offset < buffer.length) {
    const remaining = buffer.slice(offset);
    console.log('Additional data length:', remaining.length);
    console.log('Additional data hex:', remaining.toString('hex'));
    
    // Check for JSON
    const jsonStr = remaining.toString('utf8');
    const jsonStart = jsonStr.indexOf('{');
    if (jsonStart !== -1) {
        console.log('JSON data:', jsonStr.substring(jsonStart));
    }
}
