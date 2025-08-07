const { Buffer } = require('buffer');

// Test data from BlockTest.ts - testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');

console.log('=== Analyzing Test Data Structure ===');
console.log('Buffer length:', buffer.length);

// Skip block header (80 bytes)
let offset = 80;
console.log('\n=== Block Header (80 bytes) ===');
console.log('Header:', buffer.slice(0, 80).toString('hex'));

console.log('\n=== Transaction Data ===');
console.log('Transaction starts at offset:', offset);

// Transaction version (4 bytes)
const version = buffer.readUInt32LE(offset);
console.log('Version:', version);
offset += 4;

// Input count (VarInt)
const inputCount = buffer[offset];
console.log('Input count:', inputCount);
offset += 1;

console.log('\n=== First Input ===');
// Previous tx hash (32 bytes)
const prevHash = buffer.slice(offset, offset + 32).toString('hex');
console.log('Previous tx hash:', prevHash);
offset += 32;

// Output index (4 bytes)
const outputIndex = buffer.readUInt32LE(offset);
console.log('Output index:', outputIndex);
offset += 4;

// Script length (VarInt)
const scriptLen = buffer[offset];
console.log('Script length:', scriptLen);
offset += 1;

// Script
const script = buffer.slice(offset, offset + scriptLen).toString('hex');
console.log('Script:', script);
offset += scriptLen;

// Sequence (4 bytes)
const sequence = buffer.readUInt32LE(offset);
console.log('Sequence:', sequence);
offset += 4;

console.log('\n=== Output Section ===');
// Output count (VarInt)
const outputCount = buffer[offset];
console.log('Output count:', outputCount);
offset += 1;

console.log('\n=== First Output Analysis ===');
console.log('Output starts at offset:', offset);

// Let's examine the raw bytes at the output position
console.log('Raw bytes at output start:', buffer.slice(offset, offset + 50).toString('hex'));

// The Java expected value is 1000000000000 satoshi
const expectedValue = 1000000000000n;
console.log('Expected value:', expectedValue.toString());

// Let's try to find where the value is stored
// In Bitcoin format, value is 8 bytes little-endian
for (let i = offset; i < offset + 20; i++) {
    if (i + 8 <= buffer.length) {
        const value = buffer.readBigUInt64LE(i);
        if (value === expectedValue) {
            console.log(`\n*** FOUND EXPECTED VALUE at offset ${i} ***`);
            console.log('Value bytes (LE):', buffer.slice(i, i + 8).toString('hex'));
            
            // Check what follows
            const nextByte = buffer[i + 8];
            console.log('Next byte (token/script length?):', nextByte);
            
            if (nextByte < 50) { // Reasonable length
                const tokenLen = nextByte;
                console.log('Token ID length:', tokenLen);
                
                if (i + 9 + tokenLen < buffer.length) {
                    const tokenId = buffer.slice(i + 9, i + 9 + tokenLen).toString('hex');
                    console.log('Token ID:', tokenId);
                    
                    const scriptLenPos = i + 9 + tokenLen;
                    if (scriptLenPos < buffer.length) {
                        const scriptLen = buffer[scriptLenPos];
                        console.log('Script length:', scriptLen);
                        
                        if (scriptLenPos + 1 + scriptLen <= buffer.length) {
                            const script = buffer.slice(scriptLenPos + 1, scriptLenPos + 1 + scriptLen).toString('hex');
                            console.log('Script:', script);
                            
                            const fullOutput = buffer.slice(i, scriptLenPos + 1 + scriptLen);
                            console.log('Full output bytes:', fullOutput.toString('hex'));
                            console.log('Full output length:', fullOutput.length);
                            
                            // Compare with Java expected
                            const javaExpected = '0010a5d4e8000000';
                            console.log('Java expected:', javaExpected);
                            console.log('Match:', fullOutput.toString('hex') === javaExpected);
                        }
                    }
                }
            }
            break;
        }
    }
}

// Let's also check if the format is different - maybe it's using VarInt for value
console.log('\n=== Checking VarInt format ===');
let cursor = offset;
try {
    // Read value length (VarInt)
    const valueLen = buffer[cursor];
    console.log('Value length (VarInt):', valueLen);
    cursor += 1;
    
    if (cursor + valueLen <= buffer.length) {
        const valueBytes = buffer.slice(cursor, cursor + valueLen);
        console.log('Value bytes:', valueBytes.toString('hex'));
        
        // Convert to bigint
        let value = 0n;
        for (let i = 0; i < valueBytes.length; i++) {
            value += BigInt(valueBytes[i]) << BigInt(8 * i);
        }
        console.log('Value:', value.toString());
        
        cursor += valueLen;
        
        // Read token length
        const tokenLen = buffer[cursor];
        console.log('Token length:', tokenLen);
        cursor += 1;
        
        if (cursor + tokenLen <= buffer.length) {
            const tokenBytes = buffer.slice(cursor, cursor + tokenLen).toString('hex');
            console.log('Token bytes:', tokenBytes);
            
            cursor += tokenLen;
            
            // Read script length
            const scriptLen = buffer[cursor];
            console.log('Script length:', scriptLen);
            cursor += 1;
            
            if (cursor + scriptLen <= buffer.length) {
                const scriptBytes = buffer.slice(cursor, cursor + scriptLen).toString('hex');
                console.log('Script bytes:', scriptBytes);
                
                const fullOutput = buffer.slice(offset, cursor + scriptLen);
                console.log('Full output (VarInt format):', fullOutput.toString('hex'));
                console.log('Length:', fullOutput.length);
            }
        }
    }
} catch (e) {
    console.log('Error parsing VarInt format:', e.message);
}

console.log('\n=== Java Expected Analysis ===');
const javaExpected = '0010a5d4e8000000';
console.log('Java expected hex:', javaExpected);
console.log('Length:', javaExpected.length / 2);

// Check if this appears in the buffer
const pos = buffer.toString('hex').indexOf(javaExpected);
console.log('Found in buffer at position:', pos !== -1 ? pos / 2 : 'Not found');

if (pos !== -1) {
    console.log('Context around found position:');
    const start = Math.max(0, pos - 10);
    const end = Math.min(buffer.length, pos + javaExpected.length + 10);
    console.log(buffer.slice(start, end).toString('hex'));
}
