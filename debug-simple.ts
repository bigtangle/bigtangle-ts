import { Buffer } from "buffer";
import { Utils } from "./src/net/bigtangle/utils/Utils";

const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(Utils.HEX.decode(tip));
console.log("Buffer length:", buffer.length);

// Let's find the transaction output data by looking at the raw bytes
// The issue seems to be in the TransactionOutput parsing

// Let's look at the end of the buffer to see what's there
console.log("Last 100 bytes:", buffer.subarray(buffer.length - 100).toString('hex'));

// Let's find where the transaction data starts
// Block format: magic (4) + size (4) + header (80) + tx_count (varint) + transactions

// Skip block header
let cursor = 88; // After block header (4+4+80)

// Transaction count - this might be a VarInt
console.log("Byte at cursor:", buffer[cursor].toString(16));
console.log("Next few bytes:", buffer.subarray(cursor, cursor + 10).toString('hex'));

// Let's try to find the transaction data manually
// Look for the pattern that might indicate transaction outputs
const hexString = buffer.toString('hex');
console.log("Looking for transaction output patterns...");

// Find the position where we have output data
// Transaction outputs have: value (8 bytes) + script length + script
// Let's search for the pattern

// The test data seems to have a specific structure
// Let's look at the very end for the JSON data
const jsonStart = hexString.indexOf('7b0a2020226b7622'); // {"kv"
if (jsonStart !== -1) {
    console.log("JSON data found at position:", jsonStart / 2);
    console.log("JSON data:", hexString.substring(jsonStart));
}
