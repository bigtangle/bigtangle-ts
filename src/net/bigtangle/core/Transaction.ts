import { ChildMessage } from './ChildMessage';
import { TransactionInput } from './TransactionInput';
import { TransactionOutput } from './TransactionOutput';
import { TransactionOutPoint } from './TransactionOutPoint';
import { NetworkParameters } from '../params/NetworkParameters';
import { Script } from '../script/Script';
import { ScriptBuilder } from '../script/ScriptBuilder';
import { TransactionSignature } from '../crypto/TransactionSignature';
import { UnsafeByteArrayOutputStream } from './UnsafeByteArrayOutputStream';
import { ECKey } from './ECKey';
import { Sha256Hash } from './Sha256Hash';
import { Coin } from './Coin';
import { Utils } from '../utils/Utils';
import { VarInt } from './VarInt';
import { MessageSerializer } from './MessageSerializer';
import { MemoInfo } from './MemoInfo';
import { Buffer } from 'buffer';
import bigInt from 'big-integer';
import { Message } from './Message';
 

/**
 * <p>
 * A transaction represents the movement of coins from some addresses to some
 * other addresses.
 * </p>
 *
 * <p>
 * Transactions are the fundamental atoms and have many powerful features.
 * </p>
 *
 * <p>
 * Instances of this class are not safe for use by multiple threads.
 * </p>
 */
/**
 * These constants are a part of a scriptSig signature on the inputs. They
 * define the details of how a transaction can be redeemed, specifically,
 * they control how the hash of the transaction is calculated.
 */
export const SigHash = {
    ALL: 1,
    NONE: 2,
    SINGLE: 3,
    ANYONECANPAY: 0x80,
    ANYONECANPAY_ALL: 0x81,
    ANYONECANPAY_NONE: 0x82,
    ANYONECANPAY_SINGLE: 0x83,
    UNSET: 0
} as const;
export type SigHash = (typeof SigHash)[keyof typeof SigHash];

export class Transaction extends ChildMessage {
    private static readonly log = console; // LoggerFactory.getLogger(Transaction.class);

    /**
     * Threshold for lockTime: below this value it is interpreted as block
     * number, otherwise as timestamp.
     **/
    public static readonly LOCKTIME_THRESHOLD = 500000000; // Tue Nov 5
                                                            // 00:53:20 1985 UTC
    /** Same but as a BigInteger for CHECKLOCKTIMEVERIFY */
    public static readonly LOCKTIME_THRESHOLD_BIG = bigInt(Transaction.LOCKTIME_THRESHOLD.toString());

    /**
     * This enum describes the underlying reason the transaction was created.
     * It's useful for rendering wallet GUIs more appropriately.
     */
    public static readonly Purpose = {
        /** Used when the purpose of a transaction is genuinely unknown. */
        UNKNOWN: 'UNKNOWN',
        /** Transaction created to satisfy a user payment request. */
        USER_PAYMENT: 'USER_PAYMENT',
        /**
         * Transaction automatically created and broadcast in order to
         * reallocate money from old to new keys.
         */
        KEY_ROTATION: 'KEY_ROTATION',
        /** Transaction that uses up pledges to an assurance contract */
        ASSURANCE_CONTRACT_CLAIM: 'ASSURANCE_CONTRACT_CLAIM',
        /** Transaction that makes a pledge to an assurance contract. */
        ASSURANCE_CONTRACT_PLEDGE: 'ASSURANCE_CONTRACT_PLEDGE',
        /**
         * Send-to-self transaction that exists just to create an output of the
         * right size we can pledge.
         */
        ASSURANCE_CONTRACT_STUB: 'ASSURANCE_CONTRACT_STUB',
        /** Raise fee, e.g. child-pays-for-parent. */
        RAISE_FEE: 'RAISE_FEE'
    } as const;

    private purpose: string = Transaction.Purpose.UNKNOWN;

    /**
     * These constants are a part of a scriptSig signature on the inputs. They
     * define the details of how a transaction can be redeemed, specifically,
     * they control how the hash of the transaction is calculated.
     */
    public static readonly SigHash = SigHash;

    /**
     * @deprecated Instead use SigHash.ANYONECANPAY.value or
     *             SigHash.ANYONECANPAY.byteValue() as appropriate.
     */
    public static readonly SIGHASH_ANYONECANPAY_VALUE = 0x80;

    /**
     * A constant to represent an unknown transaction length.
     */
    public static readonly UNKNOWN_LENGTH = -1;

    /**
     * If feePerKb is lower than this, Bitcoin Core will treat it as if there
     * were no fee.
     */
    public static get REFERENCE_DEFAULT_MIN_TX_FEE(): Coin {
        // Lazy initialization to avoid issues with NetworkParameters not being ready
        return Coin.valueOf(5000n, NetworkParameters.BIGTANGLE_TOKENID); // 0.05 mBTC
    }

    /**
     * Any standard (ie pay-to-address) output smaller than this value (in
     * satoshis) will most likely be rejected by the network. This is calculated
     * by assuming a standard output will be 34 bytes, and then using the
     * formula used in .
     */
    public static get MIN_NONDUST_OUTPUT(): Coin {
        // Lazy initialization to avoid issues with NetworkParameters not being ready
        return Coin.valueOf(2730n, NetworkParameters.BIGTANGLE_TOKENID); // satoshis
    }

