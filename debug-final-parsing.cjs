const { Buffer } = require('buffer');

// Test data from testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');
console.log('Total buffer length:', buffer.length);

// Let's manually parse the structure step by step with correct alignment
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

function readVarInt() {
    const firstByte = buffer[offset];
    if (firstByte < 0xfd) {
        offset += 1;
        return firstByte;
    } else if (firstByte === 0xfd) {
        const value = buffer.readUInt16LE(offset + 1);
        offset += 3;
        return value;
    } else if (firstByte === 0xfe) {
        const value = buffer.readUInt32LE(offset + 1);
        offset += 5;
        return value;
    } else {
        const low = buffer.readUInt32LE(offset + 1);
        const high = buffer.readInt32LE(offset + 5);
        offset += 9;
        return (BigInt(high) << 32n) | BigInt(low >>> 0);
    }
}

// Parse block header
console.log('=== Block Header ===');
const version = readUInt32LE();
const prevBlockHash = readHash();
const prevBranchBlockHash = readHash();
const merkleRoot = readHash();
const time = Number(readInt64LE());
const difficultyTarget = Number(readInt64LE());
const lastMiningRewardBlock = Number(readInt64LE());
const nonce = readUInt32LE();
const minerAddress = readBytes(20);
const blockType = readUInt32LE();
const height = Number(readInt64LE());

console.log('Block header parsed, offset:', offset);

// Transaction count
const txCount = readVarInt();
console.log('Transaction count:', txCount);

// Transaction version
const txVersion = readUInt32LE();
console.log('Transaction version:', txVersion);

// Input count
const inputCount = readVarInt();
console.log('Input count:', inputCount);

// Parse input
const prevTxHash = readBytes(32);
const outputIndex = readUInt32LE();
const scriptLength = readVarInt();
console.log('Script length:', scriptLength);

// Read the actual script
const script = readBytes(scriptLength);
console.log('Script bytes:', script.length, 'bytes');

// Sequence
const sequence = readUInt32LE();
console.log('Sequence:', sequence.toString(16));

console.log('After input parsing, offset:', offset);

// Now parse outputs
console.log('\n=== Output Section ===');
const outputCount = readVarInt();
console.log('Output count:', outputCount);

// Parse each output
for (let i = 0; i < outputCount; i++) {
    console.log(`\n=== Output ${i} ===`);
    
    // Value - in Java it's a BigInteger serialized as byte[]
    const valueLen = readVarInt();
    console.log('Value length:', valueLen);
    
    const valueBytes = readBytes(valueLen);
    let value = 0n;
    for (let j = 0; j < valueBytes.length; j++) {
        value = (value << 8n) | BigInt(valueBytes[j]);
    }
    console.log('Value:', value.toString());
    
    // Token ID - byte[]
    const tokenIdLen = readVarInt();
    console.log('Token ID length:', tokenIdLen);
    
    const tokenIdBytes = readBytes(tokenIdLen);
    console.log('Token ID:', tokenIdBytes.toString('hex'));
    
    // Script - byte[]
    const scriptLen = readVarInt();
    console.log('Script length:', scriptLen);
    
    const outputScript = readBytes(scriptLen);
    console.log('Script:', outputScript.toString('hex'));
}

console.log('\n=== Final Position ===');
console.log('Final offset:', offset);
console.log('Buffer length:', buffer.length);

// Check locktime
if (offset < buffer.length) {
    const locktime = readUInt32LE();
    console.log('Locktime:', locktime);
}

// Check remaining data
if (offset < buffer.length) {
    const remaining = buffer.slice(offset);
    console.log('Remaining bytes:', remaining.length);
    console.log('Remaining hex:', remaining.toString('hex'));
    
    // Try to interpret as JSON
    try {
        const jsonStr = remaining.toString('utf8');
        console.log('Remaining as string:', jsonStr);
    } catch (e) {
        console.log('Could not parse remaining as string');
    }
}

// Let's also check what the actual expected values should be
console.log('\n=== Expected Values from Java ===');
console.log('From the test, we expect:');
console.log('- Output count: 1');
console.log('- Value: 100000000 (1 BTC in satoshis)');
console.log('- Token ID: empty (length 0)');
console.log('- Script: standard P2PKH script');
