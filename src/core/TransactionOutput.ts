import { NetworkParameters } from "../net/bigtangle/params/NetworkParameters";
import { Transaction } from "../net/bigtangle/core/Transaction";
import { Coin } from "../net/bigtangle/core/Coin";
import { Address } from "../net/bigtangle/core/Address";
import { Utils } from "../net/bigtangle/utils/Utils";
import { Sha256Hash } from "../net/bigtangle/core/Sha256Hash";
import { TransactionOutPoint } from "../net/bigtangle/core/TransactionOutPoint";

export class TransactionOutput {
    constructor(
        private params: NetworkParameters,
        private transaction: Transaction,
        private coin: Coin,
        private pubKey: Uint8Array
    ) {}

    getValue(): Coin {
        return this.coin;
    }

    getScriptBytes(): Uint8Array {
        // Create a P2PKH script: OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG
        const pubKeyHash = Utils.sha256hash160(this.pubKey);
        const script = new Uint8Array(25);
        script[0] = 0x76; // OP_DUP
        script[1] = 0xa9; // OP_HASH160
        script[2] = 0x14; // Push 20 bytes
        script.set(pubKeyHash, 3);
        script[23] = 0x88; // OP_EQUALVERIFY
        script[24] = 0xac; // OP_CHECKSIG
        return script;
    }

    getAddressFromP2PKHScript(params: NetworkParameters): Address | null {
        const script = this.getScriptBytes();
        if (script.length === 25 && 
            script[0] === 0x76 && 
            script[1] === 0xa9 && 
            script[2] === 0x14 && 
            script[23] === 0x88 && 
            script[24] === 0xac) {
            return Address.fromP2PKH(params, Buffer.from(script.subarray(3, 23)));
        }
        return null;
    }

    getTokenid(): Uint8Array {
        return this.coin.getTokenid();
    }

    getOutPointFor(blockHash: Sha256Hash): TransactionOutPoint {
        const txId = this.transaction.getHash();
        const outputIndex = this.transaction.getOutputs().findIndex(output => 
            output.getValue().equals(this.coin) && 
            Buffer.from(output.getScriptBytes()).equals(Buffer.from(this.getScriptBytes()))
        );
        return TransactionOutPoint.fromTransactionOutPoint4(
            this.params, 
            outputIndex, 
            blockHash, 
            txId
        );
    }
}
