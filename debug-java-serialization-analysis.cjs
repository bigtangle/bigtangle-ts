const { Buffer } = require('buffer');

// Test data from BlockTest.ts - testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');

console.log('=== Java Serialization Analysis ===');
console.log('Total buffer length:', buffer.length);

// Block header (80 bytes)
console.log('\n=== Block Header ===');
console.log('Version:', buffer.readUInt32LE(0));
console.log('Previous block hash:', buffer.slice(4, 36).toString('hex'));
console.log('Merkle root:', buffer.slice(36, 68).toString('hex'));
console.log('Timestamp:', buffer.readUInt32LE(68));
console.log('Difficulty target:', buffer.readUInt32LE(72));
console.log('Nonce:', buffer.readUInt32LE(76));

// Transaction count (VarInt)
let offset = 80;
const txCount = readVarInt(buffer, offset);
console.log('\n=== Transaction Count ===');
console.log('Transaction count:', txCount.value);
offset += txCount.bytesRead;

// Parse first transaction
console.log('\n=== First Transaction ===');
console.log('Transaction offset:', offset);

// Transaction version
const txVersion = buffer.readUInt32LE(offset);
console.log('Transaction version:', txVersion);
offset += 4;

// Input count
const inputCount = readVarInt(buffer, offset);
console.log('Input count:', inputCount.value);
offset += inputCount.bytesRead;

// Parse first input
console.log('\n=== First Input ===');
console.log('Input offset:', offset);
const txHash = buffer.slice(offset, offset + 32).toString('hex');
console.log('Previous tx hash:', txHash);
offset += 32;

const outputIndex = buffer.readUInt32LE(offset);
console.log('Output index:', outputIndex);
offset += 4;

// Script length
const scriptLen = readVarInt(buffer, offset);
console.log('Script length:', scriptLen.value);
offset += scriptLen.bytesRead;

const script = buffer.slice(offset, offset + scriptLen.value);
console.log('Script:', script.toString('hex'));
offset += scriptLen.value;

// Sequence
const sequence = buffer.readUInt32LE(offset);
console.log('Sequence:', sequence);
offset += 4;

// Output count
const outputCount = readVarInt(buffer, offset);
console.log('\n=== Output Count ===');
console.log('Output count:', outputCount.value);
offset += outputCount.bytesRead;

// Parse first output
console.log('\n=== First Output ===');
console.log('Output offset:', offset);

// Value - this is where the issue might be
// In Java, this might be fixed 8 bytes instead of VarInt
const valueBytes = buffer.slice(offset, offset + 8);
const value = valueBytes.readBigUInt64LE(0);
console.log('Value (fixed 8 bytes):', value.toString());
offset += 8;

// Token ID - this might be the issue
// Check if it's VarInt length + bytes or fixed format
const tokenLen = readVarInt(buffer, offset);
console.log('Token ID length (VarInt):', tokenLen.value);
offset += tokenLen.bytesRead;

const tokenId = buffer.slice(offset, offset + tokenLen.value);
console.log('Token ID:', tokenId.toString('hex'));
offset += tokenLen.value;

// Script length
const outputScriptLen = readVarInt(buffer, offset);
console.log('Output script length:', outputScriptLen.value);
offset += outputScriptLen.bytesRead;

const outputScript = buffer.slice(offset, offset + outputScriptLen.value);
console.log('Output script:', outputScript.toString('hex'));
offset += outputScriptLen.value;

console.log('\n=== Remaining bytes ===');
console.log('Remaining bytes:', buffer.length - offset);
console.log('Remaining hex:', buffer.slice(offset).toString('hex'));

function readVarInt(buffer, offset) {
    const firstByte = buffer[offset];
    if (firstByte < 0xfd) {
        return { value: firstByte, bytesRead: 1 };
    } else if (firstByte === 0xfd) {
        return { value: buffer.readUInt16LE(offset + 1), bytesRead: 3 };
    } else if (firstByte === 0xfe) {
        return { value: buffer.readUInt32LE(offset + 1), bytesRead: 5 };
    } else {
        const high = buffer.readUInt32LE(offset + 1);
        const low = buffer.readUInt32LE(offset + 5);
        return { value: (BigInt(high) << 32n) | BigInt(low), bytesRead: 9 };
    }
}
