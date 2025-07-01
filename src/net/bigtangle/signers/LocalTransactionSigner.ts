import { StatelessTransactionSigner } from './StatelessTransactionSigner';
import { Transaction } from '../core/Transaction';
import { TransactionInput } from '../core/TransactionInput';
import { ECKey } from '../core/ECKey';
import { TransactionSignature } from '../crypto/TransactionSignature';
import { Script } from '../script/Script';
import { KeyBag } from '../wallet/KeyBag'; // Placeholder
import { RedeemData } from '../wallet/RedeemData'; // Placeholder
import { VerificationException } from '../exception/VerificationException';
import { DeterministicKey } from '../crypto/DeterministicKey';

/**
 * <p>{@link TransactionSigner} implementation for signing inputs using keys from provided {@link net.bigtangle.wallet.KeyBag}.</p>
 * <p>This signer doesn't create input scripts for tx inputs. Instead it expects inputs to contain scripts with
 * empty sigs and replaces one of the empty sigs with calculated signature.
 * </p>
 * <p>This signer is always implicitly added into every wallet and it is the first signer to be executed during tx
 * completion. As the first signer to create a signature, it stores derivation path of the signing key in a given
 * {@link ProposedTransaction} object that will be also passed then to the next signer in chain. This allows other
 * signers to use correct signing key for P2SH inputs, because all the keys involved in a single P2SH address have
 * the same derivation path.</p>
 * <p>This signer always uses {@link net.bigtangle.core.Transaction.SigHash#ALL} signing mode.</p>
 */
export class LocalTransactionSigner extends StatelessTransactionSigner {

    private static readonly MINIMUM_VERIFY_FLAGS = new Set<Script.VerifyFlag>([
        Script.VerifyFlag.P2SH,
        Script.VerifyFlag.NULLDUMMY,
    ]);

    public isReady(): boolean {
        return true;
    }

    public async signInputs(propTx: any, keyBag: KeyBag): Promise<boolean> {
        const tx: Transaction = propTx.partialTx;
        const numInputs = tx.getInputs().length;
        for (let i = 0; i < numInputs; i++) {
            const txIn = tx.getInput(i);
            if (txIn.getConnectedOutput() === null) {
                console.warn(`Missing connected output, assuming input ${i} is already signed.`);
                continue;
            }

            try {
                txIn.getScriptSig().correctlySpends(tx, i, txIn.getConnectedOutput()!.getScriptPubKey(), LocalTransactionSigner.MINIMUM_VERIFY_FLAGS);
                console.warn(`Input ${i} already correctly spends output, assuming SIGHASH type used will be safe and skipping signing.`);
                continue;
            } catch (e) {
                // Expected.
            }

            const redeemData = txIn.getConnectedRedeemData(keyBag);
            if (redeemData === null) {
                continue;
            }
            const scriptPubKey = txIn.getConnectedOutput()!.getScriptPubKey();

            // For P2SH inputs we need to share derivation path of the signing key with other signers, so that they
            // use correct key to calculate their signatures.
            // Married keys all have the same derivation path, so we can safely just take first one here.
            const pubKey: ECKey = redeemData.keys[0];
            if (pubKey instanceof DeterministicKey) {
                propTx.keyPaths.set(scriptPubKey, (pubKey as DeterministicKey).getPath());
            }

            let key: ECKey | null;
            // locate private key in redeem data. For pay-to-address and pay-to-key inputs RedeemData will always contain
            // only one key (with private bytes). For P2SH inputs RedeemData will contain multiple keys, one of which MAY
            // have private bytes
            if ((key = redeemData.getFullKey()) === null) {
                console.warn(`No local key found for input ${i}`);
                continue;
            }

            let inputScript = txIn.getScriptSig();
            const script = redeemData.redeemScript.getProgram();
            try {
                const sighash = tx.hashForSignature(i, script, Transaction.SigHash.ALL);
                const signature = await key.sign(sighash.getBytes());
                // Create a DER-encoded signature
                const derSignature = await signature.encodeDER();
                // Create a new script with the signature
                const scriptSig = Script.createInputScript(Buffer.from(derSignature), Buffer.from(key.getPubKey()));
                txIn.setScriptSig(scriptSig);
            } catch (e: any) {
                console.warn(`Error signing input ${i}: ${e.message}`);
            }
        }
        return true;
    }
}
