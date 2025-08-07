const { Utils } = require('./src/net/bigtangle/utils/Utils.js');
const { VarInt } = require('./src/net/bigtangle/core/VarInt.js');

// Correct test data from BlockTest.ts testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1dd极b744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(Utils.HEX.decode(tip));
console.log("Total buffer length:", buffer.length);
console.log("Buffer hex:", buffer.toString('hex'));

let cursor = 80; // Start after block header

// Transaction count
const txCountVarInt = VarInt.fromBuffer(buffer, cursor);
const txCount = Number(txCountVarInt.value);
cursor += txCountVarInt.getOriginalSizeInBytes();
console.log(`\nTransaction count: ${txCount} (size: ${txCountVarInt.getOriginalSizeInBytes()} bytes)`);

// First transaction
console.log("\n=== FIRST TRANSACTION ===");
console.log(`Starts at: ${cursor}`);
const txVersion = buffer.readUInt32LE(cursor);
cursor += 4;
console.log(`Version: ${txVersion}`);

// Input count
const inputCountVarInt = VarInt.fromBuffer(buffer, cursor);
const inputCount = Number(inputCountVarInt.value);
cursor += inputCountVarInt.getOriginalSizeInBytes();
console.log(`Input count: ${inputCount} (size: ${inputCountVarInt.getOriginalSizeInBytes()} bytes)`);

// Process inputs
for (let i = 0; i < inputCount; i++) {
    console.log(`\nInput ${i}:`);
    console.log(`  Starts at: ${cursor}`);
    
    // Previous output hash (32 bytes)
    console.log(`  Prev output hash: ${buffer.slice(cursor, cursor + 32).toString('hex')}`);
    cursor += 32;
    
    // Output index (4 bytes)
    console.log(`  Output index: ${buffer.readUInt32LE(cursor)}`);
    cursor += 4;
    
    // Script length
    const scriptLenVarInt = VarInt.fromBuffer(buffer, cursor);
    const scriptLen = Number(scriptLenVarInt.value);
    cursor += scriptLenVarInt.getOriginalSizeInBytes();
    console.log(`  Script length: ${scriptLen} (size: ${scriptLenVarInt.getOriginalSizeInBytes()} bytes)`);
    
    // Script bytes
    console.log(`  Script: ${buffer.slice(cursor, cursor + scriptLen).toString('hex')}`);
    cursor += scriptLen;
    
    // Sequence (4 bytes)
    console.log(`  Sequence: ${buffer.readUInt32LE(cursor)}`);
    cursor += 4;
}

// Output count
const outputCountVarInt = VarInt.fromBuffer(buffer, cursor);
const outputCount = Number(outputCount极Int.value);
cursor += outputCountVarInt.getOriginalSizeInBytes();
console.log(`\nOutput count: ${outputCount} (size: ${outputCountVarInt.getOriginalSizeInBytes()} bytes)`);

// Process outputs
for (let i = 0; i < outputCount; i++) {
    console.log(`\nOutput ${i}:`);
    console.log(`  Starts at: ${cursor}`);
    
    // Value length
    const valueLenVarInt = VarInt.fromBuffer(buffer, cursor);
    const valueLen = Number(valueLenVarInt.value);
    cursor += valueLenVarInt.getOriginalSizeInBytes();
    console.log(`  Value length: ${valueLen} (size: ${valueLenVarInt.getOriginalSizeInBytes()} bytes)`);
    
    // Value bytes
    console.log(`  Value bytes: ${buffer.slice(cursor, cursor + valueLen).toString('hex')}`);
    cursor += valueLen;
    
    // Token length
    const tokenLenVarInt = VarInt.fromBuffer(buffer, cursor);
    const tokenLen = Number(tokenLenVarInt.value);
    cursor += tokenLenVarInt.getOriginalSizeInBytes();
    console.log(`  Token length: ${tokenLen} (size: ${tokenLenVarInt.getOriginalSizeInBytes()} bytes)`);
    
    // Token bytes
    console.log(`  Token bytes: ${buffer.slice(cursor, cursor + tokenLen).toString('hex')}`);
    cursor += tokenLen;
    
    // Script length
    const scriptLenVarInt = VarInt.fromBuffer(buffer, cursor);
    const scriptLen = Number(scriptLenVarInt.value);
    cursor += scriptLenVarInt.getOriginalSizeInBytes();
    console.log(`  Script length: ${scriptLen} (size: ${scriptLenVarInt.getOriginalSizeInBytes()} bytes)`);
    
    // Script bytes
    console.log(`  Script bytes: ${buffer.slice(cursor, cursor + scriptLen).toString('hex')}`);
    cursor += scriptLen;
}

// Lock time
console.log(`\nLock time position: ${cursor}`);
console.log(`Lock time: ${buffer.readUInt32LE(cursor)}`);
cursor += 4;

console.log("\n=== FINAL ANALYSIS ===");
console.log(`Final cursor position: ${cursor}`);
console.log(`Buffer length: ${buffer.length}`);
console.log(`Overflow: ${cursor > buffer.length ? cursor - buffer.length : 0} bytes`);
