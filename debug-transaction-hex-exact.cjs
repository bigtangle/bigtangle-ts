const { Buffer } = require('buffer');

// Test data from BlockTest.ts - testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');

console.log('=== Exact Transaction Output Analysis ===');
console.log('Buffer length:', buffer.length);

// Convert to hex for easier searching
const hex = buffer.toString('hex');
console.log('Full hex:', hex);

// Search for the expected value pattern: 1000000000000 in little-endian
// 1000000000000 = 0xE8D4A51000
// Little-endian: 00 10 A5 D4 E8 00 00 00
const expectedValueHex = '0010a5d4e8000000';
const valueIndex = hex.indexOf(expectedValueHex);

console.log('\nSearching for value:', expectedValueHex);
console.log('Found at position:', valueIndex);

if (valueIndex !== -1) {
    const byteOffset = valueIndex / 2;
    console.log('Byte offset:', byteOffset);
    
    // Show context around the value
    const start = Math.max(0, byteOffset - 20);
    const end = Math.min(buffer.length, byteOffset + 50);
    
    console.log('\nContext around value:');
    console.log('Hex:', hex.substring(start * 2, end * 2));
    
    // Extract the output bytes
    // Output format: value(8) + tokenIdLen(1) + tokenId + scriptLen(1) + script
    const outputStart = byteOffset - 8; // Value is 8 bytes
    const outputEnd = byteOffset + 50; // Get more context
    
    const outputBytes = buffer.slice(outputStart, outputEnd);
    console.log('\nOutput bytes:', outputBytes.toString('hex'));
    
    // Parse the output
    let pos = outputStart;
    
    console.log('\n=== Parsing Output ===');
    console.log('Output starts at:', pos);
    
    // Value
    const value = buffer.readBigUInt64LE(pos);
    console.log('Value:', value.toString());
    pos += 8;
    
    // Token ID length
    const tokenIdLen = buffer[pos];
    console.log('Token ID length:', tokenIdLen);
    pos += 1;
    
    // Token ID
    const tokenId = buffer.slice(pos, pos + tokenIdLen);
    console.log('Token ID:', tokenId.toString('hex'));
    pos += tokenIdLen;
    
    // Script length
    const scriptLen = buffer[pos];
    console.log('Script length:', scriptLen);
    pos += 1;
    
    // Script
    const script = buffer.slice(pos, pos + scriptLen);
    console.log('Script:', script.toString('hex'));
    pos += scriptLen;
    
    console.log('Output ends at:', pos);
    
    // Extract the exact output bytes
    const exactOutputBytes = buffer.slice(outputStart, pos);
    console.log('\n=== Exact Output Bytes ===');
    console.log('Exact output bytes:', exactOutputBytes.toString('hex'));
    console.log('Length:', exactOutputBytes.length);
    
    // Compare with expected
    console.log('\n=== Comparison ===');
    console.log('Expected:', expectedValueHex);
    console.log('Actual value bytes:', exactOutputBytes.slice(0, 8).toString('hex'));
    console.log('Match:', exactOutputBytes.slice(0, 8).toString('hex) === expectedValueHex);
    
    // Check if the full output matches Java serialization
    console.log('\n=== Java Serialization Check ===');
    console.log('Full output:', exactOutputBytes.toString('hex'));
    
    // The Java serialization should be the full output
    const javaExpected = '0010a5d4e8000000';
    console.log('Java expected:', javaExpected);
    console.log('Match:', exactOutputBytes.toString('hex') === javaExpected);
} else {
    console.log('Value not found, searching for alternative patterns...');
    
    // Search for parts of the value
    const patterns = [
        '10a5d4e8',
        'a5d4e800',
        'd4e80000',
        'e8000000'
    ];
    
    patterns.forEach(pattern => {
        const index = hex.indexOf(pattern);
        if (index !== -1) {
            console.log(`Found pattern ${pattern} at byte offset: ${index / 2}`);
        }
    });
}
