const { Buffer } = require('buffer');

// Test data from BlockTest.ts - testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');

console.log('=== Transaction Structure Analysis ===');
console.log('Buffer length:', buffer.length);

// Skip block header (80 bytes)
let offset = 80;

// Transaction count (VarInt) - but this might be wrong
// Let's manually parse the transaction

// Function to read VarInt safely
function readVarInt(buf, pos) {
    if (pos >= buf.length) return { value: 0, bytesRead: 0, error: true };
    
    const firstByte = buf[pos];
    if (firstByte < 0xfd) {
        return { value: firstByte, bytesRead: 1 };
    } else if (firstByte === 0xfd) {
        if (pos + 3 > buf.length) return { value: 0, bytesRead: 0, error: true };
        return { value: buf.readUInt16LE(pos + 1), bytesRead: 3 };
    } else if (firstByte === 0xfe) {
        if (pos + 5 > buf.length) return { value: 0, bytesRead: 0, error: true };
        return { value: buf.readUInt32LE(pos + 1), bytesRead: 5 };
    } else {
        if (pos + 9 > buf.length) return { value: 0, bytesRead: 0, error: true };
        const high = buf.readUInt32LE(pos + 1);
        const low = buf.readUInt32LE(pos + 5);
        return { value: (BigInt(high) << 32n) | BigInt(low), bytesRead: 9 };
    }
}

// Let's look at the bytes starting from offset 80
console.log('\nBytes from offset 80:', buffer.slice(80, 120).toString('hex'));

// Try to parse transaction count
let txCount = readVarInt(buffer, offset);
console.log('Transaction count at offset 80:', txCount);

// But this might be wrong - let's look for the actual transaction
// The transaction should start with version (4 bytes) followed by input count

// Look for transaction version pattern
for (let i = 80; i < 100; i++) {
    const version = buffer.readUInt32LE(i);
    if (version === 1 || version === 2 || version === 4239224357) {
        console.log(`Found possible transaction version ${version} at offset ${i}`);
        
        // Try to parse transaction from here
        let pos = i;
        
        // Version
        console.log('Version:', buffer.readUInt32LE(pos));
        pos += 4;
        
        // Input count
        const inputCount = readVarInt(buffer, pos);
        if (!inputCount.error) {
            console.log('Input count:', inputCount.value);
            pos += inputCount.bytesRead;
            
            // Skip inputs
            for (let j = 0; j < inputCount.value && j < 5; j++) {
                if (pos + 36 > buffer.length) break;
                
                // Previous tx hash (32 bytes)
                const txHash = buffer.slice(pos, pos + 32).toString('hex');
                pos += 32;
                
                // Output index (4 bytes)
                const outputIndex = buffer.readUInt32LE(pos);
                pos += 4;
                
                // Script length
                const scriptLen = readVarInt(buffer, pos);
                if (scriptLen.error) break;
                
                pos += scriptLen.bytesRead + scriptLen.value;
                pos += 4; // sequence
                
                console.log(`Input ${j + 1}: txHash=${txHash.substring(0, 16)}..., outputIndex=${outputIndex}`);
            }
            
            // Output count
            if (pos < buffer.length) {
                const outputCount = readVarInt(buffer, pos);
                if (!outputCount.error) {
                    console.log('Output count:', outputCount.value);
                    pos += outputCount.bytesRead;
                    
                    // Parse outputs
                    console.log('\n=== Parsing Outputs ===');
                    for (let k = 0; k < outputCount.value && k < 5; k++) {
                        if (pos + 8 > buffer.length) break;
                        
                        console.log(`\nOutput ${k + 1}:`);
                        console.log('Starts at offset:', pos);
                        
                        // Value (8 bytes)
                        const value = buffer.readBigUInt64LE(pos);
                        console.log('Value:', value.toString());
                        pos += 8;
                        
                        // Token ID
                        const tokenIdLen = readVarInt(buffer, pos);
                        if (tokenIdLen.error) break;
                        
                        console.log('Token ID length:', tokenIdLen.value);
                        pos += tokenIdLen.bytesRead;
                        
                        if (pos + tokenIdLen.value > buffer.length) break;
                        const tokenId = buffer.slice(pos, pos + tokenIdLen.value);
                        console.log('Token ID:', tokenId.toString('hex'));
                        pos += tokenIdLen.value;
                        
                        // Script
                        const scriptLen = readVarInt(buffer, pos);
                        if (scriptLen.error) break;
                        
                        console.log('Script length:', scriptLen.value);
                        pos += scriptLen.bytesRead;
                        
                        if (pos + scriptLen.value > buffer.length) break;
                        const script = buffer.slice(pos, pos + scriptLen.value);
                        console.log('Script:', script.toString('hex'));
                        pos += scriptLen.value;
                        
                        console.log('Output ends at offset:', pos);
                        
                        // Check if this matches expected values
                        if (value === 1000000000000n) {
                            console.log('*** FOUND EXPECTED VALUE 1000000000000 ***');
                        }
                    }
                }
            }
        }
    }
}