    // These are bitcoin serialized.
    private version: number;
    private inputs: TransactionInput[];
    private outputs: TransactionOutput[];
    private lockTime: number;

    // This is an in memory helper only.
    private hash: Sha256Hash | null;

    // Records a map of which blocks the transaction has appeared in (keys) to
    // an index within that block (values).
    // The "index" is not a real index, instead the values are only meaningful
    // relative to each other. For example,
    // consider two transactions that appear in the same block, t1 and t2, where
    // t2 spends an output of t1. Both
    // will have the same block hash as a key in their appearsInHashes, but the
    // counter would be 1 and 2 respectively
    // regardless of where they actually appeared in the block.
    //
    // If this transaction is not stored in the wallet, appearsInHashes is null.
    private appearsInHashes: Map<string, number> | null;

    // Transactions can be encoded in a way that will use more bytes than is
    // optimal
    // (due to VarInts having multiple encodings)
    // MAX_BLOCK_SIZE must be compared to the optimal encoding, not the actual
    // encoding, so when parsing, we keep track
    // of the size of the ideal encoding in addition to the actual message size
    // (which Message needs) so that Blocks
    // can properly keep track of optimal encoded size
    private optimalEncodingMessageSize: number;

    /**
     * This field can be used to record the memo of the payment request that
     * initiated the transaction. It's optional.
     */
    private memo: string | null;

    private data: Buffer | null;
    private dataSignature: Buffer | null;
    private dataClassName: string | null;
    private toAddressInSubtangle: Buffer | null;

    constructor(params: NetworkParameters);
    constructor(params: NetworkParameters, payload: Buffer, offset: number, serializer: MessageSerializer<any>, parent: ChildMessage | null, length?: number);
    constructor(...args: any[]) {
        super(args[0]);
        
        // Initialize properties
        this.version = 1;
        this.inputs = [];
        this.outputs = [];
        this.lockTime = 0;
        this.hash = null;
        this.appearsInHashes = null;
        this.optimalEncodingMessageSize = 0;
        this.memo = null;
        this.data = null;
        this.dataSignature = null;
        this.dataClassName = null;
        this.toAddressInSubtangle = null;
        this.purpose = Transaction.Purpose.UNKNOWN;
        
        if (args.length === 1) {
            // (params)
            this.length = 8; // 8 for std fields
        } else {
            // (params, payload, offset, serializer, parent, length)
            this.payload = Buffer.from(args[1]); // Ensure we have a copy of the payload
            this.offset = args[2];
            this.serializer = args[3];
            this.parent = args[4];
            this.length = args[5] ?? Message.UNKNOWN_LENGTH;
            // Parse the transaction to initialize inputs and outputs
            this.parse();
        }
    }

    // parse method is already defined as protected parse() below, so we remove this duplicate

    // addInputWithOutput and addOutputCoin are already defined in the class, so we remove these duplicates

    /**
     * Returns the transaction hash as you see them in the block explorer.
     */
    getHash(): Sha256Hash {
        if (this.hash === null) {
            const buf = this.unsafeBitcoinSerialize();
            const hash = Sha256Hash.hashTwice(Buffer.from(buf));
            this.hash = Sha256Hash.wrapReversed(hash) ?? Sha256Hash.ZERO_HASH;
        }
        return this.hash;
    }

    private calculateMemoLen(): number {
        let len = 4;
        if (this.memo !== null) {
            len += Buffer.from(this.memo, 'utf8').length;
        }
        return len;
    }

    private calculateDataSignatureLen(): number {
        let len = 4;
        if (this.dataSignature !== null) {
            len += this.dataSignature.length;
        }
        return len;
    }

    /**
     * Used by BitcoinSerializer. The serializer has to calculate a hash for
     * checksumming so to avoid wasting the considerable effort a set method is
     * provided so the serializer can set it.
     * <p>
     * No verification is performed on this hash.
     */
    setHash(hash: Sha256Hash): void {
        this.hash = hash;
    }

    getHashAsString(): string {
        return this.getHash().toString();
    }

    /**
     * Calculates the sum of the outputs that are sending coins to a key in the
     * wallet.
     */
    getValueSentToMe(transactionBag: any): Coin {
        let v = Coin.ZERO;
        for (const o of this.outputs) {
            if (!o.isMineOrWatched(transactionBag)) continue;
            v = v.add(o.getValue());
        }
        return v;
    }

    /**
     * Returns a map of block [hashes] which contain the transaction mapped to
     * relativity counters, or null if this transaction doesn't have that data
     * because it's not stored in the wallet or because it has never appeared in
     * a block.
     */
    getAppearsInHashes(): Map<string, number> | null {
        return this.appearsInHashes ? new Map(this.appearsInHashes) : null;
    }

    addBlockAppearance(blockHash: Sha256Hash, relativityOffset: number): void {
        if (this.appearsInHashes === null) {
            this.appearsInHashes = new Map();
        }
        this.appearsInHashes.set(blockHash.toString(), relativityOffset);
    }

    /**
     * Gets the sum of the outputs of the transaction. If the outputs are less
     * than the inputs, it does not count the fee.
     *
     * @return the sum of the outputs regardless of who owns them.
     */
    getOutputSum(): bigInt.BigInteger {
        let totalOut = bigInt(0);

        for (const output of this.outputs) {
            totalOut = totalOut.add(output.getValue().getValue());
        }

        return totalOut;
    }

