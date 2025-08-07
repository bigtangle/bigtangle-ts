import { TestParams } from "./src/net/bigtangle/params/TestParams";
import { Utils } from "./src/net/bigtangle/utils/Utils";

const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

console.log("Original tip length:", tip.length);
console.log("Original tip bytes:", tip.length / 2);

const PARAMS = TestParams.get();
const serializer = PARAMS.getSerializer(true);
const blockde = serializer.makeBlock(Buffer.from(tip, 'hex'));

console.log("Block parsed successfully");
console.log("Number of transactions:", blockde.getTransactions().length);

if (blockde.getTransactions().length > 0) {
    const tx = blockde.getTransactions()[0];
    console.log("Transaction memo:", tx.getMemo());
    console.log("Transaction memo length:", tx.getMemo()?.length);
}

const blockbyte = blockde.bitcoinSerializeCopy();
console.log("Reserialized length:", blockbyte.length);
console.log("Original length:", tip.length / 2);

console.log("Original end:", tip.slice(-48));
console.log("Reserialized end:", Utils.HEX.encode(blockbyte.slice(-24)));

// Compare byte by byte
const original = Buffer.from(tip, 'hex');
console.log("First difference at:");
for (let i = 0; i < Math.min(original.length, blockbyte.length); i++) {
    if (original[i] !== blockbyte[i]) {
        console.log(`Position ${i}: original 0x${original[i].toString(16)}, reserialized 0x${blockbyte[i].toString(16)}`);
        console.log("Context around difference:");
        console.log("Original:", original.slice(Math.max(0, i-10), Math.min(original.length, i+30)).toString('hex'));
        console.log("Reserialized:", blockbyte.slice(Math.max(0, i-10), Math.min(blockbyte.length, i+30)).toString('hex'));
        break;
    }
}
