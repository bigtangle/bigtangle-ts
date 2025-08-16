import { Buffer } from 'buffer';

function debugTransactionInput() {
  const tip =
    "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

  // Convert hex string to buffer
  const buffer = Buffer.from(tip, 'hex');
  console.log(`Buffer length: ${buffer.length}`);
  
  // Let's look at the data around offset 519
  const offset = 519;
  console.log(`Data at offset ${offset}:`);
  for (let i = offset; i < Math.min(offset + 50, buffer.length); i++) {
    console.log(`  ${i}: ${buffer[i].toString(16).padStart(2, '0')}`);
  }
  
  // Let's also look at the data around offset 517
  const offset2 = 517;
  console.log(`Data at offset ${offset2}:`);
  for (let i = offset2; i < Math.min(offset2 + 50, buffer.length); i++) {
    console.log(`  ${i}: ${buffer[i].toString(16).padStart(2, '0')}`);
  }
  
  // Let's also look at the data around offset 515
  const offset3 = 515;
  console.log(`Data at offset ${offset3}:`);
  for (let i = offset3; i < Math.min(offset3 + 50, buffer.length); i++) {
    console.log(`  ${i}: ${buffer[i].toString(16).padStart(2, '0')}`);
  }
}

debugTransactionInput();
