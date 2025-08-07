const { Buffer } = require('buffer');

// Test data from BlockTest.ts - testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');

console.log('=== Finding Transaction Output Position ===');

// Skip block header (80 bytes)
let offset = 80;

// Transaction count (VarInt)
function readVarInt(buf, pos) {
    const firstByte = buf[pos];
    if (firstByte < 0xfd) {
        return { value: firstByte, bytesRead: 1 };
    } else if (firstByte === 0xfd) {
        return { value: buf.readUInt16LE(pos + 1), bytesRead: 3 };
    } else if (firstByte === 0xfe) {
        return { value: buf.readUInt32LE(pos + 1), bytesRead: 5 };
    } else {
        const high = buf.readUInt32LE(pos + 1);
        const low = buf.readUInt32LE(pos + 5);
        return { value: (BigInt(high) << 32n) | BigInt(low), bytesRead: 9 };
    }
}

// Let's find the transaction output by looking for the pattern
console.log('Looking for transaction output pattern...');

// The transaction output should contain:
// 1. Value (8 bytes)
// 2. Token ID (VarInt + bytes)
// 3. Script (VarInt + bytes)

// Let's search for the actual transaction output
// We know the expected value from the test: 1000000000000
const expectedValue = 1000000000000n;
const expectedValueBytes = Buffer.alloc(8);
expectedValueBytes.writeBigUInt64LE(expectedValue);

console.log('Expected value bytes:', expectedValueBytes.toString('hex'));

// Search for the value in the buffer
for (let i = 80; i < buffer.length - 8; i++) {
    if (buffer.slice(i, i + 8).equals(expectedValueBytes)) {
        console.log(`Found expected value at offset ${i}`);
        
        // Now let's parse from this position
        let pos = i;
        
        // Value (8 bytes)
        const value = buffer.readBigUInt64LE(pos);
        console.log('Value:', value.toString());
        pos += 8;
        
        // Token ID
        const tokenIdLen = readVarInt(buffer, pos);
        console.log('Token ID length:', tokenIdLen.value);
        pos += tokenIdLen.bytesRead;
        
        const tokenId = buffer.slice(pos, pos + tokenIdLen.value);
        console.log('Token ID:', tokenId.toString('hex'));
        pos += tokenIdLen.value;
        
        // Script
        const scriptLen = readVarInt(buffer, pos);
        console.log('Script length:', scriptLen.value);
        pos += scriptLen.bytesRead;
        
        const script = buffer.slice(pos, pos + scriptLen.value);
        console.log('Script:', script.toString('hex'));
        
        console.log('Total output length:', pos + scriptLen.value - i);
        break;
    }
}

// Let's also look at the actual transaction structure
console.log('\n=== Transaction Structure Analysis ===');
offset = 80;

// Transaction count
const txCount = readVarInt(buffer, offset);
console.log('Transaction count:', txCount.value);
offset += txCount.bytesRead;

// Transaction version
const txVersion = buffer.readUInt32LE(offset);
console.log('Transaction version:', txVersion);
offset += 4;

// Input count
const inputCount = readVarInt(buffer, offset);
console.log('Input count:', inputCount.value);
offset += inputCount.bytesRead;

console.log('\nSkipping inputs...');
for (let i = 0; i < inputCount.value; i++) {
    offset += 32; // tx hash
    offset += 4;  // output index
    const scriptLen = readVarInt(buffer, offset);
    offset += scriptLen.bytesRead + scriptLen.value;
    offset += 4;  // sequence
    console.log(`Input ${i + 1} skipped, offset now:`, offset);
}

// Output count
const outputCount = readVarInt(buffer, offset);
console.log('\nOutput count:', outputCount.value);
offset += outputCount.bytesRead;

console.log('\n=== Parsing Outputs ===');
for (let i = 0; i < outputCount.value; i++) {
    console.log(`\nOutput ${i + 1}:`);
    console.log('Starts at offset:', offset);
    
    // Value (8 bytes)
    const value = buffer.readBigUInt64LE(offset);
    console.log('Value:', value.toString());
    offset += 8;
    
    // Token ID
    const tokenIdLen = readVarInt(buffer, offset);
    console.log('Token ID length:', tokenIdLen.value);
    offset += tokenIdLen.bytesRead;
    
    const tokenId = buffer.slice(offset, offset + tokenIdLen.value);
    console.log('Token ID:', tokenId.toString('hex'));
    offset += tokenIdLen.value;
    
    // Script
    const scriptLen = readVarInt(buffer, offset);
    console.log('Script length:', scriptLen.value);
    offset += scriptLen.bytesRead;
    
    const script = buffer.slice(offset, offset + scriptLen.value);
    console.log('Script:', script.toString('hex'));
    offset += scriptLen.value;
    
    console.log('Output length:', offset - (offset - 8 - tokenIdLen.bytesRead - tokenIdLen.value - scriptLen.bytesRead - scriptLen.value));
}
