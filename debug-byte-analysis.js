const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');
console.log("Total buffer length:", buffer.length);

// Focus on the output section starting at position 232
const outputStart = 232;
const outputSection = buffer.subarray(outputStart, outputStart + 50);
console.log("Output section hex:", outputSection.toString('hex'));

// Breakdown of the output section
console.log("\n=== OUTPUT STRUCTURE BREAKDOWN ===");

// Value length indicator (VarInt) - should be 1 byte for small values
const valueLengthIndicator = outputSection.readUInt8(0);
console.log(`Value length indicator (VarInt): ${valueLengthIndicator} (0x${valueLengthIndicator.toString(16)})`);

// Value bytes - 8 bytes we thought were the value
const valueBytes = outputSection.subarray(1, 9);
console.log("Value bytes (8 bytes):", valueBytes.toString('hex'));

// Value interpretation as big-endian and little-endian
const valueLE = valueBytes.readBigUInt64LE();
const valueBE = valueBytes.readBigUInt64BE();
console.log("As little-endian:", valueLE.toString());
console.log("As big-endian:", valueBE.toString());

// Next byte after value bytes (should be token length indicator)
const tokenLengthIndicator = outputSection.readUInt8(9);
console.log(`Token length indicator: ${tokenLengthIndicator} (0x${tokenLengthIndicator.toString(16)})`);

// Script length indicator
const scriptLengthIndicator = outputSection.readUInt8(10);
console.log(`Script length indicator: ${scriptLengthIndicator} (0x${scriptLengthIndicator.toString(16)})`);

// Script bytes
const scriptBytes = outputSection.subarray(11, 11 + scriptLengthIndicator);
console.log("Script bytes:", scriptBytes.toString('hex'));

// Expected value pattern for 100,000,000 satoshis (1 BTC)
const expectedPattern = "0000000005f5e100"; // 100,000,000 in hex (little-endian)
console.log("\nExpected pattern for 100,000,000 satoshis:", expectedPattern);
console.log("Actual value bytes:", valueBytes.toString('hex'));
console.log("Match:", valueBytes.toString('hex') === expectedPattern ? "YES" : "NO");
