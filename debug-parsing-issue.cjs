const { Buffer } = require('buffer');

// Test data from testSerial2
const hex = '01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000';

const buffer = Buffer.from(hex, 'hex');
console.log('Buffer length:', buffer.length);

// Manual parsing to understand the structure
let offset = 0;

// Block header parsing
console.log('=== Block Header ===');
console.log('Magic bytes:', buffer.readUInt32LE(offset)); offset += 4;
console.log('Previous block hash:', buffer.slice(offset, offset + 32).toString('hex')); offset += 32;
console.log('Merkle root:', buffer.slice(offset, offset + 32).toString('hex')); offset += 32;
console.log('Time:', buffer.readUInt32LE(offset)); offset += 4;
console.log('Difficulty target:', buffer.readUInt32LE(offset)); offset += 4;
console.log('Nonce:', buffer.readUInt32LE(offset)); offset += 4;

// Additional BigTangle fields
console.log('Branch prev block:', buffer.slice(offset, offset + 32).toString('hex')); offset += 32;
console.log('Time (long):', buffer.readBigUInt64LE(offset)); offset += 8;
console.log('Diff target (long):', buffer.readBigUInt64LE(offset)); offset += 8;
console.log('Sequence:', buffer.readBigUInt64LE(offset)); offset += 8;
console.log('Miner address:', buffer.slice(offset, offset + 20).toString('hex')); offset += 20;
console.log('Block type:', buffer.readUInt32LE(offset)); offset += 4;
console.log('Height:', buffer.readBigUInt64LE(offset)); offset += 8;

console.log('Current offset after header:', offset);

// Transaction count
const txCount = buffer.readUInt8(offset);
console.log('Transaction count:', txCount); offset += 1;

// Parse transactions
for (let i = 0; i < txCount; i++) {
    console.log(`\n=== Transaction ${i} ===`);
    console.log('Version:', buffer.readUInt32LE(offset)); offset += 4;
    
    // Input count
    const inputCount = buffer.readUInt8(offset);
    console.log('Input count:', inputCount); offset += 1;
    
    // Parse inputs
    for (let j = 0; j < inputCount; j++) {
        console.log(`  Input ${j}:`);
        console.log('    Previous tx hash:', buffer.slice(offset, offset + 32).toString('hex')); offset += 32;
        console.log('    Previous output index:', buffer.readUInt32LE(offset)); offset += 4;
        
        // Script length
        const scriptLen = buffer.readUInt8(offset);
        console.log('    Script length:', scriptLen); offset += 1;
        
        console.log('    Script:', buffer.slice(offset, offset + scriptLen).toString('hex')); offset += scriptLen;
        console.log('    Sequence:', buffer.readUInt32LE(offset)); offset += 4;
    }
    
    // Output count
    const outputCount = buffer.readUInt8(offset);
    console.log('Output count:', outputCount); offset += 1;
    
    // Parse outputs
    for (let j = 0; j < outputCount; j++) {
        console.log(`  Output ${j}:`);
        
        // Value
        const valueLen = buffer.readUInt8(offset);
        console.log('    Value length:', valueLen); offset += 1;
        
        if (valueLen > 0) {
            const valueBytes = buffer.slice(offset, offset + valueLen);
            console.log('    Value bytes:', valueBytes.toString('hex')); offset += valueLen;
        }
        
        // Token ID
        const tokenLen = buffer.readUInt8(offset);
        console.log('    Token ID length:', tokenLen); offset += 1;
        
        if (tokenLen > 0) {
            const tokenBytes = buffer.slice(offset, offset + tokenLen);
            console.log('    Token ID bytes:', tokenBytes.toString('hex')); offset += tokenLen;
        }
        
        // Script
        const scriptLen = buffer.readUInt8(offset);
        console.log('    Script length:', scriptLen); offset += 1;
        
        if (scriptLen > 0) {
            const scriptBytes = buffer.slice(offset, offset + scriptLen);
            console.log('    Script bytes:', scriptBytes.toString('hex')); offset += scriptLen;
        }
    }
    
    console.log('Lock time:', buffer.readUInt32LE(offset)); offset += 4;
}

console.log('\nFinal offset:', offset);
console.log('Buffer length:', buffer.length);
console.log('Remaining bytes:', buffer.length - offset);

if (offset < buffer.length) {
    console.log('Remaining data:', buffer.slice(offset).toString('hex'));
}