    /**
     * Returns true if any of the outputs is marked as spent.
     */
    isAnyOutputSpent(): boolean {
        for (const output of this.outputs) {
            if (!output.isAvailableForSpending()) return true;
        }
        return false;
    }

    /**
     * Returns false if this transaction has at least one output that is owned
     * by the given wallet and unspent, true otherwise.
     */
    isEveryOwnedOutputSpent(transactionBag: any): boolean {
        for (const output of this.outputs) {
            if (output.isAvailableForSpending() && output.isMineOrWatched(transactionBag)) return false;
        }
        return true;
    }

    setUpdateTime(): void {
        this.unCache();
    }

    /**
     * These constants are a part of a scriptSig signature on the inputs. They
     * define the details of how a transaction can be redeemed, specifically,
     * they control how the hash of the transaction is calculated.
     */

    public unCache(): void {
        super.unCache();
        this.hash = null;
    }

    public parse(): void {
        console.log(`Parsing transaction at offset ${this.offset}`);
        this.cursor = this.offset;

        this.version = this.readUint32();
        console.log(`Parsed version: ${this.version}`);
        this.optimalEncodingMessageSize = 4;

        // First come the inputs.
        const numInputs = this.readVarInt();
        console.log(`Parsed numInputs: ${numInputs}`);
        this.optimalEncodingMessageSize += VarInt.sizeOf(bigInt(numInputs.toString()));
        this.inputs = [];
        for (let i = 0; i < numInputs; i++) {
            console.log(`Parsing input ${i} at cursor ${this.cursor}`);
            const input = new TransactionInput(this.params, this, this.payload ? Buffer.from(this.payload) : Buffer.alloc(0), this.cursor, this.serializer);
            this.inputs.push(input);
            // Update cursor based on the actual input size
            const inputSize = input.getMessageSize();
            console.log(`Parsed input ${i} with size ${inputSize}`);
            this.cursor += inputSize;
            // Update optimal encoding size
            const scriptLen = input.getScriptBytes().length;
            const connectedOutput = input.getOutpoint().getConnectedOutput();
            const addLen = 4 + (connectedOutput === null ? 0 : connectedOutput.getMessageSize());
            this.optimalEncodingMessageSize += TransactionOutPoint.MESSAGE_LENGTH + addLen + VarInt.sizeOf(bigInt(scriptLen.toString()))
                    + Number(scriptLen) + 4;
        }
        // Now the outputs
        console.log(`Cursor position before reading numOutputs: ${this.cursor}`);
        console.log(`Payload length: ${this.payload?.length}`);
        console.log(`Payload bytes at cursor: ${this.payload?.slice(this.cursor, this.cursor + 10).toString('hex')}`);
        const numOutputs = this.readVarInt();
        console.log(`Parsed numOutputs: ${numOutputs}`);
        this.optimalEncodingMessageSize += VarInt.sizeOf(bigInt(numOutputs.toString()));
        this.outputs = [];
        for (let i = 0; i < numOutputs; i++) {
            console.log(`Parsing output ${i} at cursor ${this.cursor}`);
            const output = TransactionOutput.fromPayload(this.params, this, this.payload ? this.payload : Buffer.alloc(0), this.cursor);
            console.log(`Parsed output ${i} with length ${output.getMessageSize()}`);
            this.outputs.push(output);
            this.cursor += output.getMessageSize();
            this.optimalEncodingMessageSize += output.getMessageSize();
        }
        this.lockTime = this.readUint32();
        console.log(`Parsed lockTime: ${this.lockTime}`);
        this.optimalEncodingMessageSize += 4;

        let len = Number(this.readVarInt());
        console.log(`Parsed dataClassName length: ${len}`);
        this.optimalEncodingMessageSize += VarInt.sizeOf(bigInt(len.toString()));
        if (len > 0) {
            const buf = this.readBytes(len);
            this.dataClassName = buf.toString('utf8');
            this.optimalEncodingMessageSize += len;
        }

        len = Number(this.readVarInt());
        console.log(`Parsed data length: ${len}`);
        this.optimalEncodingMessageSize += VarInt.sizeOf(bigInt(len.toString()));
        if (len > 0) {
            this.data = this.readBytes(len);
            this.optimalEncodingMessageSize += len;
        }

        len = Number(this.readVarInt());
        console.log(`Parsed toAddressInSubtangle length: ${len}`);
        this.optimalEncodingMessageSize += VarInt.sizeOf(bigInt(len.toString()));
        if (len > 0) {
            this.toAddressInSubtangle = this.readBytes(len);
            this.optimalEncodingMessageSize += len;
        }

        len = Number(this.readVarInt());
        console.log(`Parsed memo length: ${len}`);
        this.optimalEncodingMessageSize += VarInt.sizeOf(bigInt(len.toString()));
        if (len > 0) {
            const memoBytes = this.readBytes(len);
            this.memo = Utils.toString(memoBytes, 'utf-8');
            this.optimalEncodingMessageSize += len;
        }

        len = Number(this.readVarInt());
        console.log(`Parsed dataSignature length: ${len}`);
        this.optimalEncodingMessageSize += VarInt.sizeOf(bigInt(len.toString()));
        if (len > 0) {
            this.dataSignature = this.readBytes(len);
            this.optimalEncodingMessageSize += len;
        }

        this.length = this.cursor - this.offset;
        console.log(`Parsed transaction length: ${this.length}`);
    }

