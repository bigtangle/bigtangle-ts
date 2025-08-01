import { ChildMessage } from './ChildMessage';
import { Coin } from './Coin';
import { Script } from '../script/Script';
import { Address } from './Address';
import { ECKey } from './ECKey';
import { NetworkParameters } from '../params/NetworkParameters';
import { Transaction } from './Transaction';
import { VarInt } from './VarInt';
import { Utils } from '../utils/Utils';
import { Buffer } from 'buffer';
import { TransactionInput } from './TransactionInput';
import { Sha256Hash } from './Sha256Hash';
import { ScriptBuilder } from '../script/ScriptBuilder';
import { TransactionOutPoint } from './TransactionOutPoint';
import { TransactionBag } from './TransactionBag';
import { ProtocolException } from '../exception/ProtocolException';
import { ScriptException } from '../exception/ScriptException';
import bigInt from 'big-integer';

 
/**
 * <p>
 * A TransactionOutput message contains a scriptPubKey that controls who is able
 * to spend its value. It is a sub-part of the Transaction message.
 * </p>
 * 
 * <p>
 * Instances of this class are not safe for use by multiple threads.
 * </p>
 */
export class TransactionOutput extends ChildMessage {
    private static readonly log = {
        debug: console.debug,
        isDebugEnabled: () => true
    };

    // The output's value is kept as a native type in order to save class
    // instances.
    private value!: Coin;

    // A transaction output has a script used for authenticating that the
    // redeemer is allowed to spend
    // this output.
    private scriptBytes!: Buffer;

    // The script bytes are parsed and turned into a Script on demand.
    private scriptPubKey: Script | null = null;

    // These fields are not Bitcoin serialized. They are used for tracking
    // purposes in our wallet
    // only. If set to true, this output is counted towards our balance. If
    // false and spentBy is null the tx output
    // was owned by us and was sent to somebody else. If false and spentBy is
    // set it means this output was owned by
    // us and used in one of our own transactions (eg, because it is a change
    // output).
    private availableForSpending: boolean = true;
    private spentBy: TransactionInput | null = null;

    private scriptLen: number = 0;
    private tokenLen: number = 0;

    private description: string | null = null;

