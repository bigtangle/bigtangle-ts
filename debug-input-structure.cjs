const { Buffer } = require('buffer');

// Test data from BlockTest.ts - testSerial2
const tip = "01000000ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548170dafec26b25ed20a2c87d485de589c57fc1b32e65a37ea970feb15142b5f1a2a34856800000000ae470120000000000000000000000000cb16b4d62bdf6a05a961cf27a47355486891ebb9ee6892f8010000000100000000000000010100000001ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f055488b404ea4787ac1af3c007dc3462b9875d320ee983690b649d9c564da7a4c38d50000000049483045022100818570e724f91eb5d73b6a195c905fe7d56414cd39fef6aaba20d10f60402256022011f04e032d4bcd111218d07f32195e29f9e3dbb4ef517f91d596e248f84c08c201ffffffff0100000008016345785d8a000001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d7ab9d801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205da7d00000000";

console.log('=== Input Structure Debug ===');

// Parse the original hex
const originalBuffer = Buffer.from(tip, 'hex');
console.log('Original buffer length:', originalBuffer.length);

// Start parsing from the beginning of the transaction
let offset = 161; // Start of transaction (after header and tx count)
console.log('\n=== Transaction Start ===');
console.log('Transaction starts at offset:', offset);

// Transaction version (4 bytes)
const txVersion = originalBuffer.readUInt32LE(offset);
console.log('Transaction version:', txVersion, 'hex:', originalBuffer.slice(offset, offset + 4).toString('hex'));
offset += 4;

// Input count (VarInt)
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

const inputCountResult = readVarInt(originalBuffer, offset);
console.log('Input count:', inputCountResult.value, 'hex:', originalBuffer.slice(offset, offset + inputCountResult.bytesRead).toString('hex'));
offset += inputCountResult.bytesRead;

console.log('\n=== Input Parsing ===');
console.log('First input starts at offset:', offset);

// Previous transaction hash (32 bytes)
const prevTxHash = originalBuffer.slice(offset, offset + 32);
console.log('Previous tx hash (32 bytes):', prevTxHash.toString('hex'));
offset += 32;

// Output index (4 bytes)
const outputIndex = originalBuffer.readUInt32LE(offset);
console.log('Output index (4 bytes):', outputIndex, 'hex:', originalBuffer.slice(offset, offset + 4).toString('hex'));
offset += 4;

// Script length (VarInt)
const scriptLenResult = readVarInt(originalBuffer, offset);
console.log('Script length:', scriptLenResult.value, 'hex:', originalBuffer.slice(offset, offset + scriptLenResult.bytesRead).toString('hex'));
offset += scriptLenResult.bytesRead;

// Script bytes
const scriptBytes = originalBuffer.slice(offset, offset + Number(scriptLenResult.value));
console.log('Script bytes (' + scriptLenResult.value + ' bytes):', scriptBytes.toString('hex'));
console.log('Last 20 bytes of script:', scriptBytes.slice(-20).toString('hex'));
offset += Number(scriptLenResult.value);

// Sequence (4 bytes)
const sequence = originalBuffer.readUInt32LE(offset);
console.log('Sequence (4 bytes):', sequence, 'hex:', originalBuffer.slice(offset, offset + 4).toString('hex'));
offset += 4;

console.log('\n=== After Input ===');
console.log('Input ends at offset:', offset);
console.log('Byte at this position:', '0x' + originalBuffer[offset].toString(16));
console.log('Next 10 bytes:', originalBuffer.slice(offset, offset + 10).toString('hex'));

// Now this should be the output count
const outputCountResult = readVarInt(originalBuffer, offset);
console.log('Output count:', outputCountResult.value, 'hex:', originalBuffer.slice(offset, offset + outputCountResult.bytesRead).toString('hex'));
offset += outputCountResult.bytesRead;

console.log('\n=== After Output Count ===');
console.log('Offset after output count:', offset);
console.log('Byte at this position:', '0x' + originalBuffer[offset].toString(16));
console.log('Next 10 bytes:', originalBuffer.slice(offset, offset + 10).toString('hex'));
