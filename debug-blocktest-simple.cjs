const { Buffer } = require('buffer');

// Test data from testSerial2 - the expected hex string
const expectedHex = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

// Simple hex to bytes conversion
function hexToBytes(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
}

// Convert hex to buffer
const expectedBytes = hexToBytes(expectedHex);
const expectedBuffer = Buffer.from(expectedBytes);

console.log("Expected hex length:", expectedHex.length);
console.log("Expected buffer length:", expectedBuffer.length);

// Let's manually parse the block structure
let cursor = 0;

// Block header (80 bytes)
const version = expectedBuffer.readUInt32LE(cursor);
cursor += 4;
console.log("Version:", version);

// Previous block hash (32 bytes)
const prevHash = expectedBuffer.slice(cursor, cursor + 32);
cursor += 32;
console.log("Previous hash:", prevHash.toString('hex'));

// Merkle root (32 bytes)
const merkleRoot = expectedBuffer.slice(cursor, cursor + 32);
cursor += 32;
console.log("Merkle root:", merkleRoot.toString('hex'));

// Timestamp (4 bytes)
const timestamp = expectedBuffer.readUInt32LE(cursor);
cursor += 4;
console.log("Timestamp:", timestamp);

// Target (4 bytes)
const target = expectedBuffer.readUInt32LE(cursor);
cursor += 4;
console.log("Target:", target);

// Nonce (4 bytes)
const nonce = expectedBuffer.readUInt32LE(cursor);
cursor += 4;
console.log("Nonce:", nonce);

console.log("After header, cursor at:", cursor);

// Transaction count (VarInt)
function readVarInt(buffer, offset) {
    const firstByte = buffer[offset];
    if (firstByte < 0xfd) {
        return { value: firstByte, size: 1 };
    } else if (firstByte === 0xfd) {
        return { value: buffer.readUInt16LE(offset + 1), size: 3 };
    } else if (firstByte === 0xfe) {
        return { value: buffer.readUInt32LE(offset + 1), size: 5 };
    } else {
        return { value: Number(buffer.readBigUInt64LE(offset + 1)), size: 9 };
    }
}

const txCountVarInt = readVarInt(expectedBuffer, cursor);
const txCount = txCountVarInt.value;
cursor += txCountVarInt.size;
console.log("Transaction count:", txCount);

console.log("Starting transaction parsing at offset:", cursor);

// Let's look at the transaction data
console.log("Transaction data from offset", cursor, "to end");
console.log("Remaining bytes:", expectedBuffer.length - cursor);

// Let's find the value 100000000 (0x00e1f505 in little-endian)
const targetValue = 100000000;
const targetValueHexLE = targetValue.toString(16).padStart(8, '0').match(/../g).reverse().join('');
console.log("Looking for value 100000000 in little-endian hex:", targetValueHexLE);

// Search for this pattern in the buffer
const bufferHex = expectedBuffer.toString('hex');
const valuePosition = bufferHex.indexOf(targetValueHexLE);
if (valuePosition !== -1) {
    console.log("Found value 100000000 at byte position:", valuePosition / 2);
    
    // Let's examine the context around this value
    const start = Math.max(0, valuePosition - 40);
    const end = Math.min(bufferHex.length, valuePosition + 40);
    console.log("Context around value:", bufferHex.substring(start, end));
} else {
    console.log("Value 100000000 not found in expected format");
}

// Let's also check for the value in big-endian
const targetValueHexBE = targetValue.toString(16).padStart(16, '0').match(/../g).join('');
console.log("Looking for value 100000000 in big-endian hex:", targetValueHexBE);
const valuePositionBE = bufferHex.indexOf(targetValueHexBE);
if (valuePositionBE !== -1) {
    console.log("Found value 100000000 (BE) at byte position:", valuePositionBE / 2);
}

// Let's examine the transaction structure more carefully
console.log("\n--- Detailed Transaction Analysis ---");

// Reset cursor to transaction start
cursor = 80 + txCountVarInt.size;

// Transaction version
const txVersion = expectedBuffer.readUInt32LE(cursor);
cursor += 4;
console.log("Transaction version:", txVersion);

// Input count
const inputCountVarInt = readVarInt(expectedBuffer, cursor);
const inputCount = inputCountVarInt.value;
cursor += inputCountVarInt.size;
console.log("Input count:", inputCount);

// Skip first input
cursor += 32; // prev tx hash
cursor += 4;  // output index
const scriptLen1 = readVarInt(expectedBuffer, cursor);
cursor += scriptLen1.size + scriptLen1.value;
cursor += 4;  // sequence

// Output count
const outputCountVarInt = readVarInt(expectedBuffer, cursor);
const outputCount = outputCountVarInt.value;
cursor += outputCountVarInt.size;
console.log("Output count:", outputCount);

console.log("First output starts at:", cursor);

// First output value
if (cursor + 8 <= expectedBuffer.length) {
    const outputValue = expectedBuffer.readBigUInt64LE(cursor);
    console.log("First output value:", outputValue.toString());
    cursor += 8;
    
    // Token ID length
    const tokenLenVarInt = readVarInt(expectedBuffer, cursor);
    const tokenLen = tokenLenVarInt.value;
    cursor += tokenLenVarInt.size;
    console.log("Token ID length:", tokenLen);
    
    // Skip token ID
    cursor += tokenLen;
    
    // Script length
    const scriptLen2 = readVarInt(expectedBuffer, cursor);
    cursor += scriptLen2.size;
    console.log("Output script length:", scriptLen2.value);
    
    console.log("Output script starts at:", cursor);
    const script = expectedBuffer.slice(cursor, cursor + scriptLen2.value);
    console.log("Output script:", script.toString('hex'));
}

console.log("\n--- Summary ---");
console.log("Expected buffer length:", expectedBuffer.length);
console.log("This appears to be the complete serialized block data");
console.log("The value 100000000 should be found in the transaction outputs");