    /**
     * Deserializes a transaction output message. This is usually part of a
     * transaction message.
     */
    /**
     * Deserializes a transaction output message. This is usually part of a
     * transaction message.
     */
    constructor(params: NetworkParameters, parent: Transaction | null, payload: Buffer, offset: number);
    /**
     * Deserializes a transaction output message. This is usually part of a
     * transaction message.
     *
     * @param params
     *            NetworkParameters object.
     * @param payload
     *            Bitcoin protocol formatted byte array containing message
     *            content.
     * @param offset
     *            The location of the first payload byte within the array.
     * @param serializer
     *            the serializer to use for this message.
     * @throws ProtocolException
     */
    constructor(params: NetworkParameters, parent: Transaction | null, payload: Buffer, offset: number, serializer: any);
    /**
     * Creates an output that sends 'value' to the given address (public key
     * hash). The amount should be created with something like
     * {@link Coin#valueOf(int, int)}. Typically you would use
     * {@link Transaction#addOutput(Coin, Address)} instead of creating a
     * TransactionOutput directly.
     */
    constructor(params: NetworkParameters, parent: Transaction | null, value: Coin, to: Address);
    /**
     * Creates an output that sends 'value' to the given public key using a
     * simple CHECKSIG script (no addresses). The amount should be created with
     * something like {@link Coin#valueOf(int, int)}. Typically you would use
     * {@link Transaction#addOutput(Coin, ECKey)} instead of creating an output
     * directly.
     */
    constructor(params: NetworkParameters, parent: Transaction | null, value: Coin, to: ECKey);
    constructor(params: NetworkParameters, parent: Transaction | null, value: Coin, scriptBytes: Buffer);
    constructor(...args: any[]) {
        const params = args[0];
        const parent = args[1];
        super(params);
        
        if (args.length >= 4 && args[2] instanceof Buffer && typeof args[3] === 'number') {
            // Deserialization constructors
            const payload = args[2];
            const offset = args[3];
            const serializer = args[4];
            
            this.payload = payload;
            this.offset = offset;
            if (serializer) {
                this.serializer = serializer;
            }
        this.setParent(parent);
        this.availableForSpending = true;
        this.parse();
        // Set the length in the parent Message class
        (this as any).length = this.length;
        } else if (args.length >= 4 && args[2] instanceof Coin && (args[3] instanceof Address || args[3] instanceof ECKey)) {
            // Creation constructors
            const value = args[2];
            const to = args[3];
            
            // Negative values obviously make no sense, except for -1 which is used
            // as a sentinel value when calculating
            // SIGHASH_SINGLE signatures, so unfortunately we have to allow that
            // here.
            if (value.signum() < 0 && !value.equals(Coin.NEGATIVE_SATOSHI)) {
                throw new Error("Negative values not allowed");
            }
            
            this.value = value;
            
            if (to instanceof Address) {
                this.scriptBytes = Buffer.from(ScriptBuilder.createOutputScript(to).getProgram());
            } else if (to instanceof ECKey) {
                this.scriptBytes = Buffer.from(ScriptBuilder.createOutputScript(to).getProgram());
            }
            
            this.setParent(parent);
            this.availableForSpending = true;
            this.length = this.value.getTokenid().length + VarInt.sizeOf(this.value.getTokenid().length)
                + VarInt.sizeOf(this.scriptBytes.length) + this.scriptBytes.length
                + VarInt.sizeOf(Buffer.byteLength(Utils.bigIntToBytes(bigInt(this.value.getValue().toString()) ))) + Buffer.byteLength(Utils.bigIntToBytes(bigInt(this.value.getValue().toString()) ));
        } else if (args.length === 4 && args[2] instanceof Coin && args[3] instanceof Buffer) {
            // Direct constructor with script bytes
            const value = args[2];
            const scriptBytes = args[3];
            
            // Negative values obviously make no sense, except for -1 which is used
            // as a sentinel value when calculating
            // SIGHASH_SINGLE signatures, so unfortunately we have to allow that
            // here.
            if (value.signum() < 0 && !value.equals(Coin.NEGATIVE_SATOSHI)) {
                throw new Error("Negative values not allowed");
            }
            
            this.value = value;
            this.scriptBytes = scriptBytes;
            this.setParent(parent);
            this.availableForSpending = true;
            this.length = this.value.getTokenid().length + VarInt.sizeOf(this.value.getTokenid().length)
                + VarInt.sizeOf(this.scriptBytes.length) + this.scriptBytes.length
                + VarInt.sizeOf(Buffer.byteLength(Utils.bigIntToBytes(bigInt(this.value.getValue().toString()) ))) + Buffer.byteLength(Utils.bigIntToBytes(bigInt(this.value.getValue().toString()) ));
        } else {
            throw new Error("Invalid constructor arguments");
        }
    }

    public getScriptPubKey(): Script {
        if (this.scriptPubKey == null) {
            this.scriptPubKey = new Script(this.scriptBytes);
        }
        return this.scriptPubKey;
    }

    /**
     * <p>
     * If the output script pays to an address as in
     * <a href="https://bitcoin.org/en/developer-guide#term-p2pkh"> P2PKH</a>,
     * return the address of the receiver, i.e., a base58 encoded hash of the
     * public key in the script.
     * </p>
     *
     * @param networkParameters
     *            needed to specify an address
     * @return null, if the output script is not the form <i>OP_DUP OP_HASH160
     *         <PubkeyHash> OP_EQUALVERIFY OP_CHECKSIG</i>, i.e., not P2PKH
     * @return an address made out of the public key hash
     */
    public getAddressFromP2PKHScript(networkParameters: NetworkParameters): Address | null {
        try {
            if (this.getScriptPubKey().isSentToAddress())
                return this.getScriptPubKey().getToAddress(networkParameters);
        } catch (e) {
            // Just means we didn't understand the output of this transaction:
            // ignore it.
            if (TransactionOutput.log) TransactionOutput.log.debug("Could not parse tx output script: " + e);
        }
        return null;
    }

    /**
     * <p>
     * If the output script pays to a redeem script, return the address of the
     * redeem script as described by, i.e., a base58 encoding of [one-byte
     * version][20-byte hash][4-byte checksum], where the 20-byte hash refers to
     * the redeem script.
     * </p>
     *
     * <p>
     * P2SH is described by <a href=
     * "https://github.com/bitcoin/bips/blob/master/bip-0016.mediawiki">BIP
     * 16</a> and
     * <a href="https://bitcoin.org/en/developer-guide#p2sh-scripts">documented
     * in the Bitcoin Developer Guide</a>.
     * </p>
     *
     * @param networkParameters
     *            needed to specify an address
     * @return null if the output script does not pay to a script hash
     * @return an address that belongs to the redeem script
     */
    public getAddressFromP2SH(networkParameters: NetworkParameters): Address | null {
        try {
            if (this.getScriptPubKey().isPayToScriptHash())
                return this.getScriptPubKey().getToAddress(networkParameters);
        } catch (e) {
            // Just means we didn't understand the output of this transaction:
            // ignore it.
            if (TransactionOutput.log) TransactionOutput.log.debug("Could not parse tx output script: " + e);
        }
        return null;
    }