    getOptimalEncodingMessageSize(): number {
        if (this.optimalEncodingMessageSize !== 0) return this.optimalEncodingMessageSize;
        this.optimalEncodingMessageSize = this.getMessageSize();
        return this.optimalEncodingMessageSize;
    }

    /**
     * The priority (coin age) calculation doesn't use the regular message size,
     * but rather one adjusted downwards for the number of inputs. The goal is
     * to incentivise cleaning up the UTXO set with free transactions, if one
     * can do so.
     */
    getMessageSizeForPriorityCalc(): number {
        let size = this.getMessageSize();
        for (const input of this.inputs) {
            // 41: min size of an input
            // 110: enough to cover a compressed pubkey p2sh redemption
            // (somewhat arbitrary).
            const benefit = 41 + Math.min(110, input.getScriptSig().getProgram().length);
            if (size > benefit) size -= benefit;
        }
        return size;
    }

    /**
     * A coinbase transaction is one that creates a new coin.
     */
    isCoinBase(): boolean {
        return this.inputs.length === 1 && this.inputs[0].isCoinBase();
    }

    /**
     * A human readable version of the transaction useful for debugging. The
     * format is not guaranteed to be stable.
     *
     */
    toString(): string {
        let s = `  ${this.getHashAsString()}\n`;
        // if (updatedAt != null)
        // s.append(" updated:
        // ").append(Utils.dateTimeFormat(updatedAt)).append('\n');
        if (this.version !== 1) s += `  version ${this.version}\n`;
        if (this.isTimeLocked()) {
            s += '  time locked until ';
            if (this.lockTime < Transaction.LOCKTIME_THRESHOLD) {
                s += `block ${this.lockTime}`;
            } else {
                s += Utils.dateTimeFormat(this.lockTime * 1000);
            }
            s += '\n';
        }
        if (this.isOptInFullRBF()) {
            s += '  opts into full replace-by-fee\n';
        }
        if (this.isCoinBase()) {
            let script: string;
            let script2: string;
            try {
                script = this.inputs.length === 0 ? 'None' : this.inputs[0].getScriptSig().toString();
                script2 = this.outputs.length === 0 ? 'None' : this.outputs[0].toString();
            } catch {
                script = '???';
                script2 = '???';
            }
            s += `     == COINBASE (scriptSig ${script})  (scriptPubKey ${script2})\n`;
            return s;
        }
        if (this.inputs.length > 0) {
            for (const input of this.inputs) {
                s += '     ';
                s += 'in   ';

                try {
                    const scriptSigStr = input.getScriptSig().toString();
                    s += scriptSigStr ? scriptSigStr : '<no scriptSig>';
                    const value = input.getValue();
                    if (value !== null) s += ` ${value.toString()}`;
                    s += '\n          ';
                    s += 'outpoint:';
                    const outpoint = input.getOutpoint();
                    s += outpoint.toString();
                    const connectedOutput = outpoint.getConnectedOutput();
                    if (connectedOutput !== null) {
                        const scriptPubKey = connectedOutput.getScriptPubKey();
                        if (scriptPubKey.isSentToAddress() || scriptPubKey.isPayToScriptHash()) {
                            s += ' hash160:';
                            s += Utils.HEX.encode(scriptPubKey.getPubKeyHash());
                        }
                    }
                    if (input.hasSequence()) {
                        s += `\n          sequence:${input.getSequenceNumber().toString(16)}`;
                        if (input.isOptInFullRBF()) s += ', opts into full RBF';
                    }
                } catch (e) {
                    if (e instanceof Error) {
                        s += `[exception: ${e.message}]`;
                    } else {
                        s += `[exception: ${String(e)}]`;
                    }
                }
                s += '\n';
            }
        } else {
            s += '     ';
            // s.append("INCOMPLETE: No inputs!\n");
        }
        for (const output of this.outputs) {
            s += '     ';
            s += 'out  ';
            try {
                const scriptPubKeyStr = output.getScriptPubKey().toString();
                s += scriptPubKeyStr ? scriptPubKeyStr : '<no scriptPubKey>';
                s += '\n ';
                s += output.getValue().toString();
                if (!output.isAvailableForSpending()) {
                    s += ' Spent';
                }
                const spentBy = output.getSpentBy();
                if (spentBy !== null) {
                    s += ' by ';
                    s += spentBy.getParentTransaction().getHashAsString();
                }
            } catch (e) {
                if (e instanceof Error) {
                    s += `[exception: ${e.message}]`;
                } else {
                    s += `[exception: ${String(e)}]`;
                }
            }
            s += '\n';
        }
        if (this.memo !== null) s += `   memo ${this.memo}\n`;
        return s;
    }

    /**
     * Removes all the inputs from this transaction. Note that this also
     * invalidates the length attribute
     */
    clearInputs(): void {
        this.unCache();
        for (const input of this.inputs) {
            input.setParent(null);
        }
        this.inputs = [];
        // You wanted to reserialize, right?
        this.length = this.unsafeBitcoinSerialize().length;
    }

