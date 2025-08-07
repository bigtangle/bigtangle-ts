const { Utils } = require('./src/net/bigtangle/utils/Utils.ts');
const { TestParams } = require('./src/net/bigtangle/params/TestParams.ts');
const { TransactionOutput } = require('./src/net/bigtangle/core/TransactionOutput.ts');
const { Transaction } = require('./src/net/bigtangle/core/Transaction.ts');
const { VarInt } = require('./src/net/bigtangle/core/VarInt.ts');

const PARAMS = TestParams.get();

// Test data from BlockTest.ts testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571极3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(Utils.HEX.decode(tip));
console.log("Total buffer length:", buffer.length);

// Parse block header (80 bytes)
console.log("\n=== BLOCK HEADER ===");
console.log("Version:", buffer.readUInt32LE(0));
console.log("Previous hash:", buffer.slice(4, 36).toString('hex'));
console.log("Merkle root:", buffer.slice(36, 68).toString('hex'));
console.log("Timestamp:", buffer.readUInt32LE(68));
console.log("Target:", buffer.readUInt32LE(72));
console.log("Nonce:", buffer.readUInt32LE(76));

// Transaction count (VarInt)
let cursor = 80;
const txCountVarInt = VarInt.fromBuffer(buffer, cursor);
const txCount = Number(txCountVarInt.value);
cursor += txCountVarInt.getOriginalSizeInBytes();
console.log("\n=== TRANSACTIONS ===");
console.log("Transaction count:", txCount);

// Parse first transaction
console.log("\n=== FIRST TRANSACTION ===");
console.log("Transaction data from offset", cursor, "to end");

// Transaction version
const txVersion = buffer.readUInt32LE(cursor);
cursor += 4;
console.log("Transaction version:", txVersion);

// Input count
const inputCountVarInt = VarInt.fromBuffer(buffer, cursor);
const inputCount = Number(inputCountVarInt.value);
cursor += inputCountVarInt.getOriginalSizeInBytes();
console.log("Input count:", inputCount);

// Skip inputs for now
for (let i = 0; i < inputCount; i++) {
    // Previous transaction hash (32 bytes)
    cursor += 32;
    // Previous output index (4 bytes)
    cursor += 4;
    // Script length (VarInt)
    const scriptLenVarInt = VarInt.fromBuffer(buffer, cursor);
    cursor += scriptLenVarInt.getOriginalSizeInBytes();
    // Script bytes
    cursor += Number(scriptLenVarInt.value);
    // Sequence (4 bytes)
    cursor += 4;
}

// Output count
const outputCountVarInt = VarInt.fromBuffer(buffer, cursor);
const outputCount = Number(outputCountVarInt.value);
cursor += outputCountVarInt.getOriginalSizeInBytes();
console.log("Output count:", outputCount);

console.log("\n=== OUTPUTS ===");
for (let i = 0; i < outputCount; i++) {
    console.log(`\nOutput ${i}:`);
    console.log(`  Starts at: ${cursor}`);
    
    // Create a mock transaction output to parse this output
    const output = new TransactionOutput(PARAMS, null, buffer, cursor);
    console.log("  Value:", output.getValue().getValue().toString());
    console.log("  Token ID:", output.getValue().getTokenid().toString('hex'));
    console.log("  Script:", output.getScriptBytes().toString('hex'));
    
    cursor += output.getMessageSize();
}

console.log("\nRemaining bytes after outputs:", buffer.length - cursor);