    protected parse(): void {
        this.cursor = this.offset;
        
        // Parse value length
        const vlenVarInt = VarInt.fromBuffer(this.payload ?? Buffer.alloc(0), this.cursor);
        const vlen = Number(vlenVarInt.value);
        this.cursor += vlenVarInt.getOriginalSizeInBytes();
        
        let valueBigInt = 0n;
        if (vlen > 0) {
            // Parse value bytes
            const v = this.readBytes(vlen);
            const bigintValue = Utils.bytesToBigInt(v);
            valueBigInt = BigInt(bigintValue.toString());
        }
        
        // Parse token length
        const tokenLenVarInt = VarInt.fromBuffer(this.payload ?? Buffer.alloc(0), this.cursor);
        this.tokenLen = Number(tokenLenVarInt.value);
        this.cursor += tokenLenVarInt.getOriginalSizeInBytes();
        
        let tokenBytes = Buffer.alloc(0);
        if (this.tokenLen > 0) {
            // Parse token bytes
            tokenBytes = this.readBytes(this.tokenLen);
        }
        
        // Create the Coin with the parsed value and token
        this.value = new Coin(valueBigInt, tokenBytes);
        
        // Parse script length
        const scriptLenVarInt = VarInt.fromBuffer(this.payload ?? Buffer.alloc(0), this.cursor);
        this.scriptLen = Number(scriptLenVarInt.value);
        this.cursor += scriptLenVarInt.getOriginalSizeInBytes();
        
        console.log(`Parsing TransactionOutput: scriptLen=${this.scriptLen}, cursor=${this.cursor}, payload.length=${this.payload?.length}`);
        // Parse script bytes
        this.scriptBytes = this.readBytes(this.scriptLen);
        console.log(`Parsed scriptBytes: ${this.scriptBytes.toString('hex')}`);
        
        // Set the length of this TransactionOutput
        this.length = this.cursor - this.offset;
    }

    public bitcoinSerializeToStream(stream: any): void {
        if (!this.scriptBytes) throw new Error("scriptBytes is null");
        // Serialize value as a varint followed by the actual value bytes
        const valueBigInt = bigInt(this.value.getValue().toString());
        // Convert BigInt to bytes using Utils method with minimum bytes needed
        let valueBytes = Utils.bigIntToBytes(valueBigInt );
        // Remove leading zeros to match Java BigInteger serialization
        let firstNonZeroIndex = 0;
        while (firstNonZeroIndex < valueBytes.length && valueBytes[firstNonZeroIndex] === 0) {
            firstNonZeroIndex++;
        }
        // If all bytes are zero, keep one zero byte
        if (firstNonZeroIndex === valueBytes.length) {
            valueBytes = new Uint8Array([0]);
        } else {
            valueBytes = valueBytes.slice(firstNonZeroIndex);
        }
        // Write length as a varint
        stream.write(new VarInt(valueBytes.length).encode());
        // Write value bytes
        stream.write(Buffer.from(valueBytes));

        // Serialize token ID
        stream.write(new VarInt(this.value.getTokenid().length).encode());
        stream.write(Buffer.from(this.value.getTokenid()));
        
        // Serialize script
        const scriptLen = new VarInt(this.scriptBytes.length).encode();
        stream.write(scriptLen);
        stream.write(this.scriptBytes);
    }

    /**
     * Returns the value of this output. This is the amount of currency that the
     * destination address receives.
     */
    public getValue(): Coin {
        return this.value;
    }

    /**
     * Sets the value of this output.
     */
    public setValue(value: Coin): void {
        if (!value) throw new Error("value cannot be null");
        this.unCache();
        this.value = value;
    }

    /**
     * Gets the index of this output in the parent transaction, or throws if
     * this output is free standing. Iterates over the parents list to discover
     * this.
     */
    public getIndex(): number {
        const outputs = this.getParentTransaction()?.getOutputs();
        if (outputs) {
            for (let i = 0; i < outputs.length; i++) {
                if (outputs[i] === this)
                    return i;
            }
        }
        throw new Error("Output linked to wrong parent transaction?");
    }

