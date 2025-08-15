/*******************************************************************************
*  Copyright   2018  Inasset GmbH.
 *
 *******************************************************************************/

import { UTXO } from '../core/UTXO';
import { Sha256Hash } from '../core/Sha256Hash';
import { NetworkParameters } from '../params/NetworkParameters';
import { TransactionOutput } from '../core/TransactionOutput';
import { TransactionOutPoint } from '../core/TransactionOutPoint';
import { Buffer } from 'buffer';
import { Coin } from '../core/Coin'; // Add missing import

export class FreeStandingTransactionOutput extends TransactionOutput {
    private output: UTXO;
    private networkParams: NetworkParameters; // Store params locally

    /**
     * Construct a free standing Transaction Output.
     *
     * @param params The network parameters.
     * @param output The stored output (free standing).
     */
    constructor(params: NetworkParameters, output: UTXO) {
        // Handle possible null values from UTXO
        const value = output.getValue() || Coin.ZERO;
        const script = output.getScript();
        // Convert Uint8Array to Buffer if needed
        let scriptBytes: Buffer;
        if (script) {
            const program = script.getProgram();
            scriptBytes = Buffer.isBuffer(program) ? program : Buffer.from(program);
        } else {
            scriptBytes = Buffer.alloc(0);
        }
        
        super(params, null, value, scriptBytes);
        this.networkParams = params; // Store params locally
        this.output = output;
    }

    /**
     * Get the {@link UTXO}.
     *
     * @return The stored output.
     */
    public getUTXO(): UTXO {
        return this.output;
    }

    public getIndex(): number {
        return this.output.getIndex();
    }

    public getParentTransactionHash(): Sha256Hash {
        const txHash = this.output.getTxHash();
        return txHash || Sha256Hash.ZERO_HASH;
    }

    // Implement missing methods from TransactionOutput
    public getValue(): Coin {
        return this.output.getValue() || Coin.ZERO;
    }

    public getScriptBytes(): Buffer {
        const script = this.output.getScript();
        if (!script) return Buffer.alloc(0);
        
        const program = script.getProgram();
        return Buffer.isBuffer(program) ? program : Buffer.from(program);
    }

    public getOutPointFor(containingBlockHash: Sha256Hash): TransactionOutPoint {
        return TransactionOutPoint.fromTx4(
            this.networkParams, // Use locally stored params
            this.getIndex(),
            containingBlockHash,
            null // fromTx is null for free standing outputs
        );
    }
}