    /**
     * Adds an input to this transaction that imports value from the given
     * output. Note that this input is <i>not</i> complete and after every input
     * is added with  and every output is added with
     * , a {@link TransactionSigner} must be used to
     * finalize the transaction and finish the inputs off. Otherwise it won't be
     * accepted by the network.
     *
     * @return the newly created input.
     */
    addInput(p1: TransactionInput | Sha256Hash, p2?: TransactionOutput | Sha256Hash, p3?: number, p4?: Script): TransactionInput {
        if (p1 instanceof TransactionInput) {
            const input = p1;
            this.unCache();
            input.setParent(this);
            this.inputs.push(input);
            this.adjustLength(this.inputs.length, input.getMessageSize());
            return input;
        } else if (p2 instanceof TransactionOutput) {
            const blockHash = p1;
            const from = p2;
            return this.addInput(new TransactionInput(this.params, this, from.getScriptBytes(), new TransactionOutPoint(this.params, from.getIndex(), blockHash, null)));
        } else {
            const spendBlockHash = p1;
            const spendTxHash = p2 as Sha256Hash;
            const outputIndex = p3 as number;
            const script = p4 as Script;
            return this.addInput(new TransactionInput(this.params, this, Buffer.from(script.getProgram()),
                new TransactionOutPoint(this.params, outputIndex, spendBlockHash, spendTxHash)));
        }
    }

    /**
     * Adds a new and fully signed input for the given parameters. Note that
     * this method is <b>not</b> thread safe and requires external
     * synchronization. Please refer to general documentation on Bitcoin
     * scripting and contracts to understand the values of sigHash and
     * anyoneCanPay: otherwise you can use the other form of this method that
     * sets them to typical defaults.
     *
     * @throws ScriptException
     *             if the scriptPubKey is not a pay to address or pay to pubkey
     *             script.
     */
    async addSignedInput(prevOut: TransactionOutPoint, scriptPubKey: Script, sigKey: ECKey, sigHash: SigHash = SigHash.ALL, anyoneCanPay: boolean = false): Promise<TransactionInput> {
        // Verify the API user didn't try to do operations out of order.
        if (this.outputs.length === 0) {
            throw new Error('Attempting to sign tx without outputs.');
        }
        const input = new TransactionInput(this.params, this, Buffer.from(''), prevOut);
        this.addInput(input);
        const sigHashType = TransactionSignature.calcSigHashValue(sigHash, anyoneCanPay);
        const hash = this.hashForSignature(this.inputs.length - 1, scriptPubKey.getProgram(), sigHashType);
        if (hash === null) {
            throw new Error('Hash for signature is null');
        }
        const ecSig = await sigKey.sign(hash.getBytes());
        const txSig = new TransactionSignature(bigInt(ecSig.r.toString()), bigInt(ecSig.s.toString()), sigHash );
        if (scriptPubKey.isSentToRawPubKey() || scriptPubKey.isSentToMultiSig()) {
            input.setScriptSig(ScriptBuilder.createInputScript(txSig));
        } else if (scriptPubKey.isSentToAddress()) {
            input.setScriptSig(ScriptBuilder.createInputScript(txSig, sigKey));
        } else {
            throw new Error('Don\'t know how to sign for this kind of scriptPubKey: ' + scriptPubKey);
        }
        return input;
    }

    async signInputs(prevOut: TransactionOutPoint, scriptPubKey: Script, sigKey: ECKey): Promise<void> {
        const sigHashType = TransactionSignature.calcSigHashValue(SigHash.ALL, false);
        const hash = this.hashForSignature(this.inputs.length - 1, scriptPubKey.getProgram(), sigHashType);
        if (hash === null) {
            throw new Error('Hash for signature is null');
        }
        const ecSig = await sigKey.sign(hash.getBytes());
        const txSig = new TransactionSignature(bigInt(ecSig.r.toString()), bigInt(ecSig.s.toString()), SigHash.ALL );
        for (const input of this.getInputs()) {
            // TODO only sign if valid signature can be created
            if (input.getScriptBytes().length !== 0) continue;
            if (scriptPubKey.isSentToRawPubKey())
                input.setScriptSig(ScriptBuilder.createInputScript(txSig));
            else if (scriptPubKey.isSentToAddress())
                input.setScriptSig(ScriptBuilder.createInputScript(txSig, sigKey));
            else
                throw new Error('Don\'t know how to sign for this kind of scriptPubKey: ' + scriptPubKey.toString());
        }
    }

    /**
     * Removes all the outputs from this transaction. Note that this also
     * invalidates the length attribute
     */
    clearOutputs(): void {
        this.unCache();
        for (const output of this.outputs) {
            output.setParent(null);
        }
        this.outputs = [];
        // You wanted to reserialize, right?
        this.length = this.unsafeBitcoinSerialize().length;
    }

    /**
     * Adds the given output to this transaction. The output must be completely
     * initialized. Returns the given output.
     */
    addOutput(to: TransactionOutput): TransactionOutput;
    addOutput(value: Coin, address: any): TransactionOutput;
    addOutput(value: Coin, pubkey: ECKey): TransactionOutput;
    addOutput(value: Coin, script: Script): TransactionOutput;
    addOutput(p1: TransactionOutput | Coin, p2?: any): TransactionOutput {
        if (p1 instanceof TransactionOutput) {
            const to = p1;
            this.unCache();
            to.setParent(this);
            this.outputs.push(to);
            this.adjustLength(this.outputs.length, to.getMessageSize());
            return to;
        } else {
            const value = p1;
            if (p2 instanceof Script) {
                return this.addOutput(new TransactionOutput(this.params, this, value, Buffer.from(p2.getProgram())));
            } else if (p2 instanceof ECKey) {
                return this.addOutput(new TransactionOutput(this.params, this, value, Buffer.from(ScriptBuilder.createOutputScript(p2).getProgram())));
            } else {
                return this.addOutput(new TransactionOutput(this.params, this, value, p2));
            }
        }
    }