    /**
     * Sets this objects availableForSpending flag to false and the spentBy
     * pointer to the given input. If the input is null, it means this output
     * was signed over to somebody else rather than one of our own keys.
     * 
     * @throws Error
     *             if the transaction was already marked as spent.
     */
    public markAsSpent(input: TransactionInput): void {
        if (!this.availableForSpending) throw new Error("Transaction already marked as spent.");
        this.availableForSpending = false;
        this.spentBy = input;
        if (this.parent != null) {
            if (TransactionOutput.log && TransactionOutput.log.isDebugEnabled())
                TransactionOutput.log.debug("Marked " + this.getParentTransactionHash() + ":" + this.getIndex() + " as spent by " + input);
        } else if (TransactionOutput.log && TransactionOutput.log.isDebugEnabled()) {
            TransactionOutput.log.debug("Marked floating output as spent by " + input);
        }
    }

    /**
     * Resets the spent pointer / availableForSpending flag to null.
     */
    public markAsUnspent(): void {
        if (this.parent != null) {
            if (TransactionOutput.log && TransactionOutput.log.isDebugEnabled())
                TransactionOutput.log.debug("Un-marked " + this.getParentTransactionHash() + ":" + this.getIndex() + " as spent by " + this.spentBy);
        } else if (TransactionOutput.log && TransactionOutput.log.isDebugEnabled()) {
            TransactionOutput.log.debug("Un-marked floating output as spent by " + this.spentBy);
        }
        this.availableForSpending = true;
        this.spentBy = null;
    }

    /**
     * Returns whether {@link TransactionOutput#markAsSpent(TransactionInput)}
     * has been called on this class. A {@link Wallet} will mark a transaction
     * output as spent once it sees a transaction input that is connected to it.
     * Note that this flag can be false when an output has in fact been spent
     * according to the rest of the network if the spending transaction wasn't
     * downloaded yet, and it can be marked as spent when in reality the rest of
     * the network believes it to be unspent if the signature or script
     * connecting to it was not actually valid.
     */
    public isAvailableForSpending(): boolean {
        return this.availableForSpending;
    }

    /**
     * The backing script bytes which can be turned into a Script object.
     * 
     * @return the scriptBytes
     */
    public getScriptBytes(): Buffer {
        return this.scriptBytes;
    }

    /**
     * Returns true if this output is to a key in the wallet or to an
     * address/script we are watching.
     */
    public isMineOrWatched(transactionBag: TransactionBag): boolean {
        return this.isMine(transactionBag) || this.isWatched(transactionBag);
    }

    /**
     * Returns true if this output is to a key, or an address we have the keys
     * for, in the wallet.
     */
    public isWatched(transactionBag: TransactionBag): boolean {
        try {
            const script = this.getScriptPubKey();
            return transactionBag.isWatchedScript(script);
        } catch (e) {
            // Just means we didn't understand the output of this transaction:
            // ignore it.
            if (TransactionOutput.log) TransactionOutput.log.debug("Could not parse tx output script: " + e);
            return false;
        }
    }

    /**
     * Returns true if this output is to a key, or an address we have the keys
     * for, in the wallet.
     */
    public isMine(transactionBag: TransactionBag): boolean {
        try {
            const script = this.getScriptPubKey();
            if (script.isSentToRawPubKey()) {
                const pubkey = script.getPubKey();
                return transactionBag.isPubKeyMine(pubkey);
            }
            if (script.isPayToScriptHash()) {
                return transactionBag.isPayToScriptHashMine(script.getPubKeyHash());
            } else {
                const pubkeyHash = script.getPubKeyHash();
                return transactionBag.isPubKeyHashMine(pubkeyHash);
            }
        } catch (e) {
            // Just means we didn't understand the output of this transaction:
            // ignore it.
            if (TransactionOutput.log) TransactionOutput.log.debug("Could not parse tx " + (this.parent != null ? this.parent.getHash() : "(no parent)") + " output script: " + e);
            return false;
        }
    }

    /**
     * Returns a human readable debug string.
     */
    public toString(): string {
        try {
            const script = this.getScriptPubKey();
            let buf = "TxOut of " + this.value.toString();
            if (script.isSentToAddress() || script.isPayToScriptHash()) {
                if (this.params !== null) {
                    buf += " to " + script.getToAddress(this.params);
                } else {
                    buf += " to unknown address (null params)";
                }
            } else if (script.isSentToRawPubKey())
                buf += " to pubkey " + Utils.HEX.encode(script.getPubKey());
            else if (script.isSentToMultiSig())
                buf += " to multisig";
            else
                buf += " (unknown type)";
            buf += " script:" + script;
            return buf;
        } catch (e) {
            throw new Error(e instanceof Error ? e.message : String(e));
        }
    }

