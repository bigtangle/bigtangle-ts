const { Buffer } = require('buffer');

// Test data from BlockTest.ts - testSerial2
const tip = "01000000ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548170dafec26b25ed20a2c87d485de589c57fc1b32e65a37ea970feb15142b5f1a2a34856800000000ae470120000000000000000000000000cb16b4d62bdf6a05a961cf27a47355486891ebb9ee6892f8010000000100000000000000010100000001ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f055488b404ea4787ac1af3c007dc3462b9875d320ee983690b649d9c564da7a4c38d50000000049483045022100818570e724f91eb5d73b6a195c905fe7d56414cd39fef6aaba20d10f60402256022011f04e032d4bcd111218d07f32195e29f9e3dbb4ef517f91d596e248f84c08c201ffffffff0100000008016345785d8a000001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d7ab9d801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205da7d00000000";

console.log('=== Header Parsing Debug ===');

// Parse the original hex
const originalBuffer = Buffer.from(tip, 'hex');
console.log('Original buffer length:', originalBuffer.length);

// Let's manually parse the block header fields
let offset = 0;

console.log('\n=== Block Header Fields ===');
const version = originalBuffer.readUInt32LE(offset);
console.log('Version (offset 0, 4 bytes):', version, 'hex:', originalBuffer.slice(offset, offset + 4).toString('hex'));
offset += 4;

const prevBlockHash = originalBuffer.slice(offset, offset + 32);
console.log('Previous block hash (offset 4, 32 bytes):', prevBlockHash.toString('hex'));
offset += 32;

const prevBranchBlockHash = originalBuffer.slice(offset, offset + 32);
console.log('Previous branch block hash (offset 36, 32 bytes):', prevBranchBlockHash.toString('hex'));
offset += 32;

const merkleRoot = originalBuffer.slice(offset, offset + 32);
console.log('Merkle root (offset 68, 32 bytes):', merkleRoot.toString('hex'));
offset += 32;

const time = originalBuffer.readBigUInt64LE(offset);
console.log('Time (offset 100, 8 bytes):', time.toString(), 'hex:', originalBuffer.slice(offset, offset + 8).toString('hex'));
offset += 8;

const difficultyTarget = originalBuffer.readBigUInt64LE(offset);
console.log('Difficulty target (offset 108, 8 bytes):', difficultyTarget.toString(), 'hex:', originalBuffer.slice(offset, offset + 8).toString('hex'));
offset += 8;

const lastMiningRewardBlock = originalBuffer.readBigUInt64LE(offset);
console.log('Last mining reward block (offset 116, 8 bytes):', lastMiningRewardBlock.toString(), 'hex:', originalBuffer.slice(offset, offset + 8).toString('hex'));
offset += 8;

const nonce = originalBuffer.readUInt32LE(offset);
console.log('Nonce (offset 124, 4 bytes):', nonce, 'hex:', originalBuffer.slice(offset, offset + 4).toString('hex'));
offset += 4;

const minerAddress = originalBuffer.slice(offset, offset + 20);
console.log('Miner address (offset 128, 20 bytes):', minerAddress.toString('hex'));
offset += 20;

const blockType = originalBuffer.readUInt32LE(offset);
console.log('Block type (offset 148, 4 bytes):', blockType, 'hex:', originalBuffer.slice(offset, offset + 4).toString('hex'));
offset += 4;

const height = originalBuffer.readBigUInt64LE(offset);
console.log('Height (offset 152, 8 bytes):', height.toString(), 'hex:', originalBuffer.slice(offset, offset + 8).toString('hex'));
offset += 8;

console.log('Total header size:', offset);
console.log('Bytes remaining after header:', originalBuffer.length - offset);

// Let's look at the bytes right after the header
console.log('First 20 bytes after header:', originalBuffer.slice(offset, offset + 20).toString('hex'));

// Let's try to parse the VarInt for transaction count
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

console.log('\n=== Transaction Count Parsing ===');
const txCountResult = readVarInt(originalBuffer, offset);
console.log('Transaction count:', txCountResult.value);
console.log('Bytes read for tx count:', txCountResult.bytesRead);

// Let's see what comes after the transaction count
const afterTxCountOffset = offset + txCountResult.bytesRead;
console.log('Offset after tx count:', afterTxCountOffset);
console.log('First 50 bytes after tx count:', originalBuffer.slice(afterTxCountOffset, afterTxCountOffset + 50).toString('hex'));