    /**
     * Calculates a signature that is valid for being inserted into the input at
     * the given position. This is simply a wrapper around calling
     * {@link Transaction#hashForSignature(int, byte[], net.bigtangle.core.Transaction.SigHash, boolean)}
     * followed by {@link ECKey#sign(Sha256Hash)} and then returning a new
     * {@link TransactionSignature}. The key must be usable for signing as-is:
     * if the key is encrypted it must be decrypted first external to this
     * method.
     *
     * @param inputIndex
     *            Which input to calculate the signature for, as an index.
     * @param key
     *            The private key used to calculate the signature.
     * @param redeemScript
     *            Byte-exact contents of the scriptPubKey that is being
     *            satisified, or the P2SH redeem script.
     * @param hashType
     *            Signing mode, see the enum for documentation.
     * @param anyoneCanPay
     *            Signing mode, see the SigHash enum for documentation.
     * @return A newly calculated signature object that wraps the r, s and
     *         sighash components.
     */
    async calculateSignature(inputIndex: number, key: ECKey, redeemScript: Script, hashType: SigHash,
            anyoneCanPay: boolean): Promise<TransactionSignature> {
        const sigHashType = TransactionSignature.calcSigHashValue(hashType, anyoneCanPay);
        const hash = this.hashForSignature(inputIndex, redeemScript.getProgram(), sigHashType);
        if (hash === null) {
            throw new Error('Hash for signature is null');
        }
        const ecSig = await key.sign(hash.getBytes());
        return new TransactionSignature(bigInt(ecSig.r.toString()), bigInt(ecSig.s.toString()), hashType );
    }

 
    /**
     * <p>
     * Calculates a signature hash, that is, a hash of a simplified form of the
     * transaction. How exactly the transaction is simplified is specified by
     * the type and anyoneCanPay parameters.
     * </p>
     *
     * <p>
     * This is a low level API and when using the regular {@link Wallet} class
     * you don't have to call this yourself. When working with more complex
     * transaction types and contracts, it can be necessary. When signing a P2SH
     * output the redeemScript should be the script encoded into the scriptSig
     * field, for normal transactions, it's the scriptPubKey of the output
     * you're signing for.
     * </p>
     *
     * @param inputIndex
     *            input the signature is being calculated for. Tx signatures are
     *            always relative to an input.
     * @param redeemScript
     *            the bytes that should be in the given input during signing.
     * @param type
     *            Should be SigHash.ALL
     * @param anyoneCanPay
     *            should be false.
     */
     
    hashForSignature(inputIndex: number, redeemScript: Script, type: SigHash, anyoneCanPay: boolean): Sha256Hash | null;
    hashForSignature(inputIndex: number, connectedScript: Uint8Array, sigHashType: number): Sha256Hash | null;
    hashForSignature(inputIndex: number, p2: Uint8Array | Script, p3: SigHash | number, p4?: boolean): Sha256Hash  | null {
        if (typeof p3 === 'number' && typeof p4 === 'undefined') {
            const connectedScript = p2 as Uint8Array;
            const sigHashType = p3;

            try {
                // Create a copy of this transaction to operate upon because we need
                // make changes to the inputs and outputs.
                // It would not be thread-safe to change the attributes of the
                // transaction object itself.
                console.log('Creating transaction copy for signing');
                const serializedTx = this.bitcoinSerializeCopy();
                console.log(`Serialized transaction length: ${serializedTx.length}`);
                console.log(`Serialized transaction (first 100 bytes): ${serializedTx.slice(0, 100).toString('hex')}`);
                const tx = this.params.getDefaultSerializer().makeTransaction(Buffer.from(serializedTx));

                // Clear input scripts in preparation for signing.
                for (let i = 0; i < tx.inputs.length; i++) {
                    tx.inputs[i].clearScriptBytes();
                }

                // Set the input to the script of its output.
                const input = tx.inputs[inputIndex];
                input.setScriptBytes(Buffer.from(connectedScript));

                if ((sigHashType & 0x1f) === SigHash.NONE) {
                    // SIGHASH_NONE means no outputs are signed at all - the
                    // signature is effectively for a "blank cheque".
                    tx.outputs = [];
                    // The signature isn't broken by new versions of the transaction
                    // issued by other parties.
                    for (let i = 0; i < tx.inputs.length; i++)
                        if (i !== inputIndex)
                            tx.inputs[i].setSequenceNumber(0);
                } else if ((sigHashType & 0x1f) === SigHash.SINGLE) {
                    // SIGHASH_SINGLE means only sign the output at the same index
                    // as the input (ie, my output).
                    if (inputIndex >= tx.outputs.length) {
                        // The input index is beyond the number of outputs, it's a
                        // buggy signature made by a broken
                        // Bitcoin implementation.
                        return Sha256Hash.wrap(Buffer.from('0100000000000000000000000000000000000000000000000000000000000000', 'hex'))!;
                    }
                    // In SIGHASH_SINGLE the outputs after the matching input index
                    // are deleted, and the outputs before
                    // that position are "nulled out".
                    tx.outputs = tx.outputs.slice(0, inputIndex + 1);
                    for (let i = 0; i < inputIndex; i++)
                        tx.outputs[i] = new TransactionOutput(tx.params, tx, Coin.NEGATIVE_SATOSHI, Buffer.from(''));
                    // The signature isn't broken by new versions of the transaction
                    // issued by other parties.
                    for (let i = 0; i < tx.inputs.length; i++)
                        if (i !== inputIndex)
                            tx.inputs[i].setSequenceNumber(0);
                }

                if ((sigHashType & SigHash.ANYONECANPAY) === SigHash.ANYONECANPAY) {
                    // SIGHASH_ANYONECANPAY means the signature in the input is not
                    // broken by changes/additions/removals
                    // of other inputs.
                    tx.inputs = [input];
                }

                const bos = new UnsafeByteArrayOutputStream();
                tx.bitcoinSerialize(bos);
                // We also have to write a hash type (sigHashType is actually an
                // unsigned char)
                Utils.uint32ToByteStreamLE(0x000000ff & sigHashType, bos);
                // Note that this is NOT reversed to ensure it will be signed
                // correctly.
                const hash = Sha256Hash.hashTwice(bos.toByteArray());
                return Sha256Hash.wrapReversed(hash) ?? Sha256Hash.ZERO_HASH;
                } catch (e) {
                    if (e instanceof Error) {
                        throw new Error(e.message);
                    }
                    throw new Error('Unknown error in hashForSignature');
                }
        } else {
            const redeemScript = p2;
            const type = p3 as SigHash;
            const anyoneCanPay = p4 as boolean;
            const sigHashType = TransactionSignature.calcSigHashValue(type, anyoneCanPay);
            if (redeemScript instanceof Script) {
                return this.hashForSignature(inputIndex, redeemScript.getProgram(), sigHashType);
            } else {
                return this.hashForSignature(inputIndex, redeemScript as Uint8Array, sigHashType);
            }
        }
    }

