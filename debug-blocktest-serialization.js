const { Buffer } = require("buffer");
const { Utils } = require("./src/net/bigtangle/utils/Utils");

// Test data from testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

console.log("Analyzing testSerial2 data...");
const buffer = Buffer.from(tip, 'hex');
console.log("Buffer length:", buffer.length);

// Let's manually parse the block structure to understand the format
let cursor = 0;

// Block header (80 bytes)
const version = buffer.readUInt32LE(cursor);
cursor += 4;
console.log("Version:", version);

// Previous block hash (32 bytes)
const prevHash = buffer.slice(cursor, cursor + 32);
cursor += 32;
console.log("Previous hash:", prevHash.toString('hex'));

// Merkle root (32 bytes)
const merkleRoot = buffer.slice(cursor, cursor + 32);
cursor += 32;
console.log("Merkle root:", merkleRoot.toString('hex'));

// Timestamp (4 bytes)
const timestamp = buffer.readUInt32LE(cursor);
cursor += 4;
console.log("Timestamp:", timestamp);

// Target (4 bytes)
const target = buffer.readUInt32LE(cursor);
cursor += 4;
console.log("Target:", target);

// Nonce (4 bytes)
const nonce = buffer.readUInt32LE(cursor);
cursor += 4;
console.log("Nonce:", nonce);

console.log("After header, cursor at:", cursor);

// Transaction count (VarInt)
const VarInt = require("./src/net/bigtangle/core/VarInt");
const txCountVarInt = VarInt.fromBuffer(buffer, cursor);
const txCount = Number(txCountVarInt.value);
cursor += txCountVarInt.getOriginalSizeInBytes();
console.log("Transaction count:", txCount);

console.log("Starting transaction parsing at offset:", cursor);

// Now let's examine the transaction data
const txStart = cursor;
console.log("Transaction data from offset", txStart, "to end");
console.log("Remaining bytes:", buffer.length - cursor);

// Let's look at the first few bytes of transaction data
const txHeader = buffer.slice(cursor, cursor + 20);
console.log("First 20 bytes of transaction:", txHeader.toString('hex'));

// Try to parse transaction version
const txVersion = buffer.readUInt32LE(cursor);
console.log("Transaction version:", txVersion);

cursor += 4;

// Input count
const inputCountVarInt = VarInt.fromBuffer(buffer, cursor);
const inputCount = Number(inputCountVarInt.value);
cursor += inputCountVarInt.getOriginalSizeInBytes();
console.log("Input count:", inputCount);

console.log("After input count, cursor at:", cursor);

// Let's examine the first input
console.log("First input starts at:", cursor);
const inputStart = cursor;

// Previous transaction hash (32 bytes)
const prevTxHash = buffer.slice(cursor, cursor + 32);
cursor += 32;
console.log("Previous tx hash:", prevTxHash.toString('hex'));

// Output index (4 bytes)
const outputIndex = buffer.readUInt32LE(cursor);
cursor += 4;
console.log("Output index:", outputIndex);

// Script length (VarInt)
const scriptLenVarInt = VarInt.fromBuffer(buffer, cursor);
const scriptLen = Number(scriptLenVarInt.value);
cursor += scriptLenVarInt.getOriginalSizeInBytes();
console.log("Script length:", scriptLen);

console.log("Script starts at:", cursor, "length:", scriptLen);
console.log("Available bytes for script:", buffer.length - cursor);

if (cursor + scriptLen > buffer.length) {
    console.error("ERROR: Script would read beyond buffer!");
    console.error("Cursor:", cursor, "Script length:", scriptLen, "Buffer length:", buffer.length);
    console.error("Overflow by:", (cursor + scriptLen) - buffer.length);
} else {
    const script = buffer.slice(cursor, cursor + scriptLen);
    console.log("Script bytes:", script.toString('hex'));
    cursor += scriptLen;
}

// Sequence (4 bytes)
if (cursor + 4 <= buffer.length) {
    const sequence = buffer.readUInt32LE(cursor);
    cursor += 4;
    console.log("Sequence:", sequence);
}

console.log("After input, cursor at:", cursor);

// Output count
if (cursor < buffer.length) {
    const outputCountVarInt = VarInt.fromBuffer(buffer, cursor);
    const outputCount = Number(outputCountVarInt.value);
    cursor += outputCountVarInt.getOriginalSizeInBytes();
    console.log("Output count:", outputCount);

    console.log("Starting output parsing at:", cursor);
    
    for (let i = 0; i < Math.min(outputCount, 1); i++) {
        console.log(`\n--- Output ${i} ---`);
        console.log("Output starts at:", cursor);
        
        // Value (8 bytes)
        if (cursor + 8 <= buffer.length) {
            const value = buffer.readBigUInt64LE(cursor);
            cursor += 8;
            console.log("Value:", value.toString());
        }
        
        // Token ID length (VarInt)
        if (cursor < buffer.length) {
            const tokenLenVarInt = VarInt.fromBuffer(buffer, cursor);
            const tokenLen = Number(tokenLenVarInt.value);
            cursor += tokenLenVarInt.getOriginalSizeInBytes();
            console.log("Token ID length:", tokenLen);
            
            // Token ID
            if (cursor + tokenLen <= buffer.length) {
                const tokenId = buffer.slice(cursor, cursor + tokenLen);
                cursor += tokenLen;
                console.log("Token ID:", tokenId.toString('hex'));
            }
            
            // Script length (VarInt)
            if (cursor < buffer.length) {
                const scriptLenVarInt2 = VarInt.fromBuffer(buffer, cursor);
                const scriptLen2 = Number(scriptLenVarInt2.value);
                cursor += scriptLenVarInt2.getOriginalSizeInBytes();
                console.log("Script length:", scriptLen2);
                
                console.log("Script starts at:", cursor, "available:", buffer.length - cursor);
                
                if (cursor + scriptLen2 > buffer.length) {
                    console.error("ERROR: Output script would read beyond buffer!");
                    console.error("Overflow by:", (cursor + scriptLen2) - buffer.length);
                }
            }
        }
    }
}

console.log("\nFinal cursor position:", cursor);
console.log("Buffer length:", buffer.length);
console.log("Bytes remaining:", buffer.length - cursor);
