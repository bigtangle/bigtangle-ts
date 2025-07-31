import { ChildMessage } from './ChildMessage';
import { Sha256Hash } from './Sha256Hash';
import { Transaction } from './Transaction';
import { TransactionOutput } from './TransactionOutput';
 
import { ECKey } from './ECKey';
import { NetworkParameters } from '../params/NetworkParameters'; 
import { Utils } from '../utils/Utils';
import { Buffer } from 'buffer';
import { MessageSerializer } from './MessageSerializer';
import { DummySerializer } from './DummySerializer';
import { Message } from './Message';
import { KeyBag } from '../wallet/KeyBag';
import { RedeemData } from '../wallet/RedeemData';
import { ScriptException } from '../exception/ScriptException';
 

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

    private blockHash: Sha256Hash | null = null;
    private txHash: Sha256Hash | null = null;
    private index: number = 0;

    public fromTx: Transaction | null = null;
    public connectedOutput: TransactionOutput | null = null;

    constructor(params: NetworkParameters, index: number, blockHash: Sha256Hash | null, fromTx: Transaction | null);
    constructor(params: NetworkParameters, index: number, blockHash: Sha256Hash | null, transactionHash: Sha256Hash | null);
    constructor(params: NetworkParameters, blockHash: Sha256Hash | null, connectedOutput: TransactionOutput);
    constructor(params: NetworkParameters, payload: Buffer, offset: number);
    constructor(params: NetworkParameters, payload: Buffer, offset: number, parent: Message, serializer: MessageSerializer<any>);
    constructor(...args: any[]) {
        // Call super first unconditionally
        super(args[0]);
        
        // Now initialize properties based on constructor signature
        if (args.length === 5) {
            // (params, payload, offset, parent, serializer)
            this.parseFromPayload(args[1], args[2], args[4], args[3]);
        } else if (args.length === 3 && args[1] instanceof Buffer) {
            // (params, payload, offset)
            this.parseFromPayload(args[1], args[2]);
        } else if (args.length === 4) {
            if (typeof args[1] === 'number') {
                // (params, index, blockHash, fromTxOrTransactionHash)
                this.index = args[1];
                // Ensure blockHash is a Sha256Hash object
                if (args[2] instanceof Sha256Hash) {
                    this.blockHash = args[2];
                } else if (args[2] === null) {
                    this.blockHash = null;
                } else {
                    // If it's not a Sha256Hash object, try to convert it
                    try {
                        // Check if args[2] is a Buffer or can be converted to one
                        let buffer: Buffer;
                        if (Buffer.isBuffer(args[2])) {
                            buffer = args[2];
                        } else if (typeof args[2] === 'object' && args[2] !== null && 'getBytes' in args[2]) {
                            // If it's already a Sha256Hash-like object with getBytes method
                            buffer = (args[2] as any).getBytes();
                        } else {
                            // Try to convert to Buffer
                            buffer = Buffer.from(args[2]);
                        }
                        this.blockHash = Sha256Hash.wrap(buffer);
                    } catch (e) {
                        this.blockHash = Sha256Hash.ZERO_HASH;
                    }
                }
                // Check if the fourth argument is a Transaction or a Sha256Hash
                if (args[3] instanceof Transaction) {
                    this.fromTx = args[3];
                    // Only call getHash() if fromTx is not null and has the method
                    if (this.fromTx && typeof this.fromTx.getHash === 'function') {
                        this.txHash = this.fromTx.getHash();
                    } else {
                        this.txHash = Sha256Hash.ZERO_HASH;
                    }
                } else if (args[3] instanceof Sha256Hash) {
                    this.txHash = args[3];
                    this.fromTx = null;
                } else if (args[3] === null) {
                    this.txHash = Sha256Hash.ZERO_HASH;
                    this.fromTx = null;
                } else {
                    // Try to convert to Sha256Hash
                    try {
                        let buffer: Buffer;
                        if (Buffer.isBuffer(args[3])) {
                            buffer = args[3];
                        } else if (typeof args[3] === 'object' && args[3] !== null && 'getBytes' in args[3]) {
                            // If it's already a Sha256Hash-like object with getBytes method
                            buffer = (args[3] as any).getBytes();
                        } else {
                            // Try to convert to Buffer
                            buffer = Buffer.from(args[3]);
                        }
                        this.txHash = Sha256Hash.wrap(buffer);
                        this.fromTx = null;
                    } catch (e) {
                        this.txHash = Sha256Hash.ZERO_HASH;
                        this.fromTx = null;
                    }
                }
            } else {
                // (params, blockHash, connectedOutput)
                // Ensure blockHash is a Sha256Hash object
                if (args[1] instanceof Sha256Hash) {
                    this.blockHash = args[1];
                } else if (args[1] === null) {
                    this.blockHash = null;
                } else {
                    // If it's not a Sha256Hash object, try to convert it
                    try {
                        // Check if args[1] is a Buffer or can be converted to one
                        let buffer: Buffer;
                        if (Buffer.isBuffer(args[1])) {
                            buffer = args[1];
                        } else if (typeof args[1] === 'object' && args[1] !== null && 'getBytes' in args[1]) {
                            // If it's already a Sha256Hash-like object with getBytes method
                            buffer = (args[1] as any).getBytes();
                        } else {
                            // Try to convert to Buffer
                            buffer = Buffer.from(args[1]);
                        }
                        this.blockHash = Sha256Hash.wrap(buffer);
                    } catch (e) {
                        this.blockHash = Sha256Hash.ZERO_HASH;
                    }
                }
                this.connectedOutput = args[2];
                if (this.connectedOutput) {
                    this.index = this.connectedOutput.getIndex();
                    this.txHash = this.connectedOutput.getParentTransactionHash();
                } else {
                    this.index = 0;
                    this.txHash = Sha256Hash.ZERO_HASH;
                }
            }
        } else if (args.length === 3 && !(args[1] instanceof Buffer)) {
            // (params, index, blockHash, transactionHash)
            this.index = args[1];
            // Ensure blockHash is a Sha256Hash object
            if (args[2] instanceof Sha256Hash) {
                this.blockHash = args[2];
            } else {
                // If it's not a Sha256Hash object, try to convert it
                try {
                    // Check if args[2] is a Buffer or can be converted to one
                    let buffer: Buffer;
                    if (Buffer.isBuffer(args[2])) {
                        buffer = args[2];
                    } else if (typeof args[2] === 'object' && args[2] !== null && 'getBytes' in args[2]) {
                        // If it's already a Sha256Hash-like object with getBytes method
                        buffer = (args[2] as any).getBytes();
                    } else {
                        // Try to convert to Buffer
                        buffer = Buffer.from(args[2]);
                    }
                    this.blockHash = Sha256Hash.wrap(buffer);
                } catch (e) {
                    this.blockHash = Sha256Hash.ZERO_HASH;
                }
            }
            this.txHash = args[3];
        } else {
            // Default initialization
            this.blockHash = null;
            this.txHash = null;
            this.index = 0;
            this.fromTx = null;
            this.connectedOutput = null;
        }
        this.length = TransactionOutPoint.MESSAGE_LENGTH;
        
        // Initialize serializer to prevent null errors
        if (!this.serializer) {
            // Using DummySerializer equivalent that matches MessageSerializer<NetworkParameters> type
            this.serializer = {
                params: null,
                parseRetain: false,
                isParseRetainMode: () => false,
                deserialize: () => { throw new Error("Not implemented"); },
                makeAlertMessage: () => { throw new Error("Not implemented"); },
                makeBlock: () => { throw new Error("Not implemented"); },
                makeZippedBlock: async () => { throw new Error("Not implemented"); },
                makeZippedBlockStream: async () => { throw new Error("Not implemented"); },
                makeTransaction: () => { throw new Error("Not implemented"); },
                makeTransactionFromBytes: () => { throw new Error("Not implemented"); },
                seekPastMagicBytes: () => { throw new Error("Not implemented"); },
                serialize: () => { throw new Error("Not implemented"); },
                serializeMessage: () => { throw new Error("Not implemented"); }
            } as unknown as MessageSerializer<NetworkParameters>;
        }
    }
    
    // Helper method to handle payload-based initialization
    private parseFromPayload(payload: Buffer, offset: number, serializer?: MessageSerializer<any>, parent?: Message): void {
        // Set payload and offset for parsing
        this.payload = payload;
        this.offset = offset;
        this.cursor = offset;
        
        // Set serializer and parent if provided
        if (serializer) {
            this.serializer = serializer;
        }
        if (parent) {
            this.parent = parent;
        }
        
        // Call parse to initialize from payload
        this.parse();
    }

    protected parse(): void {
        // Check if we have enough bytes to parse a TransactionOutPoint
        if (!this.payload) throw new Error("Payload is null");
        if (this.cursor + TransactionOutPoint.MESSAGE_LENGTH > this.payload.length) {
            throw new Error(`Not enough bytes to read TransactionOutPoint: requested ${TransactionOutPoint.MESSAGE_LENGTH}, available ${this.payload.length - this.cursor}`);
        }
        
        this.length = TransactionOutPoint.MESSAGE_LENGTH;
        this.blockHash = this.readHash();
        this.txHash = this.readHash();
        this.index = this.readUint32();
    }

    public bitcoinSerializeToStream(stream: any): void {
        stream.write(this.blockHash ? this.blockHash.getReversedBytes() : Sha256Hash.ZERO_HASH.getReversedBytes());
        stream.write(this.txHash ? this.txHash.getReversedBytes() : Sha256Hash.ZERO_HASH.getReversedBytes());
        Utils.uint32ToByteStreamLE(this.index, stream);
    }

    /**
     * An outpoint is a part of a transaction input that points to the output of
     * another transaction. If we have both sides in memory, and they have been
     * linked together, this returns a pointer to the connected output, or null
     * if there is no such connection.
     */
    public getConnectedOutput(): TransactionOutput | null {
        if (this.fromTx !== null) {
             
            //genisis block has no fromTx   
            if (typeof this.fromTx.getOutputs === 'function') { 
                return this.fromTx.getOutputs()[this.index];
            }
        } else if (this.connectedOutput !== null) {
            return this.connectedOutput;
        }
        return null;
    }

    /**
     * Returns the pubkey script from the connected output.
     * 
     * @throws java.lang.NullPointerException
     *             if there is no connected output.
     */
    public getConnectedPubKeyScript(): Buffer {
        const result = this.getConnectedOutput()?.getScriptBytes();
        if (!result) throw new Error("No connected output or script bytes");
        return result;
    }

    /**
     * Returns the ECKey identified in the connected output, for either
     * pay-to-address scripts or pay-to-key scripts. For P2SH scripts you can
     * use {@link #getConnectedRedeemData(net.bigtangle.wallet.KeyBag)} and then
     * get the key from RedeemData. If the script form cannot be understood,
     * throws ScriptException.
     *
     * @return an ECKey or null if the connected key cannot be found in the
     *         wallet.
     */
    public getConnectedKey(keyBag: KeyBag): Promise<ECKey | null> {
        const connectedOutput = this.getConnectedOutput();
        if (!connectedOutput) throw new Error("Input is not connected so cannot retrieve key");
        const connectedScript = connectedOutput.getScriptPubKey();
        if (connectedScript.isSentToAddress()) {
            const addressBytes = connectedScript.getPubKeyHash();
            return keyBag.findKeyFromPubHash(addressBytes);
        } else if (connectedScript.isSentToRawPubKey()) {
            const pubkeyBytes = connectedScript.getPubKey();
            return keyBag.findKeyFromPubKey(pubkeyBytes);
        } else if (connectedScript.isSentToMultiSig()) {
            return this.getConnectedKeyWithECKeys(keyBag, connectedScript.getPubKeys());
        } else {
            throw new ScriptException("Could not understand form of connected output script: " + connectedScript.toString());
        }
    }

    public getConnectedKeyWithECKeys(keyBag: KeyBag, ecs: ECKey[]): Promise<ECKey | null> {
        for (const ec of ecs) {
            return keyBag.findKeyFromPubKey(ec.getPubKey());
        }
        throw new ScriptException("Could not understand form of connected output script: " + ecs.toString());
    }

    /**
     * Returns the RedeemData identified in the connected output, for either
     * pay-to-address scripts, pay-to-key or P2SH scripts. If the script forms
     * cannot be understood, throws ScriptException.
     *
     * @return a RedeemData or null if the connected data cannot be found in the
     *         wallet.
     */
    public getConnectedRedeemData(keyBag: KeyBag): Promise<RedeemData | null> {
        const connectedOutput = this.getConnectedOutput();
        if (!connectedOutput) throw new Error("Input is not connected so cannot retrieve key");
        const connectedScript = connectedOutput.getScriptPubKey();
        if (connectedScript.isSentToAddress()) {
            const addressBytes = connectedScript.getPubKeyHash();
            return keyBag.findKeyFromPubHash(addressBytes).then(key => 
                key ? RedeemData.of(key, connectedScript) : null
            );
        } else if (connectedScript.isSentToRawPubKey()) {
            const pubkeyBytes = connectedScript.getPubKey();
            return keyBag.findKeyFromPubKey(pubkeyBytes).then(key => 
                key ? RedeemData.of(key, connectedScript) : null
            );
        } else if (connectedScript.isPayToScriptHash()) {
            const scriptHash = connectedScript.getPubKeyHash();
            return keyBag.findRedeemDataFromScriptHash(scriptHash);
        } else if (connectedScript.isSentToMultiSig()) {
            return this.getConnectedKey(keyBag).then(key => 
                key ? RedeemData.of([key], connectedScript) : null
            );
        } else {
            throw new ScriptException("Could not understand form of connected output script: " + connectedScript.toString());
        }
    }

    public toString(): string {
        return `${this.blockHash} : ${this.txHash} : ${this.index}`;
    }

    /**
     * Returns the hash of the outpoint.
     */
    public getHash(): Sha256Hash {
        // Assuming Sha256Hash.of can take concatenated bytes
        const combinedBytes = Buffer.concat([
            this.blockHash ? this.blockHash.getBytes() : Sha256Hash.ZERO_HASH.getBytes(),
            this.txHash ? this.txHash.getBytes() : Sha256Hash.ZERO_HASH.getBytes()
        ]);
        return Sha256Hash.of(combinedBytes);
    }

    public getTxHash(): Sha256Hash | null {
        return this.txHash;
    }

    public getBlockHash(): Sha256Hash | null {
        return this.blockHash;
    }

    public getIndex(): number {
        return this.index;
    }

    public setIndex(index: number): void {
        this.index = index;
    }

    /**
     * Coinbase transactions have special outPoints with hashes of zero. If this
     * is such an outPoint, returns true.
     */
    public isCoinBase(): boolean {
        return (this.blockHash ? this.blockHash.equals(Sha256Hash.ZERO_HASH) : true) &&
               (this.txHash ? this.txHash.equals(Sha256Hash.ZERO_HASH) : true) &&
               this.index === 0xFFFFFFFF;
    }

    public equals(o: any): boolean {
        if (this === o) return true;
        if (o === null || !(o instanceof TransactionOutPoint)) return false;
        const other = o;
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
