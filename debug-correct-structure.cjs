const { Buffer } = require('buffer');

// Test data from testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');
console.log('Total buffer length:', buffer.length);

// Let's examine the exact structure by looking at the hex
const hexStr = tip;

console.log('=== Exact Structure Analysis ===');

// Find the exact position of the sequence
const sequencePos = hexStr.indexOf('ffffffff');
console.log('Sequence found at hex position:', sequencePos);
console.log('Sequence found at byte position:', sequencePos / 2);

// Let's examine the bytes starting from the sequence position
const sequenceBytePos = sequencePos / 2;
console.log('Bytes starting from sequence:');
console.log('Sequence (4 bytes):', buffer.slice(sequenceBytePos, sequenceBytePos + 4).toString('hex'));
console.log('Next byte (output count):', buffer[sequenceBytePos + 4]);

// Let's examine the actual output structure
console.log('\n=== Output Structure ===');
let offset = sequenceBytePos + 4; // Skip sequence

console.log('Starting at byte:', offset);
console.log('Output count:', buffer[offset]);

// Now let's parse the actual output
offset += 1; // Skip output count

// Value - BigInteger serialized as byte[]
const valueLen = buffer[offset];
console.log('Value length:', valueLen);
offset += 1;

const valueBytes = buffer.slice(offset, offset + valueLen);
console.log('Value bytes:', valueBytes.toString('hex'));

// Convert to BigInteger (big-endian)
let value = 0n;
for (let i = 0; i < valueBytes.length; i++) {
    value = (value << 8n) | BigInt(valueBytes[i]);
}
console.log('Value:', value.toString());
offset += valueLen;

// Token ID - byte[]
const tokenIdLen = buffer[offset];
console.log('Token ID length:', tokenIdLen);
offset += 1;

const tokenIdBytes = buffer.slice(offset, offset + tokenIdLen);
console.log('Token ID:', tokenIdBytes.toString('hex'));
offset += tokenIdLen;

// Script - byte[]
const scriptLen = buffer[offset];
console.log('Script length:', scriptLen);
offset += 1;

const scriptBytes = buffer.slice(offset, offset + scriptLen);
console.log('Script:', scriptBytes.toString('hex'));
offset += scriptLen;

console.log('\n=== Verification ===');
console.log('Expected values from Java test:');
console.log('- Output count: 1');
console.log('- Value: 100000000 (1 BTC in satoshis)');
console.log('- Token ID: empty (length 0)');
console.log('- Script: standard P2PKH script');

console.log('\nActual values:');
console.log('- Output count:', buffer[sequenceBytePos + 4]);
console.log('- Value:', value.toString());
console.log('- Token ID length:', tokenIdLen);
console.log('- Script length:', scriptLen);

// Let's also check if this matches the expected Bitcoin format
console.log('\n=== Bitcoin Format Check ===');
console.log('Expected Bitcoin output format:');
console.log('- 8-byte value (little-endian): 00f2052a01000000');
console.log('- Script length: 25');
console.log('- Script: 76a914...88ac (P2PKH)');

// Check if we have the expected value
const expectedValue = 100000000n;
if (value === expectedValue) {
    console.log('✓ Value matches expected 100000000 satoshis');
} else {
    console.log('✗ Value mismatch. Expected:', expectedValue, 'Got:', value);
}

// Check remaining data
console.log('\n=== Remaining Data ===');
console.log('Final offset:', offset);
console.log('Buffer length:', buffer.length);
console.log('Remaining bytes:', buffer.length - offset);

if (offset < buffer.length) {
    const remaining = buffer.slice(offset);
    console.log('Remaining hex:', remaining.toString('hex'));
    console.log('Remaining string:', remaining.toString('utf8'));
}
