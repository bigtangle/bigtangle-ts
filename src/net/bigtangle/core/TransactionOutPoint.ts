import { ChildMessage } from './ChildMessage';
import { Sha256Hash } from './Sha256Hash';
import { Transaction } from './Transaction';
import { TransactionOutput } from './TransactionOutput';
import { ECKey } from './ECKey';
import { NetworkParameters } from '../params/NetworkParameters'; 
import { Utils } from '../utils/Utils';
import { Buffer } from 'buffer';
import { MessageSerializer } from './MessageSerializer';
import { Message } from './Message';
import { KeyBag } from '../wallet/KeyBag';
import { RedeemData } from '../wallet/RedeemData';
import { ScriptException } from '../exception/ScriptException';
import { Script } from '../script/Script';
import { ProtocolVersion } from './ProtocolVersion';

/**
 * <p>
 * This message is a reference or pointer to an output of a different
 * transaction.
 * </p>
 * 
 * <p>
 * Instances of this class are not safe for use by multiple threads.
 * </p>
 */
export class TransactionOutPoint extends ChildMessage {
    public static readonly MESSAGE_LENGTH = 4 + 32 + 32;

    /** Hash of the block to which we refer. */
    private blockHash: Sha256Hash = Sha256Hash.ZERO_HASH;
    /** Hash of the transaction to which we refer. */
    private txHash: Sha256Hash = Sha256Hash.ZERO_HASH;
    /** Which output of that transaction we are talking about. */
    private index: number = 0;

    // This is not part of bitcoin serialization. It points to the connected
    // transaction.
    public fromTx: Transaction | null = null;

    // The connected output.
    public connectedOutput: TransactionOutput | null = null;

    public static fromTx(params: NetworkParameters, index: number, blockHash: Sha256Hash | null, fromTx: Transaction | null): TransactionOutPoint {
        const outpoint = new TransactionOutPoint(params, index, Sha256Hash.ZERO_HASH, Sha256Hash.ZERO_HASH);
        
        if (fromTx != null && blockHash != null) {
            outpoint.blockHash = blockHash;
            outpoint.txHash = fromTx.getHash();
            outpoint.fromTx = fromTx;
        }
        outpoint.length = TransactionOutPoint.MESSAGE_LENGTH;
        return outpoint;
    }

    public static fromOutput(params: NetworkParameters, blockHash: Sha256Hash | null, connectedOutput: TransactionOutput): TransactionOutPoint {
        const parentTxHash = connectedOutput.getParentTransactionHash();
        const outpoint = new TransactionOutPoint(params, connectedOutput.getIndex(), blockHash || Sha256Hash.ZERO_HASH, parentTxHash || Sha256Hash.ZERO_HASH);
        outpoint.connectedOutput = connectedOutput;
        return outpoint;
    }

    constructor(params: NetworkParameters, index: number, blockHash: Sha256Hash | null, transactionHash: Sha256Hash | null);
    /**
     * Deserializes the message. This is usually part of a transaction message.
     */
    constructor(params: NetworkParameters, payload: Buffer, offset: number);
    /**
     * Deserializes the message. This is usually part of a transaction message.
     * 
     * @param params     NetworkParameters object.
     * @param offset     The location of the first payload byte within the array.
     * @param serializer the serializer to use for this message.
     * @throws ProtocolException
     */
    constructor(params: NetworkParameters, payload: Buffer, offset: number, parent: Message, serializer: MessageSerializer<any>);
    constructor(...args: any[]) {
        const params = args[0];
        super(params);
        
        if (args.length === 3 && args[1] instanceof Buffer) {
            // Constructor: (params, payload, offset)
            const payload = args[1];
            const offset = args[2];
            super(params, payload, offset);
        } else if (args.length === 5) {
            // Constructor: (params, payload, offset, parent, serializer)
            const payload = args[1];
            const offset = args[2];
            const parent = args[3];
            const serializer = args[4];
            // Initialize fields directly instead of calling super with too many args
            this.serializer = serializer;
            this.protocolVersion = params.getProtocolVersionNum(ProtocolVersion.CURRENT);
            this.params = params;
            this.payload = payload;
            this.offset = offset;
            this.cursor = offset;
            this.length = TransactionOutPoint.MESSAGE_LENGTH;
            this.parent = parent;
            this.parse();
        } else if (args.length === 4) {
            // Constructor: (params, index, blockHash, transactionHash)
            const index = args[1];
            const blockHash = args[2];
            const transactionHash = args[3];
            
            this.index = index;
            this.blockHash = blockHash || Sha256Hash.ZERO_HASH;
            this.txHash = transactionHash || Sha256Hash.ZERO_HASH;
            this.fromTx = null;
            this.length = TransactionOutPoint.MESSAGE_LENGTH;
        } else {
            throw new Error("Invalid constructor arguments");
        }
    }

    protected parse(): void {
        this.length = TransactionOutPoint.MESSAGE_LENGTH;
        this.blockHash = this.readHash();
        this.txHash = this.readHash();
        this.index = this.readUint32();
    }

    public bitcoinSerializeToStream(stream: any): void {
        stream.write(this.blockHash.getReversedBytes());
        stream.write(this.txHash.getReversedBytes());
        Utils.uint32ToByteStreamLE(this.index, stream);
    }

