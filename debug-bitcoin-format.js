const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

// Convert hex to bytes
const bytes = [];
for (let i = 0; i < tip.length; i += 2) {
    bytes.push(parseInt(tip.substr(i, 2), 16));
}

console.log('Total bytes:', bytes.length);

// Little-endian integer reader
function readUInt32LE(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
}

function readUInt64LE(bytes, offset) {
    const low = readUInt32LE(bytes, offset);
    const high = readUInt32LE(bytes, offset + 4);
    return low + (high * 0x100000000);
}

// VarInt parser
function readVarInt(bytes, offset) {
    const firstByte = bytes[offset];
    if (firstByte < 0xfd) {
        return { value: firstByte, size: 1 };
    } else if (firstByte === 0xfd) {
        return { value: bytes[offset + 1] | (bytes[offset + 2] << 8), size: 3 };
    } else if (firstByte === 0xfe) {
        return { value: readUInt32LE(bytes, offset + 1), size: 5 };
    } else {
        return { value: readUInt64LE(bytes, offset + 1), size: 9 };
    }
}

let cursor = 0;

console.log('=== BLOCK PARSING ===');
console.log('Total bytes:', bytes.length);

// Block header (80 bytes)
console.log('\n1. Block Header (80 bytes):');
console.log('   Magic:', bytes.slice(0, 4).map(b => b.toString(16).padStart(2, '0')).join(''));
console.log('   Previous block hash:', bytes.slice(4, 36).reverse().map(b => b.toString(16).padStart(2, '0')).join(''));
console.log('   Merkle root:', bytes.slice(36, 68).reverse().map(b => b.toString(16).padStart(2, '0')).join(''));
console.log('   Timestamp:', readUInt32LE(bytes, 68));
console.log('   Bits:', readUInt32LE(bytes, 72));
console.log('   Nonce:', readUInt32LE(bytes, 76));
cursor = 80;

// Transaction count
const txCount = readVarInt(bytes, cursor);
console.log('\n2. Transaction count:', txCount.value);
cursor += txCount.size;

console.log('\n3. TRANSACTION DATA:');
console.log('   Starting at offset:', cursor);

// Transaction version
const version = readUInt32LE(bytes, cursor);
console.log('   Transaction version:', version);
cursor += 4;

// Input count
const inputCount = readVarInt(bytes, cursor);
console.log('   Input count:', inputCount.value);
cursor += inputCount.size;

console.log('\n4. FIRST INPUT:');
console.log('   Starting at offset:', cursor);

// Previous transaction hash (32 bytes)
const prevTxHash = bytes.slice(cursor, cursor + 32).reverse().map(b => b.toString(16).padStart(2, '0')).join('');
console.log('   Previous tx hash:', prevTxHash);
cursor += 32;

// Output index
const outputIndex = readUInt32LE(bytes, cursor);
console.log('   Output index:', outputIndex);
cursor += 4;

// Script length
const scriptLen = readVarInt(bytes, cursor);
console.log('   Script length:', scriptLen.value);
cursor += scriptLen.size;

// Script
const script = bytes.slice(cursor, cursor + scriptLen.value);
console.log('   Script:', script.map(b => b.toString(16).padStart(2, '0')).join(''));
cursor += scriptLen.value;

// Sequence
const sequence = readUInt32LE(bytes, cursor);
console.log('   Sequence:', sequence.toString(16));
cursor += 4;

console.log('\n5. OUTPUT SECTION:');
console.log('   Starting at offset:', cursor);

// Output count
const outputCount = readVarInt(bytes, cursor);
console.log('   Output count:', outputCount.value);
cursor += outputCount.size;

console.log('\n6. FIRST OUTPUT:');
console.log('   Starting at offset:', cursor);

// Value (8 bytes)
const value = readUInt64LE(bytes, cursor);
console.log('   Value (satoshis):', value);
console.log('   Value (BTC):', value / 100000000);
cursor += 8;

// Script length
const outputScriptLen = readVarInt(bytes, cursor);
console.log('   Script length:', outputScriptLen.value);
cursor += outputScriptLen.size;

// Output script
const outputScript = bytes.slice(cursor, cursor + outputScriptLen.value);
console.log('   Output script:', outputScript.map(b => b.toString(16).padStart(2, '0')).join(''));
cursor += outputScriptLen.value;

console.log('\n7. LOCKTIME:');
const locktime = readUInt32LE(bytes, cursor);
console.log('   Locktime:', locktime);
cursor += 4;

console.log('\n8. REMAINING DATA:');
console.log('   Cursor position:', cursor);
console.log('   Remaining bytes:', bytes.length - cursor);

if (bytes.length - cursor > 0) {
    const remaining = bytes.slice(cursor);
    console.log('   Remaining hex:', remaining.map(b => b.toString(16).padStart(2, '0')).join(''));
    
    // Try to interpret remaining as JSON
    try {
        const remainingStr = remaining.map(b => String.fromCharCode(b)).join('');
        console.log('   As string:', remainingStr);
    } catch (e) {
        console.log('   Cannot interpret as string');
    }
}
