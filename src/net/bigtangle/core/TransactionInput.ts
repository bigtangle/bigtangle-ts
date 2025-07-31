import { ChildMessage } from './ChildMessage';
import { TransactionOutPoint } from './TransactionOutPoint';
import { TransactionOutput } from './TransactionOutput';
import { Script } from '../script/Script';
import { Coin } from './Coin';
import { NetworkParameters } from '../params/NetworkParameters';
import { Transaction } from './Transaction';
import { VarInt } from './VarInt';
import { Utils } from '../utils/Utils';
import { Buffer } from 'buffer';
import { MessageSerializer } from './MessageSerializer';
import { Address } from './Address';
import { KeyBag } from '../wallet/KeyBag';
import { RedeemData } from '../wallet/RedeemData';
import { ProtocolException } from '../exception/ProtocolException';
import { ScriptException } from '../exception/ScriptException';
import { VerificationException } from '../exception/VerificationException';
import { Sha256Hash } from './Sha256Hash';
import bigInt from 'big-integer';

/**
 * <p>A transfer of coins from one address to another creates a transaction in which the outputs
 * can be claimed by the recipient in the input of another transaction. You can imagine a
 * transaction as being a module which is wired up to others, the inputs of one have to be wired
 * to the outputs of another. The exceptions are coinbase transactions, which create new coins.</p>
 * 
 * <p>Instances of this class are not safe for use by multiple threads.</p>
 */
export class TransactionInput extends ChildMessage {
    /** Magic sequence number that indicates there is no sequence number. */
    static readonly NO_SEQUENCE: number = 0xFFFFFFFF;
    private static readonly EMPTY_ARRAY: Buffer = Buffer.alloc(0);
    // Magic outpoint index that indicates the input is in fact unconnected.
    private static readonly UNCONNECTED: number = 0xFFFFFFFF;

    // Allows for altering transactions after they were broadcast. Values below NO_SEQUENCE-1 mean it can be altered.
    private sequence: number = 0;
    // Data needed to connect to the output of the transaction we're gathering coins from.
    private outpoint!: TransactionOutPoint;
    // The "script bytes" might not actually be a script. In coinbase transactions where new coins are minted there
    // is no input transaction, so instead the scriptBytes contains some extra stuff (like a rollover nonce) that we
    // don't care about much. The bytes are turned into a Script object (cached below) on demand via a getter.
    private scriptBytes: Buffer = Buffer.alloc(0);
    // The Script object obtained from parsing scriptBytes. Only filled in on demand and if the transaction is not
    // coinbase.
    private scriptSig: Script | null = null;
    /** Value of the output connected to the input, if known. This field does not participate in equals()/hashCode(). */
    private value: Coin | null = null;

    /**
     * Creates an input that connects to nothing - used only in creation of coinbase transactions.
     */
    constructor(params: NetworkParameters, parentTransaction: Transaction | null, scriptBytes: Buffer);
    constructor(params: NetworkParameters, parentTransaction: Transaction | null, scriptBytes: Buffer,
                            outpoint: TransactionOutPoint);
    constructor(params: NetworkParameters, parentTransaction: Transaction | null, scriptBytes: Buffer,
            outpoint: TransactionOutPoint, value: Coin | null);
    /**
     * Deserializes an input message. This is usually part of a transaction message.
     */
    constructor(params: NetworkParameters, parentTransaction: Transaction | null, payload: Buffer, offset: number);
    /**
     * Deserializes an input message. This is usually part of a transaction message.
     * @param params NetworkParameters object.
     * @param payload Bitcoin protocol formatted byte array containing message content.
     * @param offset The location of the first payload byte within the array.
     * @param serializer the serializer to use for this message.
     * @throws ProtocolException
     */
    constructor(params: NetworkParameters, parentTransaction: Transaction | null, payload: Buffer, offset: number, serializer: MessageSerializer<any>);
    constructor(...args: any[]);
    constructor(...args: any[]) {
        const params = args[0];
        super(params);
        
        if (args.length >= 4 && args[2] instanceof Buffer && typeof args[3] === 'number') {
            // Deserialization constructors
            const parentTransaction = args[1];
            const payload = args[2];
            const offset = args[3];
            const serializer = args[4];
            
            this.payload = payload;
            this.offset = offset;
             this.cursor = offset;
            if (serializer) {
                this.serializer = serializer;
            }
            this.setParent(parentTransaction);
            this.value = null;
            this.sequence = TransactionInput.NO_SEQUENCE;
            this.parse();
        } else if (args.length >= 3 && args[2] instanceof Buffer) {
            // Creation constructors
            const parentTransaction = args[1];
            const scriptBytes = args[2];
            const outpoint = args[3];
            const value = args[4];
            
            this.scriptBytes = scriptBytes;
            if (outpoint) {
                this.outpoint = outpoint;
            } else {
                this.outpoint = new TransactionOutPoint(params, TransactionInput.UNCONNECTED, null, null);
            }
            this.sequence = TransactionInput.NO_SEQUENCE;
            if (value) {
                this.value = value;
            }
            this.setParent(parentTransaction);
            this.length = 40 + (scriptBytes.length === 0 ? 1 : VarInt.sizeOf(scriptBytes.length) + scriptBytes.length);
        } else {
            throw new Error("Invalid constructor arguments");
        }
    }