    bitcoinSerializeToStream(stream: UnsafeByteArrayOutputStream): void {
        // Debug information
        const startPos = stream.size();
        Utils.uint32ToByteStreamLE(this.version, stream);
        stream.write(new VarInt(this.inputs.length).encode());
        for (const input of this.inputs)
            input.bitcoinSerialize(stream);
        stream.write(new VarInt(this.outputs.length).encode());
        for (const output of this.outputs)
            output.bitcoinSerializeToStream(stream);
        Utils.uint32ToByteStreamLE(this.lockTime, stream);
        if (this.dataClassName === null) {
            stream.write(new VarInt(0).encode());
        } else {
            const dataClassNameBytes = Buffer.from(this.dataClassName, 'utf8');
            stream.write(new VarInt(dataClassNameBytes.length).encode());
            stream.write(dataClassNameBytes);
        }

        if (this.data === null) {
            stream.write(new VarInt(0).encode());
        } else {
            stream.write(new VarInt(this.data.length).encode());
            stream.write(this.data);
        }

        if (this.toAddressInSubtangle === null) {
            stream.write(new VarInt(0).encode());
        } else {
            stream.write(new VarInt(this.toAddressInSubtangle.length).encode());
            stream.write(this.toAddressInSubtangle);
        }

        if (this.memo === null) {
            stream.write(new VarInt(0).encode());
        } else {
            const memoBytes = Buffer.from(this.memo, 'utf8');
            stream.write(new VarInt(memoBytes.length).encode());
            stream.write(memoBytes);
        }

        if (this.dataSignature === null) {
            stream.write(new VarInt(0).encode());
        } else {
            stream.write(new VarInt(this.dataSignature.length).encode());
            stream.write(this.dataSignature);
        }
        const endPos = stream.size();
        console.log(`Transaction serialized ${endPos - startPos} bytes`);
    }

    /**
     * Transactions can have an associated lock time, specified either as a
     * block height or in seconds since the UNIX epoch. A transaction is not
     * allowed to be confirmed by miners until the lock time is reached, and
     * since Bitcoin 0.8+ a transaction that did not end its lock period (non
     * final) is considered to be non standard and won't be relayed or included
     * in the memory pool either.
     */
    getLockTime(): number {
        return this.lockTime;
    }

    /**
     * Transactions can have an associated lock time, specified either as a
     * block height or in seconds since the UNIX epoch. A transaction is not
     * allowed to be confirmed by miners until the lock time is reached, and
     * since Bitcoin 0.8+ a transaction that did not end its lock period (non
     * final) is considered to be non standard and won't be relayed or included
     * in the memory pool either.
     */
    setLockTime(lockTime: number): void {
        this.unCache();
        let seqNumSet = false;
        for (const input of this.inputs) {
            if (input.getSequenceNumber() !== TransactionInput.NO_SEQUENCE) {
                seqNumSet = true;
                break;
            }
        }
        if (lockTime !== 0 && (!seqNumSet || this.inputs.length === 0)) {
            // At least one input must have a non-default sequence number for
            // lock times to have any effect.
            // For instance one of them can be set to zero to make this feature
            // work.
            Transaction.log.warn(
                    'You are setting the lock time on a transaction but none of the inputs have non-default sequence numbers. This will not do what you expect!');
        }
        this.lockTime = lockTime;
    }

