const { Buffer } = require('buffer');

// The hex data from testSerial2
const hex = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(hex, 'hex');
console.log('Total buffer length:', buffer.length);

// Bitcoin block structure:
// 1. Block header (80 bytes)
// 2. Transaction count (VarInt)
// 3. Transactions

let offset = 0;

// Read block header (80 bytes)
const header = buffer.slice(0, 80);
offset = 80;
console.log('Block header (80 bytes):', header.toString('hex'));

// Read transaction count (VarInt)
function readVarInt(buf, start) {
    const firstByte = buf[start];
    if (firstByte < 0xfd) {
        return { value: firstByte, size: 1 };
    } else if (firstByte === 0xfd) {
        return { value: buf.readUInt16LE(start + 1), size: 3 };
    } else if (firstByte === 0xfe) {
        return { value: buf.readUInt32LE(start + 1), size: 5 };
    } else {
        // 0xff - 8 bytes
        const high = buf.readUInt32LE(start + 1);
        const low = buf.readUInt32LE(start + 5);
        return { value: high * 0x100000000 + low, size: 9 };
    }
}

const txCount = readVarInt(buffer, offset);
console.log('Transaction count:', txCount.value, 'encoded in', txCount.size, 'bytes');
offset += txCount.size;

// Now let's analyze the transaction structure
console.log('\nAnalyzing transaction at offset', offset);

// Transaction structure:
// 1. Version (4 bytes, little-endian)
const version = buffer.readUInt32LE(offset);
console.log('Transaction version:', version);
offset += 4;

// 2. Input count (VarInt)
const inputCount = readVarInt(buffer, offset);
console.log('Input count:', inputCount.value, 'encoded in', inputCount.size, 'bytes');
offset += inputCount.size;

// 3. Transaction inputs
console.log('\nAnalyzing inputs...');
for (let i = 0; i < inputCount.value; i++) {
    console.log(`\nInput ${i}:`);
    
    // Previous transaction hash (32 bytes, reversed)
    const prevTxHash = buffer.slice(offset, offset + 32).reverse().toString('hex');
    console.log('  Previous tx hash:', prevTxHash);
    offset += 32;
    
    // Previous output index (4 bytes, little-endian)
    const prevOutputIndex = buffer.readUInt32LE(offset);
    console.log('  Previous output index:', prevOutputIndex);
    offset += 4;
    
    // Script length (VarInt)
    const scriptLength = readVarInt(buffer, offset);
    console.log('  Script length:', scriptLength.value, 'bytes');
    offset += scriptLength.size;
    
    // Script
    const script = buffer.slice(offset, offset + scriptLength.value);
    console.log('  Script:', script.toString('hex'));
    offset += scriptLength.value;
    
    // Sequence (4 bytes, little-endian)
    const sequence = buffer.readUInt32LE(offset);
    console.log('  Sequence:', sequence);
    offset += 4;
}

// 4. Output count (VarInt)
const outputCount = readVarInt(buffer, offset);
console.log('\nOutput count:', outputCount.value, 'encoded in', outputCount.size, 'bytes');
offset += outputCount.size;

console.log('\nAnalyzing outputs...');
for (let i = 0; i < outputCount.value; i++) {
    console.log(`\nOutput ${i}:`);
    
    // Value (8 bytes, little-endian)
    const value = buffer.readBigUInt64LE(offset);
    console.log('  Value (satoshis):', value.toString());
    offset += 8;
    
    // Token ID length (VarInt)
    const tokenIdLength = readVarInt(buffer, offset);
    console.log('  Token ID length:', tokenIdLength.value, 'bytes');
    offset += tokenIdLength.size;
    
    // Token ID
    const tokenId = buffer.slice(offset, offset + tokenIdLength.value);
    console.log('  Token ID:', tokenId.toString('hex'));
    offset += tokenIdLength.value;
    
    // Script length (VarInt)
    const scriptLength = readVarInt(buffer, offset);
    console.log('  Script length:', scriptLength.value, 'bytes');
    offset += scriptLength.size;
    
    // Script
    const script = buffer.slice(offset, offset + scriptLength.value);
    console.log('  Script:', script.toString('hex'));
    offset += scriptLength.value;
}

// 5. Lock time (4 bytes, little-endian)
const lockTime = buffer.readUInt32LE(offset);
console.log('\nLock time:', lockTime);
offset += 4;

console.log('\nFinal offset:', offset);
console.log('Buffer length:', buffer.length);
console.log('Remaining bytes:', buffer.length - offset);

if (offset < buffer.length) {
    console.log('Extra data:', buffer.slice(offset).toString('hex'));
}
