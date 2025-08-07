const { Buffer } = require('buffer');

// Test data from BlockTest.ts - testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');

console.log('=== Finding Transaction Output ===');
console.log('Buffer length:', buffer.length);

// The expected value is 1000000000000 satoshi = 10000 BTG
const expectedValue = 1000000000000n;
const expectedValueHex = expectedValue.toString(16).padStart(16, '0');
console.log('Expected value:', expectedValue.toString());
console.log('Expected value hex:', expectedValueHex);

// Search for the value in little-endian format
const valueBytes = Buffer.allocUnsafe(8);
valueBytes.writeBigUInt64LE(expectedValue);
const searchHex = valueBytes.toString('hex');
console.log('Search hex (little-endian):', searchHex);

// Find the position
const hex = buffer.toString('hex');
const pos = hex.indexOf(searchHex);

console.log('\nSearch result:');
console.log('Found at byte position:', pos !== -1 ? pos / 2 : 'Not found');

if (pos !== -1) {
    const bytePos = pos / 2;
    console.log('Byte position:', bytePos);
    
    // Show the transaction structure around this position
    console.log('\n=== Transaction Structure ===');
    
    // Look backwards to find transaction start
    // Transaction structure: version(4) + input_count + inputs + output_count + outputs
    
    // Let's manually find the transaction
    let offset = 80; // Skip block header
    
    // Transaction version
    const version = buffer.readUInt32LE(offset);
    console.log('Transaction version:', version);
    offset += 4;
    
    // Input count (varint)
    const inputCount = buffer[offset];
    console.log('Input count:', inputCount);
    offset += 1;
    
    // Skip inputs
    for (let i = 0; i < inputCount; i++) {
        // Previous tx hash (32 bytes)
        offset += 32;
        
        // Output index (4 bytes)
        offset += 4;
        
        // Script length
        const scriptLen = buffer[offset];
        offset += 1 + scriptLen;
        
        // Sequence (4 bytes)
        offset += 4;
    }
    
    // Output count
    const outputCount = buffer[offset];
    console.log('Output count:', outputCount);
    offset += 1;
    
    console.log('\n=== Parsing Outputs ===');
    
    for (let i = 0; i < outputCount; i++) {
        console.log(`\nOutput ${i}:`);
        console.log('Starts at offset:', offset);
        
        // Value
        const value = buffer.readBigUInt64LE(offset);
        console.log('Value:', value.toString());
        
        if (value === expectedValue) {
            console.log('*** FOUND TARGET OUTPUT ***');
            
            // Extract the complete output
            const outputStart = offset;
            
            // Skip value
            offset += 8;
            
            // Token ID length
            const tokenIdLen = buffer[offset];
            console.log('Token ID length:', tokenIdLen);
            offset += 1;
            
            // Token ID
            const tokenId = buffer.slice(offset, offset + tokenIdLen);
            console.log('Token ID:', tokenId.toString('hex'));
            offset += tokenIdLen;
            
            // Script length
            const scriptLen = buffer[offset];
            console.log('Script length:', scriptLen);
            offset += 1;
            
            // Script
            const script = buffer.slice(offset, offset + scriptLen);
            console.log('Script:', script.toString('hex'));
            offset += scriptLen;
            
            // Extract the exact output bytes
            const outputBytes = buffer.slice(outputStart, offset);
            console.log('\n=== Exact Output Bytes ===');
            console.log('Hex:', outputBytes.toString('hex'));
            console.log('Length:', outputBytes.length);
            
            // Compare with Java expected
            const javaExpected = '0010a5d4e8000000';
            console.log('\n=== Java Comparison ===');
            console.log('Java expected:', javaExpected);
            console.log('Actual:', outputBytes.toString('hex'));
            console.log('Match:', outputBytes.toString('hex') === javaExpected);
            
            break;
        } else {
            // Skip this output
            offset += 8; // value
            
            const tokenIdLen = buffer[offset];
            offset += 1 + tokenIdLen;
            
            const scriptLen = buffer[offset];
            offset += 1 + scriptLen;
        }
    }
} else {
    console.log('Value not found in buffer');
}
