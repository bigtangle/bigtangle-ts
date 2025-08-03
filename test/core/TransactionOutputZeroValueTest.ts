import { MainNetParams } from '../../src/net/bigtangle/params/MainNetParams';
import { Transaction } from '../../src/net/bigtangle/core/Transaction';
import { TransactionOutput } from '../../src/net/bigtangle/core/TransactionOutput';
import { Coin } from '../../src/net/bigtangle/core/Coin';
import { Buffer } from 'buffer';
import { ScriptBuilder } from '../../src/net/bigtangle/script/ScriptBuilder';
import { ECKey } from '../../src/net/bigtangle/core/ECKey';
import bigInt from 'big-integer';

describe('TransactionOutputZeroValueTest', () => {
    test('testZeroValueSerialization', () => {
        const params = MainNetParams.get();
        const tx = new Transaction(params);
        
        // Create a key for the output
        const key = ECKey.fromPrivate(bigInt("0000000000000000000000000000000000000000000000000000000000000001", 16), true);
        const script = ScriptBuilder.createOutputScript(key);
        
        // Create a TransactionOutput with zero value
        const zeroCoin = new Coin(0n, Buffer.from("bc", "hex"));
        const output = new TransactionOutput(params, tx, zeroCoin, Buffer.from(script.getProgram()));
        
        // Serialize the output
        const serialized = output.unsafeBitcoinSerialize();
        console.log("Serialized output length:", serialized.length);
        console.log("Serialized output:", serialized.toString('hex'));
        
        // Deserialize the output
        const deserializedOutput = new TransactionOutput(params, tx, serialized, 0);
        
        // Check that the value is still zero
        expect(deserializedOutput.getValue().getValue()).toBe(0n);
        expect(deserializedOutput.getValue().getTokenid().toString('hex')).toBe("bc");
    });
});
