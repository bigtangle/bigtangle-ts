const { Buffer } = require('buffer');

// Test data from BlockTest.ts - testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');

// Proper VarInt parser
function readVarInt(buf, offset) {
    const firstByte = buf[offset];
    if (firstByte < 0xfd) {
        return { value: firstByte, size: 1 };
    } else if (firstByte === 0xfd) {
        return { value: buf.readUInt16LE(offset + 1), size: 3 };
    } else if (firstByte === 0xfe) {
        return { value: buf.readUInt32LE(offset + 1), size: 5 };
    } else {
        return { value: Number(buf.readBigUInt64LE(offset + 1)), size: 9 };
    }
}

console.log('=== Proper VarInt Analysis ===');
console.log('Buffer length:', buffer.length);

let offset = 0;

// Block header (80 bytes)
console.log('\n=== Block Header ===');
console.log('Header:', buffer.slice(0, 80).toString('hex'));
offset = 80;

// Transaction count
const txCount = readVarInt(buffer, offset);
console.log('\n=== Transaction Count ===');
console.log('Count:', txCount.value, 'bytes used:', txCount.size);
offset += txCount.size;

// Transaction
console.log('\n=== Transaction ===');
console.log('Transaction starts at offset:', offset);

// Version
const version = buffer.readUInt32LE(offset);
console.log('Version:', version);
offset += 4;

// Input count
const inputCount = readVarInt(buffer, offset);
console.log('Input count:', inputCount.value, 'bytes used:', inputCount.size);
offset += inputCount.size;

console.log('\n=== First Input ===');
// Previous tx hash
const prevHash = buffer.slice(offset, offset + 32).toString('hex');
console.log('Previous tx hash:', prevHash);
offset += 32;

// Previous output index
const prevOutputIndex = buffer.readUInt32LE(offset);
console.log('Previous output index:', prevOutputIndex);
offset += 4;

// Script length
const scriptLength = readVarInt(buffer, offset);
console.log('Script length:', scriptLength.value, 'bytes used:', scriptLength.size);
offset += scriptLength.size;

// Script
const script = buffer.slice(offset, offset + scriptLength.value).toString('hex');
console.log('Script:', script);
offset += scriptLength.value;

// Sequence
const sequence = buffer.readUInt32LE(offset);
console.log('Sequence:', sequence);
offset += 4;

console.log('\n=== Output Section ===');
// Output count
const outputCount = readVarInt(buffer, offset);
console.log('Output count:', outputCount.value, 'bytes used:', outputCount.size);
offset += outputCount.size;

console.log('\n=== First Output ===');
console.log('Output starts at offset:', offset);

// Value
const value = buffer.readBigUInt64LE(offset);
console.log('Value (satoshi):', value.toString());
console.log('Value bytes (LE):', buffer.slice(offset, offset + 8).toString('hex'));
console.log('Value bytes (BE):', buffer.slice(offset, offset + 8).reverse().toString('hex'));
offset += 8;

// Token ID length
const tokenIdLength = readVarInt(buffer, offset);
console.log('Token ID length:', tokenIdLength.value, 'bytes used:', tokenIdLength.size);
offset += tokenIdLength.size;

// Token ID
const tokenId = buffer.slice(offset, offset + tokenIdLength.value).toString('hex');
console.log('Token ID:', tokenId);
offset += tokenIdLength.value;

// Script length
const outputScriptLength = readVarInt(buffer, offset);
console.log('Output script length:', outputScriptLength.value, 'bytes used:', outputScriptLength.size);
offset += outputScriptLength.size;

// Script
const outputScript = buffer.slice(offset, offset + outputScriptLength.value).toString('hex');
console.log('Output script:', outputScript);
offset += outputScriptLength.value;

console.log('\n=== Output Summary ===');
console.log('Value:', value.toString(), 'satoshi');
console.log('Token ID:', tokenId);
console.log('Script:', outputScript);

// Check against expected
const expectedValue = 1000000000000n;
console.log('\n=== Comparison ===');
console.log('Expected value:', expectedValue.toString());
console.log('Actual value:', value.toString());
console.log('Values match:', value === expectedValue);

// Calculate full output bytes
const outputStart = offset - 8 - tokenIdLength.size - tokenIdLength.value - outputScriptLength.size - outputScriptLength.value;
const outputEnd = offset;
const fullOutput = buffer.slice(outputStart, outputEnd);
console.log('\nFull output bytes:', fullOutput.toString('hex'));
console.log('Output length:', fullOutput.length);

// Java expected
const javaExpected = '0010a5d4e8000000';
console.log('\nJava expected:', javaExpected);
console.log('Java expected value:', BigInt('0x' + javaExpected.match(/../g).reverse().join('')).toString());

// Check if Java expected appears in buffer
const javaExpectedBytes = Buffer.from(javaExpected, 'hex');
const pos = buffer.indexOf(javaExpectedBytes);
console.log('Java expected found at position:', pos !== -1 ? pos : 'Not found');

if (pos !== -1) {
    console.log('Context around Java expected:');
    const start = Math.max(0, pos - 20);
    const end = Math.min(buffer.length, pos + javaExpectedBytes.length + 20);
    console.log(buffer.slice(start, end).toString('hex'));
}

// Check lock time
if (offset < buffer.length) {
    const lockTime = buffer.readUInt32LE(offset);
    console.log('\nLock time:', lockTime);
    offset += 4;
}

// Check remaining data
console.log('\n=== Remaining Data ===');
console.log('Remaining bytes:', buffer.length - offset);
if (buffer.length - offset > 0) {
    console.log('Remaining:', buffer.slice(offset).toString('hex'));
}
