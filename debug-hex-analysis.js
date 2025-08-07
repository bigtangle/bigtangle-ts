const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

// Convert hex to bytes
const bytes = [];
for (let i = 0; i < tip.length; i += 2) {
    bytes.push(parseInt(tip.substr(i, 2), 16));
}

console.log('Total bytes:', bytes.length);

// Simple VarInt parser
function readVarInt(bytes, offset) {
    const firstByte = bytes[offset];
    if (firstByte < 0xfd) {
        return { value: firstByte, size: 1 };
    } else if (firstByte === 0xfd) {
        return { value: bytes[offset + 1] | (bytes[offset + 2] << 8), size: 3 };
    } else if (firstByte === 0xfe) {
        return { value: bytes[offset + 1] | (bytes[offset + 2] << 8) | (bytes[offset + 3] << 16) | (bytes[offset + 4] << 24), size: 5 };
    } else {
        // 0xff - 8 bytes, but we'll skip for now
        return { value: 0, size: 9 };
    }
}

let cursor = 0;

// Block header (80 bytes)
console.log('Block header:', bytes.slice(0, 80).map(b => b.toString(16).padStart(2, '0')).join(''));
cursor = 80;

// Transaction count
const txCount = readVarInt(bytes, cursor);
console.log('Transaction count:', txCount.value);
cursor += txCount.size;

// Transaction version
const version = bytes[cursor] | (bytes[cursor + 1] << 8) | (bytes[cursor + 2] << 16) | (bytes[cursor + 3] << 24);
console.log('Transaction version:', version);
cursor += 4;

// Input count
const inputCount = readVarInt(bytes, cursor);
console.log('Input count:', inputCount.value);
cursor += inputCount.size;

// Previous transaction hash (32 bytes)
const prevTxHash = bytes.slice(cursor, cursor + 32).reverse().map(b => b.toString(16).padStart(2, '0')).join('');
console.log('Previous tx hash:', prevTxHash);
cursor += 32;

// Output index
const outputIndex = bytes[cursor] | (bytes[cursor + 1] << 8) | (bytes[cursor + 2] << 16) | (bytes[cursor + 3] << 24);
console.log('Output index:', outputIndex);
cursor += 4;

// Script length
const scriptLen = readVarInt(bytes, cursor);
console.log('Script length:', scriptLen.value);
cursor += scriptLen.size;

// Script
const script = bytes.slice(cursor, cursor + scriptLen.value);
console.log('Script:', script.map(b => b.toString(16).padStart(2, '0')).join(''));
cursor += scriptLen.value;

// Sequence
const sequence = bytes[cursor] | (bytes[cursor + 1] << 8) | (bytes[cursor + 2] << 16) | (bytes[cursor + 3] << 24);
console.log('Sequence:', sequence);
cursor += 4;

// Output count
console.log('Current cursor position:', cursor);
console.log('Remaining bytes:', bytes.length - cursor);

if (cursor < bytes.length) {
    const outputCount = readVarInt(bytes, cursor);
    console.log('Output count:', outputCount.value);
    cursor += outputCount.size;
    
    // Try to parse first output
    console.log('Parsing first output at offset:', cursor);
    
    // Value length
    const valueLen = readVarInt(bytes, cursor);
    console.log('Value length:', valueLen.value);
    cursor += valueLen.size;
    
    console.log('Would need to read', valueLen.value, 'bytes for value at position', cursor);
    console.log('But only have', bytes.length - cursor, 'bytes remaining');
    
    // Show next few bytes
    console.log('Next 20 bytes:', bytes.slice(cursor, cursor + 20).map(b => b.toString(16).padStart(2, '0')).join(' '));
}
