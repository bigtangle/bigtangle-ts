import { ECKey } from "../net/bigtangle/core/ECKey";
import { KeyBag } from "../net/bigtangle/wallet/KeyBag";
import { Transaction } from "../net/bigtangle/core/Transaction";
import { TransactionInput } from "../net/bigtangle/core/TransactionInput";
import { TransactionOutput } from "../net/bigtangle/core/TransactionOutput";
import { ECDSASignature } from "../net/bigtangle/core/ECDSASignature";
import { TransactionSignature } from "../net/bigtangle/crypto/TransactionSignature";
import { SigHash } from "../net/bigtangle/core/SigHash";
import { ScriptBuilder } from "../net/bigtangle/script/ScriptBuilder";
import { secp256k1 } from "@noble/curves/secp256k1";
import { NetworkParameters } from "../net/bigtangle/params/NetworkParameters";
import { Address } from "../net/bigtangle/core/Address";
import { Coin } from "../net/bigtangle/core/Coin";
import { Sha256Hash } from "../net/bigtangle/core/Sha256Hash";


import { TransactionSigner, ProposedTransaction } from "./TransactionSigner";

// Implement Address.fromP2PKHScript method
declare module "../net/bigtangle/core/Address" {
    interface AddressConstructor {
        fromP2PKHScript(params: NetworkParameters, script: Uint8Array): Address | null;
    }
}

// Add getScript method to TransactionOutput
declare module "../net/bigtangle/core/TransactionOutput" {
    interface TransactionOutput {
        getScriptBytes(): Uint8Array;
    }
}

export class LocalTransactionSigner implements TransactionSigner {
    constructor(private params: NetworkParameters) {}
    
    serialize(): Uint8Array {
        return new TextEncoder().encode(JSON.stringify({ type: "LocalTransactionSigner" }));
    }
    
    deserialize(data: Uint8Array): void {
        const obj = JSON.parse(new TextDecoder().decode(data));
        if (obj.type !== "LocalTransactionSigner") {
            throw new Error("Invalid serialized data for LocalTransactionSigner");
        }
    }

    async signInputs(
        proposal: ProposedTransaction,
        keyBag: KeyBag
    ): Promise<boolean> {
        const tx = proposal.getTransaction();
        const inputs = tx.getInputs();

        for (let i = 0; i < inputs.length; i++) {
            const txIn = inputs[i];
            const connectedOutput = txIn.getConnectedOutput();

            if (!(connectedOutput instanceof TransactionOutput)) {
                continue;
            }

            const script = connectedOutput.getScriptBytes();
            if (!script) {
                continue;
            }

            const address = Address.fromP2PKHScript(this.params, script);
            if (!address) {
                continue;
            }

            const key = await keyBag.findKeyFromPubHash(address.getHash160());
            if (!key) {
                continue;
            }

            const tokenid = connectedOutput.getValue().getTokenid();
            // Get the hash for signature (returns Uint8Array)
            const hashBytes = tx.hashForSignature(i, script, SigHash.ALL, false);
            
            // Sign the raw hash bytes directly
            const signature = await key.sign(hashBytes.getBytes());
            const txSignature = new TransactionSignature(signature, SigHash.ALL, false);
            txIn.setScriptSig(ScriptBuilder.createInputScript(txSignature, key));
        }

        return true;
    }

    isReady(): boolean {
        return true;
    }
}
