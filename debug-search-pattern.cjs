const { Buffer } = require('buffer');

// Test data from BlockTest.ts - testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');

console.log('=== Searching for Value Patterns ===');
console.log('Buffer length:', buffer.length);

// The expected value from Java: 1000000000000 satoshi
const expectedValue = 1000000000000n;
console.log('Expected value:', expectedValue.toString());

// Convert to little-endian bytes
const valueBytes = Buffer.allocUnsafe(8);
valueBytes.writeBigUInt64LE(expectedValue);
console.log('Expected value bytes (LE):', valueBytes.toString('hex'));

// Search in the buffer
const hex = buffer.toString('hex');
const searchHex = valueBytes.toString('hex');
const pos = hex.indexOf(searchHex);

console.log('\nSearching for:', searchHex);
console.log('Found at position:', pos !== -1 ? pos / 2 : 'Not found');

// Let's also search for the big-endian version
const beBytes = Buffer.allocUnsafe(8);
beBytes.writeBigUInt64BE(expectedValue);
console.log('Expected value bytes (BE):', beBytes.toString('hex'));

const bePos = hex.indexOf(beBytes.toString('hex'));
console.log('Big-endian found at:', bePos !== -1 ? bePos / 2 : 'Not found');

// Let's examine the actual transaction data more carefully
console.log('\n=== Examining Transaction Data ===');

// Skip block header (80 bytes)
let offset = 80;

// Look at the raw bytes around where we expect the transaction
console.log('Raw bytes around transaction start:');
console.log(buffer.slice(offset, offset + 100).toString('hex'));

// Let's find the transaction by looking for the output pattern
// Transaction outputs have value (8 bytes) + token info
console.log('\n=== Looking for Output Patterns ===');

// Search for any 8-byte values that might be amounts
for (let i = offset; i < buffer.length - 8; i++) {
    const value = buffer.readBigUInt64LE(i);
    if (value > 0 && value < 10000000000000n) { // Reasonable range
        console.log(`Found value ${value} at offset ${i}`);
        
        // Check if this looks like an output
        if (i + 8 < buffer.length) {
            const nextByte = buffer[i + 8];
            if (nextByte < 50) { // Reasonable token ID length
                console.log(`  Possible output at ${i}, token ID len: ${nextByte}`);
                
                // Show context
                const context = buffer.slice(Math.max(0, i - 10), Math.min(buffer.length, i + 50));
                console.log(`  Context: ${context.toString('hex')}`);
                
                // Check if this matches our expected value
                if (value === expectedValue) {
                    console.log(`  *** MATCH FOUND ***`);
                    
                    // Extract the full output
                    let pos = i + 8;
                    const tokenIdLen = buffer[pos];
                    pos += 1;
                    const tokenId = buffer.slice(pos, pos + tokenIdLen);
                    pos += tokenIdLen;
                    
                    const scriptLen = buffer[pos];
                    pos += 1;
                    const script = buffer.slice(pos, pos + scriptLen);
                    
                    console.log(`  Token ID: ${tokenId.toString('hex')}`);
                    console.log(`  Script: ${script.toString('hex')}`);
                    
                    const outputBytes = buffer.slice(i, pos + scriptLen);
                    console.log(`  Full output: ${outputBytes.toString('hex')}`);
                    
                    // Compare with Java expected
                    const javaExpected = '0010a5d4e8000000';
                    console.log(`  Java expected: ${javaExpected}`);
                    console.log(`  Match: ${outputBytes.toString('hex') === javaExpected}`);
                    
                    break;
                }
            }
        }
    }
}

// Let's also check if the Java expected value is actually correct
console.log('\n=== Checking Java Expected Value ===');
console.log('Java expected:', '0010a5d4e8000000');
console.log('As big-endian value:', Buffer.from('0010a5d4e8000000', 'hex').readBigUInt64BE().toString());
console.log('As little-endian value:', Buffer.from('0010a5d4e8000000', 'hex').readBigUInt64LE().toString());