    /**
     * Creates an UNSIGNED input that links to the given output
     */
    public static fromOutput(params: NetworkParameters, parentTransaction: Transaction, output: TransactionOutput, blockHash: Sha256Hash): TransactionInput {
        const outputIndex = output.getIndex();
        let outpoint: TransactionOutPoint;
        if (output.getParentTransaction() !== null) {
            outpoint = new TransactionOutPoint(params, outputIndex, blockHash, output.getParentTransaction());
        } else {
            outpoint = new TransactionOutPoint(params, blockHash, output);
        }
        const scriptBytes = TransactionInput.EMPTY_ARRAY;
        const sequence = TransactionInput.NO_SEQUENCE;
        const value = output.getValue();
        const input = new TransactionInput(params, parentTransaction, scriptBytes, outpoint, value);
        input.sequence = sequence;
        input.length = 41;
        return input;
    }

    protected parse(): void {
        const startOffset = this.cursor;
        this.outpoint = new TransactionOutPoint(this.params!, this.payload!, this.cursor, this, this.serializer);
        this.cursor += this.outpoint.getMessageSize();
        const scriptLen = Number(this.readVarInt());
        this.scriptBytes = this.readBytes(scriptLen);
        if (!this.isCoinBase()) {
            this.sequence = this.readUint32();
        }
    
        // Parse value
        const vlen = Number(this.readVarInt());
        if (vlen > 0) {
            // Parse value bytes
            const v = this.readBytes(vlen);
            const valueBigInt = Utils.bytesToBigInt(v);
            
            // Parse token length
            const tokenLen = Number(this.readVarInt());
            // Parse token bytes
            const tokenBytes = this.readBytes(tokenLen);
            
            // Create the Coin with the parsed value and token
            this.value = new Coin(BigInt(valueBigInt.toString()), tokenBytes);
        } else {
            // Read token length and discard
            const tokenLen = Number(this.readVarInt());
            if (tokenLen > 0) {
                this.readBytes(tokenLen);
            }
            this.value = null;
        }
        this.length = this.cursor - startOffset;
    }

    public bitcoinSerializeToStream(stream: any): void {
        this.outpoint.bitcoinSerialize(stream);
        stream.write(new VarInt(this.scriptBytes.length).encode());
        stream.write(this.scriptBytes);
        if (!this.isCoinBase())
            Utils.uint32ToByteStreamLE(this.sequence, stream);
        // Serialize value
        if (this.value !== null) {
            // Serialize value as a varint followed by the actual value bytes
            const valueBigInt = bigInt(this.value.getValue().toString());
            // Convert BigInt to bytes using Utils method with 8 bytes (matches Java server expectation)
            const valueBytes = Utils.bigIntToBytes(valueBigInt, 8);
            // Write length as a single byte for small values
            stream.write(new VarInt(valueBytes.length).encode());
            // Write value bytes in the same order (big-endian) as the Java server expects
            stream.write(Buffer.from(valueBytes));

            // Serialize token ID
            stream.write(new VarInt(this.value.getTokenid().length).encode());
            stream.write(Buffer.from(this.value.getTokenid()));
        } else {
            // Write zero length for value
            stream.write(new VarInt(0).encode());
            // Write zero length for token ID
            stream.write(new VarInt(0).encode());
        }
    }

    getOptimalEncodingMessageSize(): number {
        return this.getMessageSize();
    }

