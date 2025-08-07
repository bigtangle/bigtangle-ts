const { Buffer } = require('buffer');

// Test data from BlockTest.ts - testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');

console.log('=== Searching All Values ===');
console.log('Buffer length:', buffer.length);

// Skip block header (80 bytes)
let offset = 80;

// Transaction version
const version = buffer.readUInt32LE(offset);
console.log('Transaction version:', version);
offset += 4;

// Input count
const inputCount = buffer[offset];
console.log('Input count:', inputCount);
offset += 1;

console.log('\n=== Skipping Inputs ===');
for (let i = 0; i < inputCount; i++) {
    console.log(`Input ${i}:`);
    
    // Previous tx hash
    const prevHash = buffer.slice(offset, offset + 32).toString('hex');
    console.log('  Previous tx hash:', prevHash.substring(0, 16) + '...');
    offset += 32;
    
    // Output index
    const outputIndex = buffer.readUInt32LE(offset);
    console.log('  Output index:', outputIndex);
    offset += 4;
    
    // Script length
    const scriptLen = buffer[offset];
    console.log('  Script length:', scriptLen);
    offset += 1;
    
    // Script
    const script = buffer.slice(offset, offset + scriptLen).toString('hex');
    console.log('  Script:', script.substring(0, 20) + '...');
    offset += scriptLen;
    
    // Sequence
    const sequence = buffer.readUInt32LE(offset);
    console.log('  Sequence:', sequence);
    offset += 4;
}

// Output count
const outputCount = buffer[offset];
console.log('\nOutput count:', outputCount);
offset += 1;

console.log('\n=== Parsing All Outputs ===');

for (let i = 0; i < outputCount; i++) {
    console.log(`\nOutput ${i}:`);
    console.log('Starts at offset:', offset);
    
    // Value
    const value = buffer.readBigUInt64LE(offset);
    console.log('Value:', value.toString());
    
    // Token ID length
    const tokenIdLen = buffer[offset + 8];
    console.log('Token ID length:', tokenIdLen);
    
    // Token ID
    const tokenId = buffer.slice(offset + 9, offset + 9 + tokenIdLen);
    console.log('Token ID:', tokenId.toString('hex'));
    
    // Script length
    const scriptLen = buffer[offset + 9 + tokenIdLen];
    console.log('Script length:', scriptLen);
    
    // Script
    const script = buffer.slice(offset + 10 + tokenIdLen, offset + 10 + tokenIdLen + scriptLen);
    console.log('Script:', script.toString('hex'));
    
    // Calculate output bytes
    const outputStart = offset;
    const outputEnd = offset + 8 + 1 + tokenIdLen + 1 + scriptLen;
    const outputBytes = buffer.slice(outputStart, outputEnd);
    
    console.log('Output bytes:', outputBytes.toString('hex'));
    console.log('Output length:', outputBytes.length);
    
    // Check if this matches Java expected
    const javaExpected = '0010a5d4e8000000';
    console.log('Java expected:', javaExpected);
    console.log('Match:', outputBytes.toString('hex') === javaExpected);
    
    offset = outputEnd;
}

console.log('\n=== Final Position ===');
console.log('Final offset:', offset);
console.log('Remaining bytes:', buffer.length - offset);