    /**
     * An outpoint is a part of a transaction input that points to the output of
     * another transaction. If we have both sides in memory, and they have been
     * linked together, this returns a pointer to the connected output, or null if
     * there is no such connection.
     */
    public getConnectedOutput(): TransactionOutput | null {
        if (this.fromTx != null) {
            return this.fromTx.getOutputs()[this.index];
        } else if (this.connectedOutput != null) {
            return this.connectedOutput;
        }
        return null;
    }

    /**
     * Returns the pubkey script from the connected output.
     * 
     * @throws Error if there is no connected output.
     */
    public getConnectedPubKeyScript(): Buffer {
        const connectedOutput = this.getConnectedOutput();
        if (!connectedOutput) {
            throw new Error("Input is not connected so cannot retrieve key");
        }
        const result = connectedOutput.getScriptBytes();
        if (!result || result.length === 0) {
            throw new Error("Connected output has no script bytes");
        }
        return result;
    }

    /**
     * Returns the ECKey identified in the connected output, for either
     * pay-to-address scripts or pay-to-key scripts. For P2SH scripts you can use
     * {@link #getConnectedRedeemData(net.bigtangle.wallet.KeyBag)} and then get the
     * key from RedeemData. If the script form cannot be understood, throws
     * ScriptException.
     *
     * @return an ECKey or null if the connected key cannot be found in the wallet.
     */
    public async getConnectedKey(keyBag: KeyBag): Promise<ECKey | null> {
        const connectedOutput = this.getConnectedOutput();
        if (!connectedOutput) {
            throw new Error("Input is not connected so cannot retrieve key");
        }
        const connectedScript = connectedOutput.getScriptPubKey();
        if (connectedScript.isSentToAddress()) {
            const addressBytes = connectedScript.getPubKeyHash();
            return keyBag.findKeyFromPubHash(addressBytes);
        } else if (connectedScript.isSentToRawPubKey()) {
            const pubkeyBytes = connectedScript.getPubKey();
            return keyBag.findKeyFromPubKey(pubkeyBytes);
        } else if (connectedScript.isSentToMultiSig()) {
            const pubKeys = connectedScript.getPubKeys();
            for (const ec of pubKeys) {
                const key = await keyBag.findKeyFromPubKey(ec.getPubKey());
                if (key) {
                    return key;
                }
            }
            return null;
        } else {
            throw new ScriptException("Could not understand form of connected output script: " + connectedScript.toString());
        }
    }

    /**
     * Returns the RedeemData identified in the connected output, for either
     * pay-to-address scripts, pay-to-key or P2SH scripts. If the script forms
     * cannot be understood, throws ScriptException.
     *
     * @return a RedeemData or null if the connected data cannot be found in the
     *         wallet.
     */
    public async getConnectedRedeemData(keyBag: KeyBag): Promise<RedeemData | null> {
        const connectedOutput = this.getConnectedOutput();
        if (!connectedOutput) {
            throw new Error("Input is not connected so cannot retrieve key");
        }
        const connectedScript = connectedOutput.getScriptPubKey();
        if (connectedScript.isSentToAddress()) {
            const addressBytes = connectedScript.getPubKeyHash();
            const key = await keyBag.findKeyFromPubHash(addressBytes);
            return key ? RedeemData.of(key, connectedScript) : null;
        } else if (connectedScript.isSentToRawPubKey()) {
            const pubkeyBytes = connectedScript.getPubKey();
            const key = await keyBag.findKeyFromPubKey(pubkeyBytes);
            return key ? RedeemData.of(key, connectedScript) : null;
        } else if (connectedScript.isPayToScriptHash()) {
            const scriptHash = connectedScript.getPubKeyHash();
            return keyBag.findRedeemDataFromScriptHash(scriptHash);
        } else if (connectedScript.isSentToMultiSig()) {
            const key = await this.getConnectedKey(keyBag);
            return key ? RedeemData.of([key], connectedScript) : null;
        } else {
            throw new ScriptException("Could not understand form of connected output script: " + connectedScript.toString());
        }
    }

    public toString(): string {
        return this.blockHash.toString() + " : " + this.txHash.toString() + " : " + this.index;
    }

    /**
     * Returns the hash of the outpoint.
     */
    public getHash(): Sha256Hash {
        return Sha256Hash.of(Buffer.concat([this.blockHash.getBytes(), this.txHash.getBytes()]));
    }

    public getTxHash(): Sha256Hash {
        return this.txHash;
    }

    public getBlockHash(): Sha256Hash {
        return this.blockHash;
    }

    public getIndex(): number {
        return this.index;
    }

    public setIndex(index: number): void {
        this.index = index;
    }

    /**
     * Coinbase transactions have special outPoints with hashes of zero. If this is
     * such an outPoint, returns true.
     */
    public isCoinBase(): boolean {
        return this.getBlockHash().equals(Sha256Hash.ZERO_HASH) && 
               this.getTxHash().equals(Sha256Hash.ZERO_HASH) &&
               (this.getIndex() & 0xFFFFFFFF) === 0xFFFFFFFF;
    }

    public equals(o: any): boolean {
        if (this === o) return true;
        if (o == null || !(o instanceof TransactionOutPoint)) return false;
        const other = o as TransactionOutPoint;
        return this.getIndex() === other.getIndex() && this.getHash().equals(other.getHash());
    }

    public hashCode(): number {
        let result = 17;
        result = 31 * result + this.index;
        // Use the first 4 bytes of the hash as a numeric hash code
        const hashBytes = this.getHash().getBytes();
        const hashCode = hashBytes.readInt32BE(0);
        result = 31 * result + hashCode;
        return result;
    }
}