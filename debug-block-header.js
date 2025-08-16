function debugBlockHeader() {
  const tip =
    "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

  // Convert hex string to array of bytes
  const bytes = [];
  for (let i = 0; i < tip.length; i += 2) {
    bytes.push(parseInt(tip.substr(i, 2), 16));
  }
  
  console.log(`Total bytes: ${bytes.length}`);
  
  // Parse the block header (168 bytes)
  console.log(`Parsing block header (168 bytes):`);
  let cursor = 0;
  
  // Version (4 bytes)
  const version = (bytes[cursor] & 0xff) |
                  ((bytes[cursor + 1] & 0xff) << 8) |
                  ((bytes[cursor + 2] & 0xff) << 16) |
                  ((bytes[cursor + 3] & 0xff) << 24);
  console.log(`  Version: ${version} (bytes ${cursor}-${cursor + 3})`);
  cursor += 4;
  
  // Previous block hash (32 bytes)
  console.log(`  Previous block hash: bytes ${cursor}-${cursor + 31}`);
  cursor += 32;
  
  // Previous branch block hash (32 bytes)
  console.log(`  Previous branch block hash: bytes ${cursor}-${cursor + 31}`);
  cursor += 32;
  
  // Merkle root (32 bytes)
  console.log(`  Merkle root: bytes ${cursor}-${cursor + 31}`);
  cursor += 32;
  
  // Time (4 bytes)
  const time = (bytes[cursor] & 0xff) |
               ((bytes[cursor + 1] & 0xff) << 8) |
               ((bytes[cursor + 2] & 0xff) << 16) |
               ((bytes[cursor + 3] & 0xff) << 24);
  console.log(`  Time: ${time} (bytes ${cursor}-${cursor + 3})`);
  cursor += 4;
  
  // Difficulty target (4 bytes)
  const difficultyTarget = (bytes[cursor] & 0xff) |
                           ((bytes[cursor + 1] & 0xff) << 8) |
                           ((bytes[cursor + 2] & 0xff) << 16) |
                           ((bytes[cursor + 3] & 0xff) << 24);
  console.log(`  Difficulty target: ${difficultyTarget} (bytes ${cursor}-${cursor + 3})`);
  cursor += 4;
  
  // Last mining reward block (8 bytes)
  console.log(`  Last mining reward block: bytes ${cursor}-${cursor + 7}`);
  cursor += 8;
  
  // Nonce (4 bytes)
  const nonce = (bytes[cursor] & 0xff) |
                ((bytes[cursor + 1] & 0xff) << 8) |
                ((bytes[cursor + 2] & 0xff) << 16) |
                ((bytes[cursor + 3] & 0xff) << 24);
  console.log(`  Nonce: ${nonce} (bytes ${cursor}-${cursor + 3})`);
  cursor += 4;
  
  // Miner address (20 bytes)
  console.log(`  Miner address: bytes ${cursor}-${cursor + 19}`);
  cursor += 20;
  
  // Block type (4 bytes)
  const blockType = (bytes[cursor] & 0xff) |
                    ((bytes[cursor + 1] & 0xff) << 8) |
                    ((bytes[cursor + 2] & 0xff) << 16) |
                    ((bytes[cursor + 3] & 0xff) << 24);
  console.log(`  Block type: ${blockType} (bytes ${cursor}-${cursor + 3})`);
  cursor += 4;
  
  // Height (8 bytes)
  console.log(`  Height: bytes ${cursor}-${cursor + 7}`);
  cursor += 8;
  
  console.log(`  Header ends at position ${cursor - 1}`);
  console.log(`  Header length: ${cursor}`);
  
  // Parse the number of transactions
  console.log(`\nParsing number of transactions at position ${cursor}:`);
  
  // The number of transactions is a VarInt
  // For simplicity, we'll assume it's a single byte
  const numTransactions = bytes[cursor];
  console.log(`  Number of transactions: ${numTransactions} (byte ${cursor})`);
  cursor += 1;
  
  console.log(`\nTransactions should start at position ${cursor}`);
}

debugBlockHeader();
