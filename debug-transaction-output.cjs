const { MainNetParams } = require('./src/net/bigtangle/params/MainNetParams');
const { Transaction } = require('./src/net/bigtangle/core/Transaction');
const { Utils } = require('./src/net/bigtangle/utils/Utils');
const { Buffer } = require('buffer');

// The expected hex from the test
const expectedHex = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

// Parse the expected hex
const expectedBuffer = Buffer.from(expectedHex, 'hex');

console.log("Expected buffer length:", expectedBuffer.length);
console.log("Expected buffer (last 20 bytes):", expectedBuffer.slice(-20).toString('hex'));

// Create a serializer and parse the block
const params = MainNetParams.get();
const serializer = params.getSerializer(true);
const block = serializer.makeBlock(expectedBuffer);

console.log("Block parsed successfully");
console.log("Number of transactions:", block.getTransactions().length);

if (block.getTransactions().length > 0) {
    const tx = block.getTransactions()[0];
    console.log("Number of outputs:", tx.getOutputs().length);
    
    if (tx.getOutputs().length > 0) {
        const output = tx.getOutputs()[0];
        console.log("First output value:", output.getValue().toString());
        console.log("First output script bytes:", output.getScriptBytes().toString('hex'));
        console.log("First output script length:", output.getScriptBytes().length);
        
        // Serialize the output back
        const serializedTx = Buffer.from(tx.bitcoinSerializeCopy());
        console.log("Serialized transaction length:", serializedTx.length);
        console.log("Serialized transaction (last 20 bytes):", serializedTx.slice(-20).toString('hex'));
        
        // Compare with expected
        console.log("Expected last 20 bytes:", expectedBuffer.slice(-20).toString('hex'));
        
        // Find the difference
        const minLength = Math.min(expectedBuffer.length, serializedTx.length);
        for (let i = 0; i < minLength; i++) {
            if (expectedBuffer[i] !== serializedTx[i]) {
                console.log(`First difference at byte ${i}: expected=0x${expectedBuffer[i].toString(16)}, got=0x${serializedTx[i].toString(16)}`);
                break;
            }
        }
        
        if (expectedBuffer.length !== serializedTx.length) {
            console.log(`Length difference: expected=${expectedBuffer.length}, got=${serializedTx.length}`);
        }
    }
}
