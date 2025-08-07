// Simplified debug script to analyze Java serialization format
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');
console.log("Total buffer length:", buffer.length);

// Parse block header (80 bytes)
console.log("\n=== BLOCK HEADER ===");
console.log("Version:", buffer.readUInt32LE(0));
console.log("Previous hash:", buffer.subarray(4, 36).toString('hex'));
console.log("Merkle root:", buffer.subarray(36, 68).toString('hex'));
console.log("Timestamp:", buffer.readUInt32LE(68));
console.log("Target:", buffer.readUInt32LE(72));
console.log("Nonce:", buffer.readUInt32LE(76));

// Transaction count (VarInt simulation)
let cursor = 80;
const txCount = buffer.readUInt8(cursor);
cursor += 1;
console.log("\n=== TRANSACTIONS ===");
console.log("Transaction count:", txCount);
console.log("First transaction starts at:", cursor);

// Output analysis
console.log("\n=== OUTPUTS ANALYSIS ===");

// First output starts at cursor + 4 (transaction version) + input data
const outputStart = cursor + 4 + 32 + 4 + 1 + 106 + 4; // Simplified calculation
console.log("First output starts at:", outputStart);

// First output value bytes
const valueBytes = buffer.subarray(outputStart, outputStart + 8);
console.log("Value bytes (8 bytes):", valueBytes.toString('hex'));

// Convert to bigint
const value = valueBytes.readBigUInt64LE();
console.log("Value as BigInt:", value.toString());
console.log("Value as number:", Number(value));

// Token bytes (should be empty for base token)
const tokenBytes = buffer.subarray(outputStart + 8, outputStart + 8);
console.log("Token bytes length:", 0); // Should be 0 for base token

// Script length (VarInt simulation)
const scriptLength = buffer.readUInt8(outputStart + 8);
console.log("Script length:", scriptLength);

// Script bytes
const scriptBytes = buffer.subarray(outputStart + 9, outputStart + 9 + scriptLength);
console.log("Script bytes:", scriptBytes.toString('hex'));

console.log("\n=== ANALYSIS ===");
console.log("Expected value: 100000000 (1 BTC)");
console.log("Actual value:", value.toString());
console.log("Match:", value === BigInt(100000000) ? "YES" : "NO");
