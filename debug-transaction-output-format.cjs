const { Buffer } = require('buffer');

// Test data from BlockTest.ts - testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');

console.log('=== Transaction Output Format Analysis ===');

// Skip block header (80 bytes)
let offset = 80;

// Transaction count
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

// Skip first input
offset += 32; // tx hash
offset += 4;  // output index
const scriptLen1 = readVarInt(buffer, offset);
offset += scriptLen1.bytesRead + scriptLen1.value;
offset += 4;  // sequence

// Output count
const outputCount = readVarInt(buffer, offset);
console.log('Output count:', outputCount.value);
offset += outputCount.bytesRead;

console.log('\n=== First Output Analysis ===');
console.log('Output starts at offset:', offset);

// Now analyze the output format
console.log('Bytes at output start:', buffer.slice(offset, offset + 32).toString('hex'));

// Try different formats:
// 1. Fixed 8-byte value (like Bitcoin)
const fixedValue = buffer.readBigUInt64LE(offset);
console.log('Fixed 8-byte value:', fixedValue.toString());
console.log('Fixed 8-byte value hex:', buffer.slice(offset, offset + 8).toString('hex'));

// 2. VarInt value format (current implementation)
const valueLen = readVarInt(buffer, offset);
console.log('VarInt value length:', valueLen.value);

// 3. Check if there's a token ID
const tokenStart = offset + 8; // After fixed 8-byte value
console.log('Token ID start bytes:', buffer.slice(tokenStart, tokenStart + 10).toString('hex'));

// 4. Check for script length
const scriptLenPos = tokenStart + 1; // Assuming 1 byte token ID
const scriptLen = readVarInt(buffer, scriptLenPos);
console.log('Script length at position', scriptLenPos, ':', scriptLen.value);

// Let's manually parse the expected format
console.log('\n=== Manual Parsing ===');
let pos = offset;

// Value (8 bytes fixed)
const value = buffer.readBigUInt64LE(pos);
console.log('Value:', value.toString());
pos += 8;

// Token ID (1 byte for BIGTANGLE token)
const tokenId = buffer.slice(pos, pos + 1);
console.log('Token ID:', tokenId.toString('hex'));
pos += 1;

// Script length
const scriptLength = readVarInt(buffer, pos);
console.log('Script length:', scriptLength.value);
pos += scriptLength.bytesRead;

// Script
const script = buffer.slice(pos, pos + scriptLength.value);
console.log('Script:', script.toString('hex'));
pos += scriptLength.value;

console.log('Total output length:', pos - offset);
