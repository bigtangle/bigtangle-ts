const { Buffer } = require('buffer');
const fs = require('fs');
const path = require('path');

// Read the test data from BlockTest.ts
const testFilePath = path.join(__dirname, 'test', 'core', 'BlockTest.ts');
const testContent = fs.readFileSync(testFilePath, 'utf8');

// Extract the hex data from the test
const hexMatch = testContent.match(/hexToBytes\("([0-9a-fA-F]+)"/);
if (!hexMatch) {
    console.error('Could not find hex data in BlockTest.ts');
    process.exit(1);
}

const hexData = hexMatch[1];
console.log('Hex data from test:', hexData);
console.log('Length:', hexData.length / 2, 'bytes');

// Convert hex to buffer
const buffer = Buffer.from(hexData, 'hex');
console.log('Buffer length:', buffer.length);

// Parse according to Block structure
let offset = 0;

function readUInt32LE() {
    const value = buffer.readUInt32LE(offset);
    offset += 4;
    return value;
}

function readInt64LE() {
    const low = buffer.readUInt32LE(offset);
    const high = buffer.readInt32LE(offset + 4);
    offset += 8;
    return (BigInt(high) << 32n) | BigInt(low >>> 0);
}

function readBytes(length) {
    const bytes = buffer.slice(offset, offset + length);
    offset += length;
    return bytes;
}

function readHash() {
    const hash = readBytes(32);
    return hash.toString('hex').match(/.{2}/g).reverse().join('');
}

// Parse header
console.log('\n=== Block Header ===');
const version = readUInt32LE();
console.log('Version:', version);

const prevBlockHash = readHash();
console.log('Previous block hash:', prevBlockHash);

const prevBranchBlockHash = readHash();
console.log('Previous branch block hash:', prevBranchBlockHash);

const merkleRoot = readHash();
console.log('Merkle root:', merkleRoot);

const time = Number(readInt64LE());
console.log('Time:', time, new Date(time * 1000).toISOString());

const difficultyTarget = Number(readInt64LE());
console.log('Difficulty target:', difficultyTarget);

const lastMiningRewardBlock = Number(readInt64LE());
console.log('Last mining reward block:', lastMiningRewardBlock);

const nonce = readUInt32LE();
console.log('Nonce:', nonce);

const minerAddress = readBytes(20);
console.log('Miner address:', minerAddress.toString('hex'));

const blockType = readUInt32LE();
console.log('Block type:', blockType);

const height = Number(readInt64LE());
console.log('Height:', height);

console.log('\n=== Transaction Count ===');
const remainingBytes = buffer.length - offset;
console.log('Remaining bytes after header:', remainingBytes);

if (remainingBytes > 0) {
    // Try to read varint for transaction count
    const firstByte = buffer[offset];
    console.log('First byte at transaction count:', firstByte);
    
    if (firstByte < 0xfd) {
        const txCount = firstByte;
        console.log('Transaction count (simple):', txCount);
        offset += 1;
    } else if (firstByte === 0xfd) {
        const txCount = buffer.readUInt16LE(offset + 1);
        console.log('Transaction count (uint16):', txCount);
        offset += 3;
    } else if (firstByte === 0xfe) {
        const txCount = buffer.readUInt32LE(offset + 1);
        console.log('Transaction count (uint32):', txCount);
        offset += 5;
    } else {
        const txCount = readInt64LE();
        console.log('Transaction count (uint64):', txCount);
    }
    
    console.log('Offset after transaction count:', offset);
    
    // Show remaining bytes
    const remainingAfterCount = buffer.length - offset;
    console.log('Remaining bytes after count:', remainingAfterCount);
    
    if (remainingAfterCount > 0) {
        console.log('First 32 bytes of transaction data:', buffer.slice(offset, offset + 32).toString('hex'));
    }
}

console.log('\n=== Summary ===');
console.log('Total bytes parsed:', offset);
console.log('Total buffer length:', buffer.length);
console.log('Bytes remaining:', buffer.length - offset);
