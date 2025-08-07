const { Buffer } = require('buffer');

// Test data from testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');
console.log('Total buffer length:', buffer.length);

// Let's manually parse the transaction structure correctly
console.log('\n=== Correct Transaction Parsing ===');

// Skip block header (80 bytes) and transaction count (1 byte)
let offset = 81;
console.log('Starting at offset:', offset);

// Transaction version (4 bytes, little-endian)
const version = buffer.readUInt32LE(offset);
console.log('Version:', version);
offset += 4;

// Input count (VarInt)
let inputCount = buffer[offset];
let inputCountSize = 1;
if (inputCount === 0xfd) {
    inputCount = buffer.readUInt16LE(offset + 1);
    inputCountSize = 3;
} else if (inputCount === 0xfe) {
    inputCount = buffer.readUInt32LE(offset + 1);
    inputCountSize = 5;
} else if (inputCount === 0xff) {
    inputCount = Number(buffer.readBigUInt64LE(offset + 1));
    inputCountSize = 9;
}
console.log('Input count:', inputCount, 'at offset', offset);
offset += inputCountSize;

// Parse inputs
console.log('\n=== Parsing Inputs ===');
for (let i = 0; i < inputCount; i++) {
    console.log(`Input ${i}:`);
    
    // Previous transaction hash (32 bytes)
    const prevHash = buffer.slice(offset, offset + 32).toString('hex');
    console.log(`  Previous hash: ${prevHash}`);
    offset += 32;
    
    // Previous output index (4 bytes)
    const prevIndex = buffer.readUInt32LE(offset);
    console.log(`  Previous index: ${prevIndex}`);
    offset += 4;
    
    // Script length (VarInt)
    let scriptLen = buffer[offset];
    let scriptLenSize = 1;
    if (scriptLen === 0xfd) {
        scriptLen = buffer.readUInt16LE(offset + 1);
        scriptLenSize = 3;
    } else if (scriptLen === 0xfe) {
        scriptLen = buffer.readUInt32LE(offset + 1);
        scriptLenSize = 5;
    } else if (scriptLen === 0xff) {
        scriptLen = Number(buffer.readBigUInt64LE(offset + 1));
        scriptLenSize = 9;
    }
    
    console.log(`  Script length: ${scriptLen}`);
    offset += scriptLenSize;
    
    // Script
    const script = buffer.slice(offset, offset + scriptLen);
    console.log(`  Script: ${script.toString('hex')}`);
    offset += scriptLen;
    
    // Sequence (4 bytes)
    const sequence = buffer.readUInt32LE(offset);
    console.log(`  Sequence: ${sequence}`);
    offset += 4;
}

console.log('\n=== Parsing Outputs ===');
console.log('Output section starts at offset:', offset);

// Output count (VarInt)
let outputCount = buffer[offset];
let outputCountSize = 1;
if (outputCount === 0xfd) {
    outputCount = buffer.readUInt16LE(offset + 1);
    outputCountSize = 3;
} else if (outputCount === 0xfe) {
    outputCount = buffer.readUInt32LE(offset + 1);
    outputCountSize = 5;
} else if (outputCount === 0xff) {
    outputCount = Number(buffer.readBigUInt64LE(offset + 1));
    outputCountSize = 9;
}
console.log('Output count:', outputCount);
offset += outputCountSize;

// Parse outputs
const outputs = [];
for (let i = 0; i < outputCount; i++) {
    console.log(`\nOutput ${i}:`);
    
    // Value (8 bytes, little-endian)
    const value = buffer.readBigUInt64LE(offset);
    console.log('  Value:', value.toString());
    offset += 8;
    
    // Token ID length (VarInt)
    let tokenLen = buffer[offset];
    let tokenLenSize = 1;
    if (tokenLen === 0xfd) {
        tokenLen = buffer.readUInt16LE(offset + 1);
        tokenLenSize = 3;
    } else if (tokenLen === 0xfe) {
        tokenLen = buffer.readUInt32LE(offset + 1);
        tokenLenSize = 5;
    } else if (tokenLen === 0xff) {
        tokenLen = Number(buffer.readBigUInt64LE(offset + 1));
        tokenLenSize = 9;
    }
    
    console.log('  Token ID length:', tokenLen);
    offset += tokenLenSize;
    
    // Token ID bytes
    const tokenId = buffer.slice(offset, offset + tokenLen);
    console.log('  Token ID:', tokenId.toString('hex'));
    offset += tokenLen;
    
    // Script length (VarInt)
    let scriptLen = buffer[offset];
    let scriptLenSize = 1;
    if (scriptLen === 0xfd) {
        scriptLen = buffer.readUInt16LE(offset + 1);
        scriptLenSize = 3;
    } else if (scriptLen === 0xfe) {
        scriptLen = buffer.readUInt32LE(offset + 1);
        scriptLenSize = 5;
    } else if (scriptLen === 0xff) {
        scriptLen = Number(buffer.readBigUInt64LE(offset + 1));
        scriptLenSize = 9;
    }
    
    console.log('  Script length:', scriptLen);
    offset += scriptLenSize;
    
    // Script bytes
    const scriptBytes = buffer.slice(offset, offset + scriptLen);
    console.log('  Script bytes:', scriptBytes.toString('hex'));
    offset += scriptLen;
    
    outputs.push({
        value: value.toString(),
        tokenId: tokenId.toString('hex'),
        script: scriptBytes.toString('hex')
    });
}

console.log('\n=== Lock Time ===');
const lockTime = buffer.readUInt32LE(offset);
console.log('Lock time:', lockTime);
offset += 4;

console.log('\n=== Parsed Transaction ===');
console.log('Final offset:', offset);
console.log('Buffer length:', buffer.length);
console.log('Remaining bytes:', buffer.length - offset);

console.log('\n=== Output Summary ===');
outputs.forEach((output, i) => {
    console.log(`Output ${i}: value=${output.value}, token=${output.tokenId}, script=${output.script}`);
});

// Extract the actual transaction bytes
const transactionEnd = offset;
const transactionBytes = buffer.slice(81, transactionEnd);
console.log('\n=== Transaction Bytes ===');
console.log('Transaction length:', transactionBytes.length);
console.log('Transaction hex:', transactionBytes.toString('hex'));
