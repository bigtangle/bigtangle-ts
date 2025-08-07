import { Buffer } from "buffer";
import { TestParams } from "./src/net/bigtangle/params/TestParams";
import { Utils } from "./src/net/bigtangle/utils/Utils";
import { TransactionOutput } from "./src/net/bigtangle/core/TransactionOutput";
import { Coin } from "./src/net/bigtangle/core/Coin";

const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(Utils.HEX.decode(tip));
console.log("Buffer length:", buffer.length);

// Let's extract just the transaction output part from the test
// Based on the test, we need to look at the specific transaction output data

// Let's find where the transaction output starts by looking at the transaction structure
// Transaction format: version (4 bytes) + tx_in count + tx_in + tx_out count + tx_out + lock_time

// Skip to transaction data (after block header)
let cursor = 89; // After block header

// Transaction version
console.log("Transaction version:", buffer.readUInt32LE(cursor)); cursor += 4;

// Input count
const inputCount = buffer.readUInt8(cursor); cursor += 1;
console.log("Input count:", inputCount);

// Skip inputs (for now)
for (let i = 0; i < inputCount; i++) {
    // Previous output (36 bytes)
    cursor += 36;
    // Script length
    const scriptLen = buffer.readUInt8(cursor); cursor += 1;
    // Script + sequence
    cursor += scriptLen + 4;
}

// Output count
const outputCount = buffer.readUInt8(cursor); cursor += 1;
console.log("Output count:", outputCount);

console.log("Cursor at output start:", cursor);
console.log("Next 50 bytes:", buffer.subarray(cursor, cursor + 50).toString('hex'));

// Now let's try to parse the first output
try {
    const params = TestParams.get();
    const output = new TransactionOutput(params, null, buffer, cursor);
    console.log("Successfully parsed output!");
    console.log("Output value:", output.getValue().toString());
    console.log("Output script length:", output.getScriptBytes().length);
} catch (error) {
    console.error("Error parsing output:", error);
    
    // Let's manually parse the output structure
    console.log("\nManual parsing:");
    let pos = cursor;
    
    // Value length (VarInt)
    const valueLen = buffer.readUInt8(pos); pos += 1;
    console.log("Value length:", valueLen);
    
    if (pos + valueLen <= buffer.length) {
        const valueBytes = buffer.subarray(pos, pos + valueLen);
        console.log("Value bytes:", valueBytes.toString('hex'));
        pos += valueLen;
        
        if (pos < buffer.length) {
            // Token length (VarInt)
            const tokenLen = buffer.readUInt8(pos); pos += 1;
            console.log("Token length:", tokenLen);
            
            if (pos + tokenLen <= buffer.length) {
                const tokenBytes = buffer.subarray(pos, pos + tokenLen);
                console.log("Token bytes:", tokenBytes.toString('hex'));
                pos += tokenLen;
                
                if (pos < buffer.length) {
                    // Script length (VarInt)
                    const scriptLen = buffer.readUInt8(pos); pos += 1;
                    console.log("Script length:", scriptLen);
                    
                    if (pos + scriptLen <= buffer.length) {
                        const scriptBytes = buffer.subarray(pos, pos + scriptLen);
                        console.log("Script bytes:", scriptBytes.toString('hex'));
                    } else {
                        console.log("Not enough bytes for script");
                    }
                }
            }
        }
    }
}
