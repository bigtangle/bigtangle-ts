import { Buffer } from "buffer";
import { TestParams } from "./src/net/bigtangle/params/TestParams";
import { Utils } from "./src/net/bigtangle/core/Utils";

// Test data from testSerial2
const testData = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buf = Buffer.from(Utils.HEX.decode(testData));

console.log("=== Block Test Data Analysis ===");
console.log("Total length:", buf.length);

// Parse block header structure
let offset = 0;

console.log("\n--- Block Header ---");
const version = buf.readUInt32LE(offset);
console.log("Version:", version);
offset += 4;

const prevBlockHash = buf.slice(offset, offset + 32);
console.log("Prev Block Hash:", prevBlockHash.toString('hex'));
offset += 32;

const prevBranchBlockHash = buf.slice(offset, offset + 32);
console.log("Prev Branch Block Hash:", prevBranchBlockHash.toString('hex'));
offset += 32;

const merkleRoot = buf.slice(offset, offset + 32);
console.log("Merkle Root:", merkleRoot.toString('hex'));
offset += 32;

const time = buf.readBigUInt64LE(offset);
console.log("Time:", time.toString());
offset += 8;

const difficultyTarget = buf.readBigUInt64LE(offset);
console.log("Difficulty Target:", difficultyTarget.toString());
offset += 8;

const lastMiningRewardBlock = buf.readBigUInt64LE(offset);
console.log("Last Mining Reward Block:", lastMiningRewardBlock.toString());
offset += 8;

const nonce = buf.readUInt32LE(offset);
console.log("Nonce:", nonce);
offset += 4;

const minerAddress = buf.slice(offset, offset + 20);
console.log("Miner Address:", minerAddress.toString('hex'));
offset += 20;

const blockType = buf.readUInt32LE(offset);
console.log("Block Type:", blockType);
offset += 4;

const height = buf.readBigUInt64LE(offset);
console.log("Height:", height.toString());
offset += 8;

console.log("\n--- Transaction Data ---");
console.log("Offset after header:", offset);
console.log("Remaining bytes:", buf.length - offset);

// Check if we have transaction data
if (offset < buf.length) {
    try {
        // Try to read transaction count
        const txCountByte = buf.readUInt8(offset);
        console.log("First byte at offset:", txCountByte);
        
        // Look for VarInt pattern
        if (txCountByte < 0xfd) {
            console.log("Transaction count (VarInt):", txCountByte);
            offset += 1;
        } else if (txCountByte === 0xfd) {
            const txCount = buf.readUInt16LE(offset + 1);
            console.log("Transaction count (VarInt 0xfd):", txCount);
            offset += 3;
        } else if (txCountByte === 0xfe) {
            const txCount = buf.readUInt32LE(offset + 1);
            console.log("Transaction count (VarInt 0xfe):", txCount);
            offset += 5;
        } else if (txCountByte === 0xff) {
            const txCount = Number(buf.readBigUInt64LE(offset + 1));
            console.log("Transaction count (VarInt 0xff):", txCount);
            offset += 9;
        }
        
        console.log("Transaction data starts at:", offset);
        
        // Show first few bytes of transaction data
        const txStart = buf.slice(offset, Math.min(offset + 50, buf.length));
        console.log("First 50 bytes of transaction data:", txStart.toString('hex'));
        
    } catch (e) {
        console.error("Error parsing transaction data:", e);
    }
}

console.log("\n--- Raw Data at Key Positions ---");
console.log("Bytes 0-8:", buf.slice(0, 8).toString('hex'));
console.log("Bytes 80-88:", buf.slice(80, 88).toString('hex'));
console.log("Bytes 160-168:", buf.slice(160, 168).toString('hex'));
console.log("Last 20 bytes:", buf.slice(-20).toString('hex'));