    /**
     * Coinbase transactions have special inputs with hashes of zero. If this is such an input, returns true.
     */
    public isCoinBase(): boolean {
        return this.outpoint.isCoinBase();  // -1 but all is serialized to the wire as unsigned int.
    }

    /**
     * Returns the script that is fed to the referenced output (scriptPubKey) script in order to satisfy it: usually
     * contains signatures and maybe keys, but can contain arbitrary data if the output script accepts it.
     */
    public getScriptSig(): Script {
        // Transactions that generate new coins don't actually have a script. Instead this
        // parameter is overloaded to be something totally different.
        if (this.scriptSig === null) {
            this.scriptSig = new Script(this.scriptBytes);
        }
        return this.scriptSig;
    }

    /** Set the given program as the scriptSig that is supposed to satisfy the connected output script. */
    public setScriptSig(scriptSig: Script): void {
        this.scriptSig = scriptSig;
        // TODO: This should all be cleaned up so we have a consistent internal representation.
        this.setScriptBytes(Buffer.from(scriptSig.getProgram()));
    }

    /**
     * Convenience method that returns the from address of this input by parsing the scriptSig. The concept of a
     * "from address" is not well defined in Bitcoin and you should not assume that senders of a transaction can
     * actually receive coins on the same address they used to sign (e.g. this is not true for shared wallets).
     */
    public getFromAddress(): Address {
        if (this.isCoinBase()) {
            throw new ScriptException(
                    "This is a coinbase transaction which generates new coins. It does not have a from address.");
        }
        return this.getScriptSig().getFromAddress(this.params!);
    }

    /**
     * Sequence numbers allow participants in a multi-party transaction signing protocol to create new versions of the
     * transaction independently of each other. Newer versions of a transaction can replace an existing version that's
     * in nodes memory pools if the existing version is time locked. See the Contracts page on the Bitcoin wiki for
     * examples of how you can use this feature to build contract protocols.
     */
    public getSequenceNumber(): number {
        return this.sequence;
    }

    /**
     * Sequence numbers allow participants in a multi-party transaction signing protocol to create new versions of the
     * transaction independently of each other. Newer versions of a transaction can replace an existing version that's
     * in nodes memory pools if the existing version is time locked. See the Contracts page on the Bitcoin wiki for
     * examples of how you can use this feature to build contract protocols.
     */
    public setSequenceNumber(sequence: number): void {
        this.unCache();
        this.sequence = sequence;
    }

    /**
     * @return The previous output transaction reference, as an OutPoint structure.  This contains the 
     * data needed to connect to the output of the transaction we're gathering coins from.
     */
    public getOutpoint(): TransactionOutPoint {
        return this.outpoint;
    }

    /**
     * The "script bytes" might not actually be a script. In coinbase transactions where new coins are minted there
     * is no input transaction, so instead the scriptBytes contains some extra stuff (like a rollover nonce) that we
     * don't care about much. The bytes are turned into a Script object (cached below) on demand via a getter.
     * @return the scriptBytes
     */
    public getScriptBytes(): Buffer {
        return this.scriptBytes;
    }

    /** Clear input scripts, e.g. in preparation for signing. */
    public clearScriptBytes(): void {
        this.setScriptBytes(TransactionInput.EMPTY_ARRAY);
    }

    /**
     * @param scriptBytes the scriptBytes to set
     */
    public setScriptBytes(scriptBytes: Buffer): void {
        this.unCache();
        this.scriptSig = null;
        const oldLength = this.length;
        this.scriptBytes = scriptBytes;
        // 40 = previous_outpoint (36) + sequence (4)
        const newLength = 40 + (scriptBytes.length === 0 ? 1 : VarInt.sizeOf(scriptBytes.length) + scriptBytes.length);
        this.adjustLength(newLength - oldLength);
    }

    /**
     * @return The Transaction that owns this input.
     */
    public getParentTransaction(): Transaction | null {
        return this.parent as Transaction;
    }

    /**
     * @return Value of the output connected to this input, if known. Null if unknown.
     */
    public getValue(): Coin | null {
        return this.value;
    }

    /**
     * Alias for getOutpoint().getConnectedRedeemData(keyBag)
     * @see TransactionOutPoint#getConnectedRedeemData(net.bigtangle.wallet.KeyBag)
     */
    public getConnectedRedeemData(keyBag: KeyBag): Promise<RedeemData | null> {
        return this.getOutpoint().getConnectedRedeemData(keyBag);
    }


