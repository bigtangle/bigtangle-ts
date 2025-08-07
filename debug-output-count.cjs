const { Buffer } = require('buffer');

// Test data from BlockTest.ts - testSerial2
const tip = "01000000ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548170dafec26b25ed20a2c87d485de589c57fc1b32e65a37ea970feb15142b5f1a2a34856800000000ae470120000000000000000000000000cb16b4d62bdf6a05a961cf27a47355486891ebb9ee6892f8010000000100000000000000010100000001ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f055488b404ea4787ac1af3c007dc3462b9875d320ee983690b649d9c564da7a4c38d50000000049483045022100818570e724f91eb5d73b6a195c905fe7d56414cd39fef6aaba20d10f60402256022011f04e032d4bcd111218d07f32195e29f9e3dbb4ef517f91d596e248f84c08c201ffffffff0100000008016345785d8a000001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d7ab9d801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205da7d00000000";

console.log('=== Output Count Debug ===');

// Parse the original hex
const originalBuffer = Buffer.from(tip, 'hex');
console.log('Original buffer length:', originalBuffer.length);

// Parse header (160 bytes)
let offset = 160; // Skip header

console.log('\n=== After Header ===');
console.log('Offset:', offset);
console.log('Byte at offset:', '0x' + originalBuffer[offset].toString(16));

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

// Transaction version (4 bytes)
const txVersion = originalBuffer.readUInt32LE(offset);
console.log('Transaction version:', txVersion);
offset += 4;

// Input count (VarInt)
const inputCountResult = readVarInt(originalBuffer, offset);
console.log('Input count:', inputCountResult.value);
console.log('Bytes read for input count:', inputCountResult.bytesRead);
offset += inputCountResult.bytesRead;

// Skip inputs (we know there's 1 input)
console.log('\n=== Skipping Input Parsing ===');
// Previous tx hash (32 bytes) + output index (4 bytes) + script length (1 byte) + script (120 bytes) + sequence (4 bytes)
offset += 32 + 4 + 1 + 120 + 4;
console.log('Offset after input:', offset);

// Output count (VarInt)
console.log('\n=== Output Count ===');
console.log('Byte at offset:', '0x' + originalBuffer[offset].toString(16));
console.log('First 10 bytes at output count position:', originalBuffer.slice(offset, offset + 10).toString('hex'));

const outputCountResult = readVarInt(originalBuffer, offset);
console.log('Output count:', outputCountResult.value);
console.log('Bytes read for output count:', outputCountResult.bytesRead);
offset += outputCountResult.bytesRead;

console.log('Offset after output count:', offset);

// Check what's actually at this position
console.log('\n=== What should be the first output ===');
console.log('First 20 bytes:', originalBuffer.slice(offset, offset + 20).toString('hex'));

// Parse first output manually
console.log('\n=== Manual First Output Parsing ===');
let outputOffset = offset;

// Value (8 bytes)
const valueBytes = originalBuffer.slice(outputOffset, outputOffset + 8);
console.log('Value bytes:', valueBytes.toString('hex'));
let value = 0n;
for (let i = 0; i < 8; i++) {
    value += BigInt(valueBytes[i]) << BigInt(i * 8);
}
console.log('Value as bigint:', value.toString());
outputOffset += 8;

// Token ID length (VarInt)
const tokenIdLenResult = readVarInt(originalBuffer, outputOffset);
console.log('Token ID length:', tokenIdLenResult.value);
console.log('Bytes read for token ID length:', tokenIdLenResult.bytesRead);
outputOffset += tokenIdLenResult.bytesRead;

// Token ID bytes
const tokenIdBytes = originalBuffer.slice(outputOffset, outputOffset + Number(tokenIdLenResult.value));
console.log('Token ID bytes (first 20):', tokenIdBytes.slice(0, 20).toString('hex'));
outputOffset += Number(tokenIdLenResult.value);

// Script length (VarInt)
const outputScriptLenResult = readVarInt(originalBuffer, outputOffset);
console.log('Output script length:', outputScriptLenResult.value);
console.log('Bytes read for output script length:', outputScriptLenResult.bytesRead);
outputOffset += outputScriptLenResult.bytesRead;

// Output script bytes
const outputScriptBytes = originalBuffer.slice(outputOffset, outputOffset + Number(outputScriptLenResult.value));
console.log('Output script bytes (first 20):', outputScriptBytes.slice(0, 20).toString('hex'));
outputOffset += Number(outputScriptLenResult.value);

console.log('Final offset after first output:', outputOffset);

// Check what's left
console.log('\n=== Remaining Data ===');
console.log('Remaining bytes:', originalBuffer.length - outputOffset);
console.log('Remaining data (hex):', originalBuffer.slice(outputOffset).toString('hex'));
console.log('Remaining data (ASCII):', originalBuffer.slice(outputOffset).toString('ascii'));
