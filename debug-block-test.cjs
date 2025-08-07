const { Buffer } = require('buffer');
const { TestParams } = require('./dist/net/bigtangle/params/TestParams.js');
const { Utils } = require('./dist/net/bigtangle/core/Utils.js');

// Test data from BlockTest.ts
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

// Decode using Utils.HEX
const buffer = Buffer.from(Utils.HEX.decode(tip));
console.log('Buffer length:', buffer.length);

// Parse block structure
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

console.log('\n=== Block Header Analysis ===');
console.log('Total buffer length:', buffer.length);

// Parse header fields
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

console.log('\n=== Transaction Data ===');
console.log('Header parsed bytes:', offset);
console.log('Remaining bytes:', buffer.length - offset);

// Show transaction count area
if (offset < buffer.length) {
    const txCountByte = buffer[offset];
    console.log('Transaction count byte:', txCountByte);
    
    if (txCountByte === 0x01) {
        console.log('Transaction count: 1');
        offset += 1;
    }
    
    console.log('Transaction data starts at offset:', offset);
    
    if (offset < buffer.length) {
        const txStart = buffer.slice(offset, offset + 64);
        console.log('First 64 bytes of transaction data:', txStart.toString('hex'));
    }
}

console.log('\n=== Summary ===');
console.log('Expected header size: 176 bytes');
console.log('Actual header parsed:', offset);
console.log('Buffer length:', buffer.length);
console.log('All bytes accounted for:', offset === buffer.length);