    /**
     * @return true if this transaction's sequence number is set (ie it may be a part of a time-locked transaction)
     */
    public hasSequence(): boolean {
        return this.sequence !== TransactionInput.NO_SEQUENCE;
    }

    /**
     * Returns whether this input will cause a transaction to opt into the
     * <a href="https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki">full replace-by-fee </a> semantics.
     */
    public isOptInFullRBF(): boolean {
        return this.sequence < TransactionInput.NO_SEQUENCE - 1;
    }

    /**
     * For a connected transaction, runs the script against the connected pubkey and verifies they are correct.
     * @throws ScriptException if the script did not verify.
     * @throws VerificationException If the outpoint doesn't match the given output.
     */
    public verify(): void {
        const fromTx = this.getOutpoint().fromTx;
        const spendingIndex = this.getOutpoint().getIndex();
        if (fromTx === null) throw new Error("Not connected");
        const output = fromTx.getOutput(spendingIndex);
        this.verifyOutput(output);
    }

    /**
     * Verifies that this input can spend the given output. Note that this input must be a part of a transaction.
     * Also note that the consistency of the outpoint will be checked, even if this input has not been connected.
     *
     * @param output the output that this input is supposed to spend.
     * @throws ScriptException If the script doesn't verify.
     * @throws VerificationException If the outpoint doesn't match the given output.
     */
    public verifyOutput(output: TransactionOutput): void {
        if (output.parent !== null) {
            if (!this.getOutpoint().getHash().equals(Sha256Hash.of(Buffer.from(Utils.addAll(
                    output.getParentTransaction()!.getParentBlock()!.getHash().getBytes(), output.getParentTransaction()!.getHash().getBytes())))))
                throw new VerificationException("This input does not refer to the tx containing the output.");
            if (this.getOutpoint().getIndex() !== output.getIndex())
                throw new VerificationException("This input refers to a different output on the given tx.");
        }
        const pubKey = output.getScriptPubKey();
        const myIndex = this.getParentTransaction()!.getInputs().indexOf(this);
        const r = this.getScriptSig();
        r.correctlySpends(this.getParentTransaction()!, myIndex, pubKey, Script.ALL_VERIFY_FLAGS);
    }

    /**
     * Returns the connected output, assuming the input was connected with
     * {@link TransactionInput#connect(TransactionOutput)} or variants at some point. If it wasn't connected, then
     * this method returns null.
     */
    public getConnectedOutput(): TransactionOutput | null {
        return this.getOutpoint().getConnectedOutput();
    }

    /**
     * Returns the connected transaction, assuming the input was connected with
     * {@link TransactionInput#connect(TransactionOutput)} or variants at some point. If it wasn't connected, then
     * this method returns null.
     */
    public getConnectedTransaction(): Transaction | null {
        return this.getOutpoint().fromTx;
    }

    /** Returns a copy of the input detached from its containing transaction, if need be. */
    public duplicateDetached(): TransactionInput {
        const payload = this.unsafeBitcoinSerialize();
        return new TransactionInput(this.params!, null, payload, 0);
    }

    public equals(o: any): boolean {
        if (this === o) return true;
        if (o === null || !(o instanceof TransactionInput)) return false;
        const other = o as TransactionInput;
        return this.sequence === other.sequence && this.parent === other.parent
            && this.outpoint.equals(other.outpoint) && this.scriptBytes.equals(other.scriptBytes);
    }

    public hashCode(): number {
        let result = 17;
        result = 31 * result + this.sequence;
        result = 31 * result + this.outpoint.hashCode();
        for (let i = 0; i < this.scriptBytes.length; i++) {
            result = 31 * result + this.scriptBytes[i];
        }
        return result;
    }

    /**
     * Returns a human readable debug string.
     */
    public toString(): string {
        let s = "TxIn";
        try {
            if (this.isCoinBase()) {
                s += ": COINBASE";
            } else {
                s += " for [" + this.outpoint + "]: " + this.getScriptSig();
                const flags = [];
                if (this.hasSequence()) flags.push("sequence: " + this.sequence.toString(16));
                if (this.isOptInFullRBF()) flags.push("opts into full RBF");
                if (flags.length > 0)
                    s += " (" + flags.join(", ") + ")";
            }
            return s;
        } catch (e) {
            throw new Error(e instanceof Error ? e.message : String(e));
        }
    }
}
