function debugManualParse() {
  const tip =
    "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

  // Convert hex string to array of bytes
  const bytes = [];
  for (let i = 0; i < tip.length; i += 2) {
    bytes.push(parseInt(tip.substr(i, 2), 16));
  }
  
  console.log(`Total bytes: ${bytes.length}`);
  
  // Parse the number of transactions
  // This is at position 152
  const numTransactions = bytes[152];
  console.log(`Number of transactions: ${numTransactions}`);
  
  // Parse transaction 0
  console.log(`\nParsing transaction 0 at position 153:`);
  let cursor = 153;
  
  // Version (4 bytes)
  const version0 = (bytes[cursor] & 0xff) |
                   ((bytes[cursor + 1] & 0xff) << 8) |
                   ((bytes[cursor + 2] & 0xff) << 16) |
                   ((bytes[cursor + 3] & 0xff) << 24);
  console.log(`  Version: ${version0} (bytes ${cursor}-${cursor + 3})`);
  cursor += 4;
  
  // Number of inputs (VarInt)
  const numInputs0 = bytes[cursor];
  console.log(`  Number of inputs: ${numInputs0} (byte ${cursor})`);
  cursor += 1;
  
  // Number of outputs (VarInt)
  const numOutputs0 = bytes[cursor];
  console.log(`  Number of outputs: ${numOutputs0} (byte ${cursor})`);
  cursor += 1;
  
  // LockTime (4 bytes)
  const lockTime0 = (bytes[cursor] & 0xff) |
                    ((bytes[cursor + 1] & 0xff) << 8) |
                    ((bytes[cursor + 2] & 0xff) << 16) |
                    ((bytes[cursor + 3] & 0xff) << 24);
  console.log(`  LockTime: ${lockTime0} (bytes ${cursor}-${cursor + 3})`);
  cursor += 4;
  
  console.log(`  Transaction 0 ends at position ${cursor - 1}`);
  console.log(`  Transaction 0 length: ${cursor - 153}`);
  
  // Parse transaction 1
  console.log(`\nParsing transaction 1 at position ${cursor}:`);
  
  // Version (4 bytes)
  const version1 = (bytes[cursor] & 0xff) |
                   ((bytes[cursor + 1] & 0xff) << 8) |
                   ((bytes[cursor + 2] & 0xff) << 16) |
                   ((bytes[cursor + 3] & 0xff) << 24);
  console.log(`  Version: ${version1} (bytes ${cursor}-${cursor + 3})`);
  cursor += 4;
  
  // Number of inputs (VarInt)
  const numInputs1 = bytes[cursor];
  console.log(`  Number of inputs: ${numInputs1} (byte ${cursor})`);
  cursor += 1;
  
  // Check if we have enough bytes for the inputs
  console.log(`  Bytes available for inputs: ${bytes.length - cursor}`);
  console.log(`  Bytes needed for ${numInputs1} inputs: ${numInputs1 * 68}`);
  
  if (bytes.length - cursor >= numInputs1 * 68) {
    console.log(`  Enough bytes for ${numInputs1} inputs`);
  } else {
    console.log(`  Not enough bytes for ${numInputs1} inputs`);
    const maxInputs = Math.floor((bytes.length - cursor) / 68);
    console.log(`  Maximum number of inputs possible: ${maxInputs}`);
  }
}

debugManualParse();