    getVersion(): number {
        return this.version;
    }

    setVersion(version: number): void {
        this.version = version;
        this.unCache();
    }

    /** Returns an unmodifiable view of all inputs. */
    getInputs(): TransactionInput[] {
        return [...this.inputs];
    }

    /** Returns an unmodifiable view of all outputs. */
    getOutputs(): TransactionOutput[] {
        return [...this.outputs];
    }

    /** Same as getInputs().get(index). */
    getInput(index: number): TransactionInput {
        return this.inputs[index];
    }

    /** Same as getOutputs().get(index) */
    getOutput(index: number): TransactionOutput {
        return this.outputs[index];
    }

    /**
     * @return The Block that owns this input.
     */
    getParentBlock(): any {
        return this.parent;
    }

    equals(o: any): boolean {
        if (this === o) return true;
        if (o === null || !(o instanceof Transaction)) return false;
        return this.getHash().equals((o as Transaction).getHash());
    }

    hashCode(): number {
        return this.getHash().hashCode();
    }

    /**
     * Gets the count of regular SigOps in this transactions
     */
    getSigOpCount(): number {
        let sigOps = 0;
        for (const input of this.inputs)
            sigOps += Script.getSigOpCount(input.getScriptBytes());
        for (const output of this.outputs)
            sigOps += Script.getSigOpCount(output.getScriptBytes());
        return sigOps;
    }

    /**
     * <p>
     * Checks the transaction contents for sanity, in ways that can be done in a
     * standalone manner. Does <b>not</b> perform all checks on a transaction
     * such as whether the inputs are already spent. Specifically this method
     * verifies:
     * </p>
     *
     * <ul>
     * <li>That the serialized size is not larger than the max block size.</li>
     * <li>That no outputs have negative value.</li>
     * <li>That the outputs do not sum to larger than the max allowed quantity
     * of coin in the system.</li>
     * <li>If the tx is a coinbase tx, the coinbase scriptSig size is within
     * range. Otherwise that there are no coinbase inputs in the tx.</li>
     * </ul>
     *
     */
    verify(): void {
        const outpoints = new Set<string>();
        for (const input of this.inputs) {
            const outpoint = input.getOutpoint().toString();
            if (outpoints.has(outpoint))
                throw new Error('Duplicated outpoint');
            outpoints.add(outpoint);
        }
        try {
            for (const output of this.outputs) {
                if (output.getValue().signum() < 0) // getValue() can throw
                                                    // IllegalStateException
                    throw new Error('Negative value output');
            }
        } catch (e) {
            throw new Error('Excessive value');
        }

        if (this.isCoinBase()) {
            if (this.inputs[0].getScriptBytes().length < 2 || this.inputs[0].getScriptBytes().length > 100)
                throw new Error('Coinbase script size out of range');
        } else {
            for (const input of this.inputs)
                if (input.isCoinBase())
                    throw new Error('Unexpected coinbase input');
        }
    }

    /**
     * <p>
     * A transaction is time locked if at least one of its inputs is non-final
     * and it has a lock time
     * </p>
     *
     * <p>
     * To check if this transaction is final at a given height and time, see
     * <p>
     * </p>
     */
    isTimeLocked(): boolean {
        if (this.getLockTime() === 0) return false;
        for (const input of this.getInputs())
            if (input.hasSequence()) return true;
        return false;
    }

    /**
     * Returns whether this transaction will opt into the <a href=
     * "https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki">full
     * replace-by-fee </a> semantics.
     */
    isOptInFullRBF(): boolean {
        for (const input of this.getInputs())
            if (input.isOptInFullRBF()) return true;
        return false;
    }

    /**
     * Returns the purpose for which this transaction was created. See the
     * javadoc for {@link Purpose} for more information on the point of this
     * field and what it can be.
     */
    getPurpose(): string {
        return this.purpose;
    }

    /**
     * Marks the transaction as being created for the given purpose. See the
     * javadoc for {@link Purpose} for more information on the point of this
     * field and what it can be.
     */
    setPurpose(purpose: string): void {
        this.purpose = purpose;
        this.unCache();
    }

    /**
     * Returns the transaction {@link #memo}.
     */
    getMemo(): string | null {
        return this.memo;
    }

    /**
     * Set the transaction {@link #memo}. It can be used to record the memo of
     * the payment request that initiated the transaction.
     *
     */
    setMemo(memoInfo: MemoInfo | null): void {
        try {
            this.memo = memoInfo === null ? null : memoInfo.toJson();
        } catch {
            this.memo = '';
        }
        this.unCache();
    }

    getData(): Buffer | null {
        return this.data;
    }

    setData(data: Buffer | null): void {
        this.data = data;
        this.unCache();
    }

    getDataSignature(): Buffer | null {
        return this.dataSignature;
    }

    setDataSignature(dataSignature: Buffer | null): void {
        this.dataSignature = dataSignature;
        this.unCache();
    }

    getDataClassName(): string | null {
        return this.dataClassName;
    }

    setDataClassName(dataClassName: string | null): void {
        this.dataClassName = dataClassName;
        this.unCache();
    }

    getToAddressInSubtangle(): Buffer | null {
        return this.toAddressInSubtangle;
    }

    setToAddressInSubtangle(subtangleID: Buffer | null): void {
        this.toAddressInSubtangle = subtangleID;
        this.unCache();
    }
}
