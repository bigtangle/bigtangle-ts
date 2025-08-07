const { Buffer } = require('buffer');

// Test data from testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');
console.log('Total buffer length:', buffer.length);

// Skip block header (80 bytes) and transaction count (1 byte)
let offset = 81;

console.log('\n=== Manual Transaction Parsing ===');
let txOffset = offset;

// Transaction version (4 bytes)
const version = buffer.readUInt32LE(txOffset);
console.log('Transaction version:', version);
txOffset += 4;

// Input count (VarInt)
let inputCount = buffer[txOffset];
let inputCountSize = 1;
if (inputCount === 0xfd) {
    inputCount = buffer.readUInt16LE(txOffset + 1);
    inputCountSize = 3;
} else if (inputCount === 0xfe) {
    inputCount = buffer.readUInt32LE(txOffset + 1);
    inputCountSize = 5;
} else if (inputCount === 0xff) {
    inputCount = Number(buffer.readBigUInt64LE(txOffset + 1));
    inputCountSize = 9;
}
console.log('Input count:', inputCount, 'size:', inputCountSize);
txOffset += inputCountSize;

// Skip inputs
console.log('\n=== Skipping Inputs ===');
for (let i = 0; i < inputCount; i++) {
    console.log(`Input ${i}:`);
    
    // Previous output (36 bytes)
    const prevHash = buffer.slice(txOffset, txOffset + 32).toString('hex');
    const prevIndex = buffer.readUInt32LE(txOffset + 32);
    console.log(`  Previous output: ${prevHash}:${prevIndex}`);
    txOffset += 36;
    
    // Script length (VarInt)
    let scriptLen = buffer[txOffset];
    let scriptLenSize = 1;
    if (scriptLen === 0xfd) {
        scriptLen = buffer.readUInt16LE(txOffset + 1);
        scriptLenSize = 3;
    } else if (scriptLen === 0xfe) {
        scriptLen = buffer.readUInt32LE(txOffset + 1);
        scriptLenSize = 5;
    } else if (scriptLen === 0xff) {
        scriptLen = Number(buffer.readBigUInt64LE(txOffset + 1));
        scriptLenSize = 9;
    }
    
    console.log(`  Script length: ${scriptLen} (size: ${scriptLenSize})`);
    txOffset += scriptLenSize;
    
    // Script bytes
    const scriptBytes = buffer.slice(txOffset, txOffset + scriptLen);
    console.log(`  Script bytes: ${scriptBytes.toString('hex')}`);
    txOffset += scriptLen;
    
    // Sequence (4 bytes)
    const sequence = buffer.readUInt32LE(txOffset);
    console.log(`  Sequence: ${sequence}`);
    txOffset += 4;
}

console.log('\n=== Output Section ===');
console.log('Output section starts at offset:', txOffset);

// Output count (VarInt)
let outputCount = buffer[txOffset];
let outputCountSize = 1;
if (outputCount === 0xfd) {
    outputCount = buffer.readUInt16LE(txOffset + 1);
    outputCountSize = 3;
} else if (outputCount === 0xfe) {
    outputCount = buffer.readUInt32LE(txOffset + 1);
    outputCountSize = 5;
} else if (outputCount === 0xff) {
    outputCount = Number(buffer.readBigUInt64LE(txOffset + 1));
    outputCountSize = 9;
}
console.log('Output count:', outputCount, 'size:', outputCountSize);
txOffset += outputCountSize;

// Parse outputs
console.log('\n=== Parsing Outputs ===');
for (let i = 0; i < outputCount; i++) {
    console.log(`\nOutput ${i}:`);
    
    // Value (8 bytes, little-endian)
    const value = buffer.readBigUInt64LE(txOffset);
    console.log('  Value:', value.toString());
    txOffset += 8;
    
    // Token ID length (VarInt) - this is the key difference!
    let tokenLen = buffer[txOffset];
    let tokenLenSize = 1;
    if (tokenLen === 0xfd) {
        tokenLen = buffer.readUInt16LE(txOffset + 1);
        tokenLenSize = 3;
    } else if (tokenLen === 0xfe) {
        tokenLen = buffer.readUInt32LE(txOffset + 1);
        tokenLenSize = 5;
    } else if (tokenLen === 0xff) {
        tokenLen = Number(buffer.readBigUInt64LE(txOffset + 1));
        tokenLenSize = 9;
    }
    
    console.log('  Token ID length:', tokenLen, 'size:', tokenLenSize);
    txOffset += tokenLenSize;
    
    // Token ID bytes
    const tokenId = buffer.slice(txOffset, txOffset + tokenLen);
    console.log('  Token ID:', tokenId.toString('hex'));
    txOffset += tokenLen;
    
    // Script length (VarInt)
    let scriptLen = buffer[txOffset];
    let scriptLenSize = 1;
    if (scriptLen === 0xfd) {
        scriptLen = buffer.readUInt16LE(txOffset + 1);
        scriptLenSize = 3;
    } else if (scriptLen === 0xfe) {
        scriptLen = buffer.readUInt32LE(txOffset + 1);
        scriptLenSize = 5;
    } else if (scriptLen === 0xff) {
        scriptLen = Number(buffer.readBigUInt64LE(txOffset + 1));
        scriptLenSize = 9;
    }
    
    console.log('  Script length:', scriptLen, 'size:', scriptLenSize);
    txOffset += scriptLenSize;
    
    // Script bytes
    const scriptBytes = buffer.slice(txOffset, txOffset + scriptLen);
    console.log('  Script bytes:', scriptBytes.toString('hex'));
    txOffset += scriptLen;
}

console.log('\nRemaining bytes:', buffer.length - txOffset);

// Extract the actual transaction output data for testing
console.log('\n=== Extracting Output Data ===');
const outputDataStart = 81 + 4 + 1 + 36 + 1 + 72 + 4 + 1; // Simplified calculation
console.log('Estimated output data start:', outputDataStart);

// Let's extract the first output data
const firstOutputStart = txOffset - (8 + 1 + 0 + 1 + 25); // Approximate
console.log('First output data:', buffer.slice(firstOutputStart, firstOutputStart + 50).toString('hex'));
