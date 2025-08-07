const { Buffer } = require('buffer');

// Test data from testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');

// Search for 100000000 in different encodings
const targetValue = 100000000;

console.log('=== Searching for 100000000 in different encodings ===');

// 1. Little-endian 8-byte encoding (what we expect)
const le8Bytes = Buffer.alloc(8);
le8Bytes.writeBigUInt64LE(BigInt(targetValue));
console.log('Little-endian 8-byte:', le8Bytes.toString('hex'));

// 2. Big-endian 8-byte encoding
const be8Bytes = Buffer.alloc(8);
be8Bytes.writeBigUInt64BE(BigInt(targetValue));
console.log('Big-endian 8-byte:', be8Bytes.toString('hex'));

// 3. Java BigInteger encoding (minimal bytes)
function encodeJavaBigInt(value) {
    if (value === 0) return Buffer.from([0]);
    
    let val = BigInt(value);
    const bytes = [];
    
    while (val > 0n) {
        bytes.unshift(Number(val & 0xFFn));
        val = val >> 8n;
    }
    
    // Remove leading zeros
    while (bytes.length > 1 && bytes[0] === 0) {
        bytes.shift();
    }
    
    return Buffer.from(bytes);
}

const javaEncoding = encodeJavaBigInt(targetValue);
console.log('Java BigInteger encoding:', javaEncoding.toString('hex'));

// 4. 4-byte little-endian
const le4Bytes = Buffer.alloc(4);
le4Bytes.writeUInt32LE(targetValue);
console.log('Little-endian 4-byte:', le4Bytes.toString('hex'));

// 5. 4-byte big-endian
const be4Bytes = Buffer.alloc(4);
be4Bytes.writeUInt32BE(targetValue);
console.log('Big-endian 4-byte:', be4Bytes.toString('hex'));

// Search for each encoding in the buffer
const hexStr = buffer.toString('hex');

console.log('\n=== Search Results ===');
const encodings = [
    { name: 'LE 8-byte', bytes: le8Bytes },
    { name: 'BE 8-byte', bytes: be8Bytes },
    { name: 'Java BigInt', bytes: javaEncoding },
    { name: 'LE 4-byte', bytes: le4Bytes },
    { name: 'BE 4-byte', bytes: be4Bytes }
];

encodings.forEach(({ name, bytes }) => {
    const hex = bytes.toString('hex');
    const pos = hexStr.indexOf(hex);
    console.log(`${name}: ${hex} - Found at: ${pos}`);
});

// Let's also look at the actual transaction output structure
console.log('\n=== Transaction Output Structure Analysis ===');

// Find the transaction outputs section
// After the block header and transaction inputs, we should have outputs
// Let's search for the pattern around the expected value

// The value 100000000 should be in the transaction output
// Let's look for the pattern: [value][token][script]

// Scan the buffer for possible output structures
function scanForOutputs() {
    console.log('Scanning buffer for output structures...');
    
    // Look for patterns that might indicate transaction outputs
    for (let i = 0; i < buffer.length - 20; i++) {
        // Try to interpret bytes starting at position i as a transaction output
        
        try {
            let pos = i;
            
            // Read value (8 bytes little-endian)
            if (pos + 8 > buffer.length) continue;
            const value = buffer.readBigUInt64LE(pos);
            pos += 8;
            
            // Read token ID length (VarInt)
            if (pos >= buffer.length) continue;
            let tokenLen = 0;
            let shift = 0;
            let bytesRead = 0;
            let byte;
            
            do {
                if (pos + bytesRead >= buffer.length) break;
                byte = buffer[pos + bytesRead];
                tokenLen |= (byte & 0x7F) << shift;
                shift += 7;
                bytesRead++;
            } while ((byte & 0x80) !== 0 && bytesRead < 9);
            
            pos += bytesRead;
            
            if (pos + tokenLen > buffer.length) continue;
            pos += tokenLen;
            
            // Read script length (VarInt)
            let scriptLen = 0;
            shift = 0;
            bytesRead = 0;
            
            do {
                if (pos + bytesRead >= buffer.length) break;
                byte = buffer[pos + bytesRead];
                scriptLen |= (byte & 0x7F) << shift;
                shift += 7;
                bytesRead++;
            } while ((byte & 0x80) !== 0 && bytesRead < 9);
            
            pos += bytesRead;
            
            if (pos + scriptLen > buffer.length) continue;
            
            // If we get here, we found a valid-looking transaction output
            console.log(`Found possible output at position ${i}:`);
            console.log(`  Value: ${value.toString()}`);
            console.log(`  Token length: ${tokenLen}`);
            console.log(`  Script length: ${scriptLen}`);
            
            if (value === 100000000n) {
                console.log(`  *** FOUND 100000000 at position ${i} ***`);
                console.log(`  Bytes: ${buffer.slice(i, i + 8).toString('hex')}`);
                return i;
            }
            
        } catch (e) {
            // Continue scanning
        }
    }
    
    return -1;
}

const foundPos = scanForOutputs();
console.log(`Final result: 100000000 found at position ${foundPos}`);

// Let's also examine the actual bytes at the found position
if (foundPos >= 0) {
    console.log('\n=== Detailed Analysis at Found Position ===');
    console.log(`Position: ${foundPos}`);
    console.log(`Value bytes: ${buffer.slice(foundPos, foundPos + 8).toString('hex')}`);
    console.log(`Value: ${buffer.readBigUInt64LE(foundPos).toString()}`);
    
    // Show surrounding bytes
    const start = Math.max(0, foundPos - 10);
    const end = Math.min(buffer.length, foundPos + 30);
    console.log(`Surrounding bytes: ${buffer.slice(start, end).toString('hex')}`);
}
