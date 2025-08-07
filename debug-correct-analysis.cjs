const { Buffer } = require('buffer');

// Test data from BlockTest.ts - testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');

console.log('=== Correct Analysis of Test Data Structure ===');
console.log('Buffer length:', buffer.length);

// Block structure:
// 1. Block header (80 bytes)
// 2. Transaction count (VarInt)
// 3. Transaction(s)

let offset = 0;

console.log('\n=== Block Header (80 bytes) ===');
console.log('Header:', buffer.slice(0, 80).toString('hex'));
offset = 80;

console.log('\n=== Transaction Count ===');
const txCount = buffer[offset];
console.log('Transaction count:', txCount);
offset += 1;

console.log('\n=== Transaction Analysis ===');
console.log('Transaction starts at offset:', offset);

// Transaction structure:
// 1. Version (4 bytes, little-endian)
const version = buffer.readUInt32LE(offset);
console.log('Version:', version);
offset += 4;

// 2. Input count (VarInt)
const inputCount = buffer[offset];
console.log('Input count:', inputCount);
offset += 1;

console.log('\n=== First Input ===');
// 3. Previous transaction hash (32 bytes)
const prevHash = buffer.slice(offset, offset + 32).toString('hex');
console.log('Previous tx hash:', prevHash);
offset += 32;

// 4. Previous output index (4 bytes, little-endian)
const prevOutputIndex = buffer.readUInt32LE(offset);
console.log('Previous output index:', prevOutputIndex);
offset += 4;

// 5. Script length (VarInt)
const scriptLength = buffer[offset];
console.log('Script length:', scriptLength);
offset += 1;

// 6. Script
const script = buffer.slice(offset, offset + scriptLength).toString('hex');
console.log('Script:', script);
offset += scriptLength;

// 7. Sequence (4 bytes, little-endian)
const sequence = buffer.readUInt32LE(offset);
console.log('Sequence:', sequence);
offset += 4;

console.log('\n=== Output Section ===');
// 8. Output count (VarInt)
const outputCount = buffer[offset];
console.log('Output count:', outputCount);
offset += 1;

console.log('\n=== First Output ===');
console.log('Output starts at offset:', offset);

// Output structure:
// 1. Value (8 bytes, little-endian)
const value = buffer.readBigUInt64LE(offset);
console.log('Value (satoshi):', value.toString());
console.log('Value bytes:', buffer.slice(offset, offset + 8).toString('hex'));
offset += 8;

// 2. Token ID length (VarInt)
const tokenIdLength = buffer[offset];
console.log('Token ID length:', tokenIdLength);
offset += 1;

// 3. Token ID
const tokenId = buffer.slice(offset, offset + tokenIdLength).toString('hex');
console.log('Token ID:', tokenId);
offset += tokenIdLength;

// 4. Script length (VarInt)
const outputScriptLength = buffer[offset];
console.log('Output script length:', outputScriptLength);
offset += 1;

// 5. Script
const outputScript = buffer.slice(offset, offset + outputScriptLength).toString('hex');
console.log('Output script:', outputScript);
offset += outputScriptLength;

console.log('\n=== Output Summary ===');
console.log('Value:', value.toString(), 'satoshi');
console.log('Token ID:', tokenId);
console.log('Script:', outputScript);

// Check if this matches Java expected
const expectedValue = 1000000000000n;
console.log('\n=== Comparison ===');
console.log('Expected value:', expectedValue.toString());
console.log('Actual value:', value.toString());
console.log('Values match:', value === expectedValue);

// Calculate the full output bytes
const outputStart = offset - 8 - 1 - tokenIdLength - 1 - outputScriptLength;
const outputEnd = offset;
const fullOutput = buffer.slice(outputStart, outputEnd);
console.log('\nFull output bytes:', fullOutput.toString('hex'));
console.log('Output length:', fullOutput.length);

// Java expected format
const javaExpected = '0010a5d4e8000000';
console.log('\nJava expected:', javaExpected);
console.log('Java expected (interpreted):');
console.log('  Value (LE):', javaExpected.substring(0, 16));
console.log('  Value (BE):', javaExpected.substring(14, 16) + javaExpected.substring(12, 14) + javaExpected.substring(10, 12) + javaExpected.substring(8, 10) + javaExpected.substring(6, 8) + javaExpected.substring(4, 6) + javaExpected.substring(2, 4) + javaExpected.substring(0, 2));
console.log('  Value (bigint):', BigInt('0x' + javaExpected.substring(0, 16).match(/../g).reverse().join('')).toString());

// Check remaining data
console.log('\n=== Remaining Data ===');
console.log('Remaining bytes:', buffer.length - offset);
if (buffer.length - offset > 0) {
    console.log('Remaining:', buffer.slice(offset).toString('hex'));
}
