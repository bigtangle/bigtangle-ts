// Simple hex analysis script without dependencies
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84极f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

// Remove any non-hex characters
const cleanHex = tip.replace(/[^0-9a-fA-F]/g, '');
console.log(`Original length: ${tip.length}, Clean length: ${cleanHex.length}`);

// Convert to buffer
const buffer = Buffer.from(cleanHex, 'hex');
console.log("Total buffer length:", buffer.length);
console.log("First 100 bytes:", buffer.subarray(0, 100).toString('hex'));

// Block header is first 80 bytes
const header = buffer.subarray(0, 80);
console.log("\nBlock header:", header.toString('hex'));

// Transaction count starts at byte 80
const txCountStart = 80;
const txCountVarInt = parseVarInt(buffer, txCountStart);
console.log(`Transaction count: ${txCountVarInt.value}, Size: ${txCountVarInt.size} bytes`);

// Parse a simple VarInt (for values < 253)
function parseVarInt(buffer, offset) {
    const firstByte = buffer[offset];
    if (firstByte < 0xFD) {
        return { value: firstByte, size: 1 };
    } else if (firstByte === 0xFD) {
        return { value: buffer.readUInt16LE(offset + 1), size: 3 };
    } else if (firstByte === 0xFE) {
        return { value: buffer.readUInt32LE(offset + 1), size: 5 };
    } else {
        return { value: buffer.readBigUInt64LE(offset + 1), size: 9 };
    }
}

// First transaction starts after txCountVarInt
const firstTxStart = txCountStart + txCountVarInt.size;
console.log(`First transaction starts at: ${firstTxStart}`);

// Transaction version (4 bytes)
const txVersion = buffer.readUInt32LE(firstTxStart);
console.log(`Transaction version: ${txVersion}`);

// Input count (VarInt after version)
const inputCountVarInt = parseVarInt(buffer, firstTxStart + 4);
console.log(`Input count: ${inputCountVarInt.value}, Size: ${inputCountVarInt.size} bytes`);

// After input count, each input has:
// - Previous output hash (32 bytes)
// - Output index (4 bytes)
// - Script length (VarInt)
// - Script (variable length)
// - Sequence (4 bytes)

// For simplicity, just show the first input
const firstInputStart = firstTxStart + 4 + inputCountVarInt.size;
console.log(`First input starts at: ${firstInputStart}`);

// Previous output hash (32 bytes)
const prevOutputHash = buffer.subarray(firstInputStart, firstInputStart + 32).toString('hex');
console.log("Prev output hash:", prevOutputHash);

// Output index (4 bytes)
const outputIndex = buffer.readUInt32LE(firstInputStart + 32);
console.log("Output index:", outputIndex);

// Script length (VarInt)
const scriptLenVarInt = parseVarInt(buffer, firstInputStart + 36);
console.log(`Script length: ${scriptLenVarInt.value}, Size: ${scriptLenVarInt.size} bytes`);

// Script data
const scriptStart = firstInputStart + 36 + scriptLenVarInt.size;
const script = buffer.subarray(scriptStart, scriptStart + scriptLenVarInt.value).toString('hex');
console.log("Script:", script);

// Sequence (4 bytes)
const sequence = buffer.readUInt32LE(scriptStart + scriptLenVarInt.value);
console.log("Sequence:", sequence);

// Next would be outputs, but we'll stop here for now