    /**
     * Returns the connected input.
     */
    public getSpentBy(): TransactionInput | null {
        return this.spentBy;
    }

    /**
     * Returns the transaction that owns this output.
     */
    public getParentTransaction(): Transaction | null {
        return this.parent as unknown as Transaction;
    }

    /**
     * Returns the transaction hash that owns this output.
     */
    public getParentTransactionHash(): Sha256Hash | null {
        return this.parent == null ? null : this.parent.getHash();
    }

    /**
     * Returns a new {@link TransactionOutPoint}, which is essentially a
     * structure pointing to this output. Requires that this output is not
     * detached.
     */
    public getOutPointFor(containingBlockHash: Sha256Hash): TransactionOutPoint {
        if (this.params === null) {
            throw new Error("Cannot create TransactionOutPoint with null params");
        }
        return new TransactionOutPoint(this.params, this.getIndex(), containingBlockHash, this.getParentTransaction());
    }

    /**
     * Returns a copy of the output detached from its containing transaction, if
     * need be.
     */
    public duplicateDetached(): TransactionOutput {
        if (this.params === null) {
            throw new Error("Cannot duplicate TransactionOutput with null params");
        }
        return new TransactionOutput(this.params, null, this.value, Buffer.from(this.scriptBytes));
    }

    public equals(o: any): boolean {
        if (this === o)
            return true;
        if (o == null || !(o instanceof TransactionOutput))
            return false;
        const other = o as TransactionOutput;
        return this.value.equals(other.value) && 
               (this.parent == null || (this.parent === other.parent && this.getIndex() === other.getIndex())) &&
               this.scriptBytes.equals(other.scriptBytes);
    }

    public hashCode(): number {
        let result = 17;
        result = 31 * result + this.value.hashCode();
        result = 31 * result + (this.parent && typeof (this.parent as any).hashCode === 'function' ? (this.parent as any).hashCode() : 0);
        for (let i = 0; i < this.scriptBytes.length; i++) {
            result = 31 * result + this.scriptBytes[i];
        }
        return result;
    }

    /**
     * Returns the size of the message in bytes after serialization.
     * This method should return the actual size of the parsed data.
     */
    public getMessageSize(): number {
        // Return the length that was set during parsing
        // If length is not set (e.g., for newly created outputs), calculate it
        if (this.length > 0) {
            return this.length;
        }
        
        // For newly created outputs, calculate the size
        if (this.value && this.scriptBytes) {
            // Calculate the size based on the serialization format:
            // value length (varint) + value bytes + token length (varint) + token bytes + script length (varint) + script bytes
            const valueBigInt = bigInt(this.value.getValue().toString());
            let valueBytes = Utils.bigIntToBytes(valueBigInt);
            // Remove leading zeros to match Java BigInteger serialization
            let firstNonZeroIndex = 0;
            while (firstNonZeroIndex < valueBytes.length && valueBytes[firstNonZeroIndex] === 0) {
                firstNonZeroIndex++;
            }
            // If all bytes are zero, keep one zero byte
            if (firstNonZeroIndex === valueBytes.length) {
                valueBytes = new Uint8Array([0]);
            } else {
                valueBytes = valueBytes.slice(firstNonZeroIndex);
            }
            
            return VarInt.sizeOf(valueBytes.length) + valueBytes.length +
                   VarInt.sizeOf(this.value.getTokenid().length) + this.value.getTokenid().length +
                   VarInt.sizeOf(this.scriptBytes.length) + this.scriptBytes.length;
        }
        
        // Fallback to the parent implementation if needed
        return super.getMessageSize();
    }

    public getDescription(): string | null {
        return this.description;
    }

    public setDescription(description: string | null): void {
        this.description = description;
    }

    /**
     * Creates a new TransactionOutput object with the given parameters.
     * 
     * @param params NetworkParameters object
     * @param parent Parent transaction
     * @param value Value to send
     * @param to Address to send to
     * @return A new TransactionOutput object
     */
    public static fromAddress(params: NetworkParameters, parent: Transaction | null, value: Coin, to: Address): TransactionOutput {
        return new TransactionOutput(params, parent, value, to);
    }

    /**
     * Creates a new TransactionOutput object with the given parameters.
     * 
     * @param params NetworkParameters object
     * @param parent Parent transaction
     * @param value Value to send
     * @param to ECKey to send to
     * @return A new TransactionOutput object
     */
    public static fromECKey(params: NetworkParameters, parent: Transaction | null, value: Coin, to: ECKey): TransactionOutput {
        return new TransactionOutput(params, parent, value, to);
    }
}
