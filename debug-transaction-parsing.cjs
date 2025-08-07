const { Buffer } = require('buffer');

// Test data from BlockTest.ts - testSerial2
const tip = "01000000ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548170dafec26b25ed20a2c87d485de589c57fc1b32e65a37ea970feb15142b5f1a2a34856800000000ae470120000000000000000000000000cb16b4d62bdf6a05a961cf27a47355486891ebb9ee6892f8010000000100000000000000010100000001ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f055488b404ea4787ac1af3c007dc3462b9875d320ee983690b649d9c564da7a4c38d50000000049483045022100818570e724f91eb5d73b6a195c905fe7d56414cd39fef6aaba20d10f60402256022011f04e032d4bcd111218d07f32195e29f9e3dbb4ef517f91d596e248f84c08c201ffffffff0100000008016345785d8a000001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d7ab9d801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205da7d00000000";

console.log('=== Transaction Parsing Debug ===');

// Parse the original hex
const originalBuffer = Buffer.from(tip, 'hex');
console.log('Original buffer length:', originalBuffer.length);

// Parse header (160 bytes)
let offset = 160; // Skip header

console.log('\n=== After Header ===');
console.log('Offset:', offset);
console.log('First 20 bytes:', originalBuffer.slice(offset, offset + 20).toString('hex'));

// Parse transaction count (VarInt)
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

console.log('\n=== Transaction Count ===');
const txCountResult = readVarInt(originalBuffer, offset);
console.log('Transaction count:', txCountResult.value);
console.log('Bytes read for tx count:', txCountResult.bytesRead);

offset += txCountResult.bytesRead;
console.log('Offset after tx count:', offset);

// Parse first transaction
console.log('\n=== Transaction Parsing ===');
console.log('Transaction starts at offset:', offset);
console.log('First 50 bytes of transaction:', originalBuffer.slice(offset, offset + 50).toString('hex'));

// Transaction version (4 bytes)
const txVersion = originalBuffer.readUInt32LE(offset);
console.log('Transaction version:', txVersion);
offset += 4;

// Input count (VarInt)
const inputCountResult = readVarInt(originalBuffer, offset);
console.log('Input count:', inputCountResult.value);
console.log('Bytes read for input count:', inputCountResult.bytesRead);
offset += inputCountResult.bytesRead;

// Parse first input
console.log('\n=== First Input ===');
console.log('Input starts at offset:', offset);
console.log('First 50 bytes of input:', originalBuffer.slice(offset, offset + 50).toString('hex'));

// Previous transaction hash (32 bytes)
const prevTxHash = originalBuffer.slice(offset, offset + 32);
console.log('Previous tx hash:', prevTxHash.toString('hex'));
offset += 32;

// Output index (4 bytes)
const outputIndex = originalBuffer.readUInt32LE(offset);
console.log('Output index:', outputIndex);
offset += 4;

// Script length (VarInt)
const scriptLenResult = readVarInt(originalBuffer, offset);
console.log('Script length:', scriptLenResult.value);
console.log('Bytes read for script length:', scriptLenResult.bytesRead);
offset += scriptLenResult.bytesRead;

// Script bytes
const scriptBytes = originalBuffer.slice(offset, offset + Number(scriptLenResult.value));
console.log('Script bytes:', scriptBytes.toString('hex'));
offset += Number(scriptLenResult.value);

// Sequence (4 bytes)
const sequence = originalBuffer.readUInt32LE(offset);
console.log('Sequence:', sequence);
offset += 4;

console.log('\n=== After Input ===');
console.log('Offset after input:', offset);
console.log('Remaining bytes:', originalBuffer.length - offset);
console.log('First 50 bytes:', originalBuffer.slice(offset, offset + 50).toString('hex'));

// Output count (VarInt)
const outputCountResult = readVarInt(originalBuffer, offset);
console.log('Output count:', outputCountResult.value);
console.log('Bytes read for output count:', outputCountResult.bytesRead);
offset += outputCountResult.bytesRead;

// Parse first output
console.log('\n=== First Output ===');
console.log('Output starts at offset:', offset);
console.log('First 50 bytes of output:', originalBuffer.slice(offset, offset + 50).toString('hex'));

// Value (8 bytes)
const valueBytes = originalBuffer.slice(offset, offset + 8);
console.log('Value bytes:', valueBytes.toString('hex'));
let value = 0n;
for (let i = 0; i < 8; i++) {
    value += BigInt(valueBytes[i]) << BigInt(i * 8);
}
console.log('Value as bigint:', value.toString());
offset += 8;

// Token ID length (VarInt)
const tokenIdLenResult = readVarInt(originalBuffer, offset);
console.log('Token ID length:', tokenIdLenResult.value);
console.log('Bytes read for token ID length:', tokenIdLenResult.bytesRead);
offset += tokenIdLenResult.bytesRead;

// Token ID bytes
const tokenIdBytes = originalBuffer.slice(offset, offset + Number(tokenIdLenResult.value));
console.log('Token ID bytes:', tokenIdBytes.toString('hex'));
offset += Number(tokenIdLenResult.value);

// Script length (VarInt)
const outputScriptLenResult = readVarInt(originalBuffer, offset);
console.log('Output script length:', outputScriptLenResult.value);
console.log('Bytes read for output script length:', outputScriptLenResult.bytesRead);
offset += outputScriptLenResult.bytesRead;

// Output script bytes
const outputScriptBytes = originalBuffer.slice(offset, offset + Number(outputScriptLenResult.value));
console.log('Output script bytes:', outputScriptBytes.toString('hex'));
offset += Number(outputScriptLenResult.value);

console.log('\n=== Final Position ===');
console.log('Final offset:', offset);
console.log('Remaining bytes:', originalBuffer.length - offset);
console.log('Last 20 bytes:', originalBuffer.slice(offset).toString('hex'));
