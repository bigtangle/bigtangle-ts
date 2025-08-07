const { Buffer } = require('buffer');

// Test data from testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');

console.log('=== Buffer Analysis ===');
console.log(`Total buffer length: ${buffer.length} bytes`);

// Let's manually parse the structure based on Bitcoin protocol
// Block structure: [block header][transaction count][transactions...]

// Block header is 80 bytes
const blockHeader = buffer.slice(0, 80);
console.log('\n=== Block Header (80 bytes) ===');
console.log(blockHeader.toString('hex'));

// Transaction count (VarInt)
let pos = 80;
let txCount = 0;
let shift = 0;
let bytesRead = 0;
let byte;

do {
    if (pos + bytesRead >= buffer.length) break;
    byte = buffer[pos + bytesRead];
    txCount |= (byte & 0x7F) << shift;
    shift += 7;
    bytesRead++;
} while ((byte & 0x80) !== 0 && bytesRead < 9);

pos += bytesRead;
console.log(`\n=== Transaction Count ===`);
console.log(`Transaction count: ${txCount}`);
console.log(`Bytes read: ${bytesRead}`);
console.log(`Next position: ${pos}`);

// Now let's parse the transaction
// Transaction structure: [version][input count][inputs][output count][outputs][locktime]

// Version (4 bytes little-endian)
if (pos + 4 <= buffer.length) {
    const version = buffer.readUInt32LE(pos);
    pos += 4;
    console.log(`\n=== Transaction Version ===`);
    console.log(`Version: ${version}`);
    console.log(`Next position: ${pos}`);
}

// Input count (VarInt)
let inputCount = 0;
shift = 0;
bytesRead = 0;

do {
    if (pos + bytesRead >= buffer.length) break;
    byte = buffer[pos + bytesRead];
    inputCount |= (byte & 0x7F) << shift;
    shift += 7;
    bytesRead++;
} while ((byte & 0x80) !== 0 && bytesRead < 9);

pos += bytesRead;
console.log(`\n=== Input Count ===`);
console.log(`Input count: ${inputCount}`);
console.log(`Bytes read: ${bytesRead}`);
console.log(`Next position: ${pos}`);

// Parse first input
// Input structure: [previous output][script length][script][sequence]

// Previous output (36 bytes: 32 bytes hash + 4 bytes index)
if (pos + 36 <= buffer.length) {
    const prevHash = buffer.slice(pos, pos + 32).reverse().toString('hex');
    const prevIndex = buffer.readUInt32LE(pos + 32);
    pos += 36;
    console.log(`\n=== Previous Output ===`);
    console.log(`Previous hash: ${prevHash}`);
    console.log(`Previous index: ${prevIndex}`);
    console.log(`Next position: ${pos}`);
}

// Script length (VarInt)
let scriptLen = 0;
shift = 0;
bytesRead = 0;

do {
    if (pos + bytesRead >= buffer.length) break;
    byte = buffer[pos + bytesRead];
    scriptLen |= (byte & 0x7F) << shift;
    shift += 7;
    bytesRead++;
} while ((byte & 0x80) !== 0 && bytesRead < 9);

pos += bytesRead;
console.log(`\n=== Input Script ===`);
console.log(`Script length: ${scriptLen}`);
console.log(`Next position: ${pos}`);

// Skip script
pos += scriptLen;

// Sequence (4 bytes)
if (pos + 4 <= buffer.length) {
    const sequence = buffer.readUInt32LE(pos);
    pos += 4;
    console.log(`Sequence: ${sequence.toString(16)}`);
    console.log(`Next position: ${pos}`);
}

// Output count (VarInt)
let outputCount = 0;
shift = 0;
bytesRead = 0;

do {
    if (pos + bytesRead >= buffer.length) break;
    byte = buffer[pos + bytesRead];
    outputCount |= (byte & 0x7F) << shift;
    shift += 7;
    bytesRead++;
} while ((byte & 0x80) !== 0 && bytesRead < 9);

pos += bytesRead;
console.log(`\n=== Output Count ===`);
console.log(`Output count: ${outputCount}`);
console.log(`Bytes read: ${bytesRead}`);
console.log(`Next position: ${pos}`);

// Parse outputs
console.log(`\n=== Parsing Outputs ===`);
for (let i = 0; i < outputCount && pos < buffer.length; i++) {
    console.log(`\n--- Output ${i + 1} ---`);
    
    // Value (8 bytes little-endian)
    if (pos + 8 <= buffer.length) {
        const value = buffer.readBigUInt64LE(pos);
        console.log(`Value: ${value.toString()} satoshis`);
        console.log(`Value bytes: ${buffer.slice(pos, pos + 8).toString('hex')}`);
        pos += 8;
        
        // Check if this is our target value
        if (value === 100000000n) {
            console.log(`*** FOUND 100000000 satoshis! ***`);
        }
    }
    
    // Token ID length (VarInt)
    let tokenLen = 0;
    shift = 0;
    bytesRead = 0;
    
    do {
        if (pos + bytesRead >= buffer.length) break;
        byte = buffer[pos + bytesRead];
        tokenLen |= (byte & 0x7F) << shift;
        shift += 7;
        bytesRead++;
    } while ((byte & 0x80) !== 0 && bytesRead < 9);
    
    console.log(`Token ID length: ${tokenLen}`);
    pos += bytesRead;
    
    // Skip token ID
    pos += tokenLen;
    
    // Script length (VarInt)
    let scriptLength = 0;
    shift = 0;
    bytesRead = 0;
    
    do {
        if (pos + bytesRead >= buffer.length) break;
        byte = buffer[pos + bytesRead];
        scriptLength |= (byte & 0x7F) << shift;
        shift += 7;
        bytesRead++;
    } while ((byte & 0x80) !== 0 && bytesRead < 9);
    
    console.log(`Script length: ${scriptLength}`);
    pos += bytesRead;
    
    // Skip script
    pos += scriptLength;
}

console.log(`\n=== Final Position ===`);
console.log(`Final position: ${pos}`);
console.log(`Remaining bytes: ${buffer.length - pos}`);

// Let's also search for the specific byte pattern 0x00e1f50500000000
console.log(`\n=== Manual Search for 100000000 ===`);
const targetBytes = Buffer.alloc(8);
targetBytes.writeBigUInt64LE(100000000n);
const targetHex = targetBytes.toString('hex');
const foundAt = buffer.toString('hex').indexOf(targetHex);

console.log(`Target bytes (100000000): ${targetHex}`);
console.log(`Found at position: ${foundAt}`);
if (foundAt >= 0) {
    console.log(`Found at byte position: ${foundAt / 2}`);
    
    // Show context around the found position
    const bytePos = foundAt / 2;
    const start = Math.max(0, bytePos - 20);
    const end = Math.min(buffer.length, bytePos + 40);
    console.log(`Context: ${buffer.slice(start, end).toString('hex')}`);
}
