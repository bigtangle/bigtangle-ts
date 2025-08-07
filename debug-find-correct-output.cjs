const { Buffer } = require('buffer');

// Test data from BlockTest.ts - testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');

console.log('=== Finding Correct Output ===');
console.log('Buffer length:', buffer.length);

// The expected value in Java is 1000000000000 satoshi
const expectedValue = 1000000000000n;
const expectedValueLE = Buffer.allocUnsafe(8);
expectedValueLE.writeBigUInt64LE(expectedValue);
console.log('Expected value (LE):', expectedValueLE.toString('hex'));

// Search for the expected value in the buffer
const pos = buffer.indexOf(expectedValueLE);
console.log('Expected value found at position:', pos !== -1 ? pos : 'Not found');

if (pos !== -1) {
    console.log('\n=== Context around expected value ===');
    const start = Math.max(0, pos - 20);
    const end = Math.min(buffer.length, pos + 20);
    console.log('Context:', buffer.slice(start, end).toString('hex'));
    
    // Analyze the structure around this position
    console.log('\n=== Structure Analysis ===');
    
    // Look backwards to find the start of the output
    // Output format: [value: 8 bytes][token length: varint][token: bytes][script length: varint][script: bytes]
    
    // The value is at position pos, so:
    // - Value: pos to pos+8
    // - Token length: pos+8
    
    let offset = pos;
    
    console.log('Value at offset:', offset);
    const actualValue = buffer.readBigUInt64LE(offset);
    console.log('Actual value:', actualValue.toString());
    offset += 8;
    
    // Read token length (VarInt)
    const firstByte = buffer[offset];
    let tokenLength, tokenLengthSize;
    if (firstByte < 0xfd) {
        tokenLength = firstByte;
        tokenLengthSize = 1;
    } else if (firstByte === 0xfd) {
        tokenLength = buffer.readUInt16LE(offset + 1);
        tokenLengthSize = 3;
    } else if (firstByte === 0xfe) {
        tokenLength = buffer.readUInt32LE(offset + 1);
        tokenLengthSize = 5;
    } else {
        tokenLength = Number(buffer.readBigUInt64LE(offset + 1));
        tokenLengthSize = 9;
    }
    
    console.log('Token length:', tokenLength, 'bytes used:', tokenLengthSize);
    offset += tokenLengthSize;
    
    // Read token ID
    const tokenId = buffer.slice(offset, offset + tokenLength).toString('hex');
    console.log('Token ID:', tokenId);
    offset += tokenLength;
    
    // Read script length
    const scriptFirstByte = buffer[offset];
    let scriptLength, scriptLengthSize;
    if (scriptFirstByte < 0xfd) {
        scriptLength = scriptFirstByte;
        scriptLengthSize = 1;
    } else if (scriptFirstByte === 0xfd) {
        scriptLength = buffer.readUInt16LE(offset + 1);
        scriptLengthSize = 3;
    } else if (scriptFirstByte === 0xfe) {
        scriptLength = buffer.readUInt32LE(offset + 1);
        scriptLengthSize = 5;
    } else {
        scriptLength = Number(buffer.readBigUInt64LE(offset + 1));
        scriptLengthSize = 9;
    }
    
    console.log('Script length:', scriptLength, 'bytes used:', scriptLengthSize);
    offset += scriptLengthSize;
    
    // Read script
    const script = buffer.slice(offset, offset + scriptLength).toString('hex');
    console.log('Script:', script);
    
    // Calculate full output
    const outputStart = pos - 8 - tokenLengthSize - tokenLength - scriptLengthSize - scriptLength;
    const outputEnd = offset + scriptLength;
    const fullOutput = buffer.slice(pos - 8, offset + scriptLength);
    console.log('\nFull output bytes:', fullOutput.toString('hex'));
    
    // Compare with Java expected
    const javaExpected = '0010a5d4e8000000';
    console.log('\nJava expected:', javaExpected);
    console.log('Match:', fullOutput.toString('hex').includes(javaExpected));
    
} else {
    console.log('\n=== Manual Search ===');
    // Let's manually search for the pattern
    const hexStr = buffer.toString('hex');
    console.log('Looking for 0010a5d4e8000000...');
    
    // Also try the reverse (BE format)
    const expectedValueBE = Buffer.allocUnsafe(8);
    expectedValueBE.writeBigUInt64BE(expectedValue);
    console.log('Expected value (BE):', expectedValueBE.toString('hex'));
    
    const posBE = buffer.indexOf(expectedValueBE);
    console.log('Expected value (BE) found at position:', posBE !== -1 ? posBE : 'Not found');
    
    // Let's also check if the data is split differently
    console.log('\n=== Checking for 0x00 prefix ===');
    const withPrefix = Buffer.concat([Buffer.from([0x00]), expectedValueLE]);
    console.log('With 0x00 prefix:', withPrefix.toString('hex'));
    
    const posWithPrefix = buffer.indexOf(withPrefix);
    console.log('With prefix found at:', posWithPrefix !== -1 ? posWithPrefix : 'Not found');
}
