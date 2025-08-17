/*******************************************************************************
 *  Copyright   2018  Inasset GmbH.
 *
 *******************************************************************************/
/*
 * Copyright 2011 Google Inc.
 * Copyright 2014 Andreas Schildbach
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ChildMessage } from './ChildMessage';
import { NetworkParameters } from '../params/NetworkParameters';
import { ProtocolException } from '../exception/ProtocolException';
import { Sha256Hash } from './Sha256Hash';
import { TransactionInput } from './TransactionInput';
import { TransactionOutput } from './TransactionOutput';
import { Block } from './Block';
import { Coin } from './Coin';
import { Address } from './Address';
import { ECKey } from './ECKey';
import { Script } from '../script/Script';
import { TransactionBag } from './TransactionBag';
import { VerificationException } from '../exception/VerificationException';
import { ScriptException } from '../exception/ScriptException';
import { Purpose } from './Purpose';
import { SigHash } from './SigHash';
import { Utils } from './Utils';
import { VarInt } from './VarInt';
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
export class Transaction extends ChildMessage {
    /**
     * Threshold for lockTime: below this value it is interpreted as block number,
     * otherwise as timestamp.
     **/
    public static readonly LOCKTIME_THRESHOLD: number = 500000000; // Tue Nov 5
    // 00:53:20 1985 UTC

    private static _REFERENCE_DEFAULT_MIN_TX_FEE: Coin | null = null;
    private static _MIN_NONDUST_OUTPUT: Coin | null = null;

    /**
     * If feePerKb is lower than this, Bitcoin Core will treat it as if there were
     * no fee.
     */
    public static get REFERENCE_DEFAULT_MIN_TX_FEE(): Coin {
        if (this._REFERENCE_DEFAULT_MIN_TX_FEE === null) {
            this._REFERENCE_DEFAULT_MIN_TX_FEE = Coin.valueOf(5000n, Buffer.from("6263", "hex")); // 0.05
        }
        return this._REFERENCE_DEFAULT_MIN_TX_FEE;
    }

    /**
     * Any standard (ie pay-to-address) output smaller than this value (in satoshis)
     * will most likely be rejected by the network. This is calculated by assuming a
     * standard output will be 34 bytes, and then using the formula used in .
     */
    public static get MIN_NONDUST_OUTPUT(): Coin {
        if (this._MIN_NONDUST_OUTPUT === null) {
            this._MIN_NONDUST_OUTPUT = Coin.valueOf(2730n, Buffer.from("6263", "hex")); // satoshis
        }
        return this._MIN_NONDUST_OUTPUT;
    }

    // These are bitcoin serialized.
    private version: number = 1;
    private inputs: TransactionInput[] = [];
    private outputs: TransactionOutput[] = [];

    private lockTime: number = 0;

    // This is an in memory helper only.
    private hash: Sha256Hash | null = null;

    // Tracks optimal encoding message size (mirror of Java field)
    private optimalEncodingMessageSize: number = 0;

    private purpose: Purpose = Purpose.UNKNOWN;

    /**
     * This field can be used to record the memo of the payment request that
     * initiated the transaction. It's optional.
     */
    private memo: string | null = null;

    private data: Uint8Array | null = null;

    private dataSignature: Uint8Array | null = null;

    private dataClassName: string | null = null;

    private toAddressInSubtangle: Uint8Array | null = null;

    public constructor(params: NetworkParameters) {
        super(params);
        // We don't initialize appearsIn deliberately as it's only useful for
        // transactions stored in the wallet.
        this.length = 8; // 8 for std fields
    }

    public static fromTransaction6(params: NetworkParameters, payload: Uint8Array, offset: number, parent: Block | null, serializer: any, length: number): Transaction {
        const tx = new Transaction(params);
        // Call the setValues method to initialize from payload
        tx.setValues5(params, payload, offset, serializer, length);
        // Set the parent if provided
        if (parent) {
            tx.setParent(parent);
        }
        return tx;
    }

    public getOptimalEncodingMessageSize(): number {
        // TODO: Implement this method properly
        if (this.optimalEncodingMessageSize && this.optimalEncodingMessageSize !== 0)
            return this.optimalEncodingMessageSize;
        this.optimalEncodingMessageSize = this.getMessageSize();
        return this.optimalEncodingMessageSize;
    }

    public getSigOpCount(): number {
        // TODO: Implement this method properly
        return 0;
    }

    /**
     * Returns the transaction hash as you see them in the block explorer.
     */
    public getHash(): Sha256Hash {
        if (this.hash === null) {
            const buf = this.unsafeBitcoinSerialize();
            // TODO: Implement Sha256Hash.wrapReversed and Sha256Hash.hashTwice
            this.hash = Sha256Hash.ZERO_HASH; // Placeholder
        }
        return this.hash;
    }

    /**
     * Calculates the hash for the signature.
     */
    public hashForSignature(inputIndex: number, connectedScript: Uint8Array, sighashFlags: number): Uint8Array {
        // TODO: Implement this method properly
        return new Uint8Array(32); // Placeholder - return 32-byte array
    }

    /**
     * Returns a copy of the transaction with all the inputs and outputs.
     */
    public bitcoinSerializeCopy(): Uint8Array {
        return this.unsafeBitcoinSerialize();
    }

    /**
     * Calculates the sum of the outputs that are sending coins to a key in the
     * wallet.
     */
    public getValueSentToMe(transactionBag: TransactionBag): Coin {
        // This is tested in WalletTest.
        let v = Coin.ZERO;
        for (const o of this.outputs) {
            if (!o.isMineOrWatched(transactionBag))
                continue;
            v = v.add(o.getValue());
        }
        return v;
    }

    /**
     * Gets the sum of the outputs of the transaction. If the outputs are less than
     * the inputs, it does not count the fee.
     *
     * @return the sum of the outputs regardless of who owns them.
     */
    public getOutputSum(): bigint {
        let totalOut = BigInt(0);

        for (const output of this.outputs) {
            totalOut += output.getValue().getValue();
        }

        return totalOut;
    }

    /**
     * Returns true if any of the outputs is marked as spent.
     */
    public isAnyOutputSpent(): boolean {
        for (const output of this.outputs) {
            if (!output.isAvailableForSpending())
                return true;
        }
        return false;
    }

    /**
     * Returns false if this transaction has at least one output that is owned by
     * the given wallet and unspent, true otherwise.
     */
    public isEveryOwnedOutputSpent(transactionBag: TransactionBag): boolean {
        for (const output of this.outputs) {
            if (output.isAvailableForSpending() && output.isMineOrWatched(transactionBag))
                return false;
        }
        return true;
    }

    /**
     * @deprecated Instead use SigHash.ANYONECANPAY or
     *             SigHash.ANYONECANPAY_ALL as appropriate.
     */
    public static readonly SIGHASH_ANYONECANPAY_VALUE: number = 0x80;

    /**
     * A coinbase transaction is one that creates a new coin.
     */
    public isCoinBase(): boolean {
        return this.inputs.length == 1 && this.inputs[0].isCoinBase();
    }

    /**
     * Removes all the inputs from this transaction. Note that this also invalidates
     * the length attribute
     */
    public clearInputs(): void {
        this.unCache();
        for (const input of this.inputs) {
            input.setParent(null);
        }
        this.inputs = [];
        // You wanted to reserialize, right?
        this.length = this.unsafeBitcoinSerialize().length;
    }

    /**
     * Adds an input to this transaction that imports value from the given output.
     * Note that this input is <i>not</i> complete and after every input is added
     * with and every output is added with , a {@link TransactionSigner} must be
     * used to finalize the transaction and finish the inputs off. Otherwise it
     * won't be accepted by the network.
     *
     * @return the newly created input.
     */
    public addInput(blockHash: Sha256Hash, from: TransactionOutput): TransactionInput;
    public addInput(input: TransactionInput): TransactionInput;
    public addInput(...args: any[]): TransactionInput {
        if (args.length === 1 && args[0] instanceof TransactionInput) {
            // Single argument: TransactionInput
            const input = args[0];
            this.addInputDirect(input);
            return input;
        } else if (args.length === 2 && args[0] instanceof Sha256Hash && args[1] instanceof TransactionOutput) {
            // Two arguments: Sha256Hash and TransactionOutput
            const blockHash = args[0];
            const from = args[1];
            // TODO: Implement TransactionInput.fromTransactionInput4
            const input = new TransactionInput(this.params!); // Placeholder
            this.addInputDirect(input);
            return input;
        } else {
            throw new Error("Invalid arguments for addInput method");
        }
    }

    /**
     * Adds an input directly, with no checking that it's valid.
     *
     * @return the new input.
     */
    public addInputDirect(input: TransactionInput): TransactionInput {
        this.unCache();
        input.setParent(this);
        this.inputs.push(input);
        // TODO: Implement adjustLength
        // this.adjustLength(this.inputs.size(), input.length);
        return input;
    }

    /**
     * Removes all the outputs from this transaction. Note that this also
     * invalidates the length attribute
     */
    public clearOutputs(): void {
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
    public addOutput(to: TransactionOutput): TransactionOutput {
        this.unCache();
        to.setParent(this);
        this.outputs.push(to);
        // TODO: Implement adjustLength
        // this.adjustLength(this.outputs.size(), to.length);
        return to;
    }

    /**
     * Creates an output based on the given address and value, adds it to this
     * transaction, and returns the new output.
     */
    public addOutputByAddress(value: Coin, address: Address): TransactionOutput {
        // TODO: Implement TransactionOutput.fromAddress
        const to = new TransactionOutput(this.params!, this, value, Buffer.alloc(0)); // Placeholder
        return this.addOutput(to);
    }

    /**
     * Creates an output that pays to the given pubkey directly (no address) with
     * the given value, adds it to this transaction, and returns the new output.
     */
    public addOutputByECKey(value: Coin, pubkey: ECKey): TransactionOutput {
        // TODO: Implement TransactionOutput.fromCoinKey
        const to = new TransactionOutput(this.params!, this, value, Buffer.alloc(0)); // Placeholder
        return this.addOutput(to);
    }

    /**
     * Creates an output that pays to the given script. The address and key forms
     * are specialisations of this method, you won't normally need to use it unless
     * you're doing unusual things.
     */
    public addOutputByScript(value: Coin, script: Script): TransactionOutput {
        const to = new TransactionOutput(this.params!, this, value, script.getProgram());
        return this.addOutput(to);
    }

    /**
     * Transactions can have an associated lock time, specified either as a block
     * height or in seconds since the UNIX epoch. A transaction is not allowed to be
     * confirmed by miners until the lock time is reached, and since Bitcoin 0.8+ a
     * transaction that did not end its lock period (non final) is considered to be
     * non standard and won't be relayed or included in the memory pool either.
     */
    public getLockTime(): number {
        return this.lockTime;
    }

    /**
     * Transactions can have an associated lock time, specified either as a block
     * height or in seconds since the UNIX epoch. A transaction is not allowed to be
     * confirmed by miners until the lock time is reached, and since Bitcoin 0.8+ a
     * transaction that did not end its lock period (non final) is considered to be
     * non standard and won't be relayed or included in the memory pool either.
     */
    public setLockTime(lockTime: number): void {
        this.unCache();
        let seqNumSet = false;
        for (const input of this.inputs) {
            if (input.getSequenceNumber() != TransactionInput.NO_SEQUENCE) {
                seqNumSet = true;
                break;
            }
        }
        if (lockTime != 0 && (!seqNumSet || this.inputs.length == 0)) {
            // At least one input must have a non-default sequence number for
            // lock times to have any effect.
            // For instance one of them can be set to zero to make this feature
            // work.
            console.warn(
                "You are setting the lock time on a transaction but none of the inputs have non-default sequence numbers. This will not do what you expect!");
        }
        this.lockTime = lockTime;
    }

    public getVersion(): number {
        return this.version;
    }

    public setVersion(version: number): void {
        this.version = version;
        this.unCache();
    }

    /** Returns an unmodifiable view of all inputs. */
    public getInputs(): TransactionInput[] {
        return this.inputs;
    }

    /** Returns an unmodifiable view of all outputs. */
    public getOutputs(): TransactionOutput[] {
        return this.outputs;
    }

    /** Same as getInputs().get(index). */
    public getInput(index: number): TransactionInput {
        return this.inputs[index];
    }

    /** Same as getOutputs().get(index) */
    public getOutput(index: number): TransactionOutput {
        return this.outputs[index];
    }

    /**
     * @return The Block that owns this input.
     */
    public getParentBlock(): Block | null {
        return this.parent as Block;
    }

    /**
     * Returns the purpose for which this transaction was created. See the javadoc
     * for {@link Purpose} for more information on the point of this field and what
     * it can be.
     */
    public getPurpose(): Purpose {
        return this.purpose;
    }

    /**
     * Marks the transaction as being created for the given purpose. See the javadoc
     * for {@link Purpose} for more information on the point of this field and what
     * it can be.
     */
    public setPurpose(purpose: Purpose): void {
        this.purpose = purpose;
        this.unCache();
    }

    /**
     * Returns the transaction {@link #memo}.
     */
    public getMemo(): string | null {
        return this.memo;
    }

    /**
     * Set the transaction {@link #memo}. It can be used to record the memo of the
     * payment request that initiated the transaction.
     *
     */
    public setMemo(memo: string | null): void {
        this.memo = memo;
        this.unCache();
    }

    public getData(): Uint8Array | null {
        return this.data;
    }

    public setData(data: Uint8Array | null): void {
        this.data = data;
        this.unCache();
    }

    public getDataSignature(): Uint8Array | null {
        return this.dataSignature;
    }

    public setDataSignature(datasignature: Uint8Array | null): void {
        this.dataSignature = datasignature;
        this.unCache();
    }

    public getDataClassName(): string | null {
        return this.dataClassName;
    }

    public setDataClassName(dataclassname: string | null): void {
        this.dataClassName = dataclassname;
        this.unCache();
    }

    public getToAddressInSubtangle(): Uint8Array | null {
        return this.toAddressInSubtangle;
    }

    public setToAddressInSubtangle(subtangleID: Uint8Array | null): void {
        this.toAddressInSubtangle = subtangleID;
        this.unCache();
    }

    /**
     * <p>
     * Checks the transaction contents for sanity, in ways that can be done in a
     * standalone manner. Does <b>not</b> perform all checks on a transaction such
     * as whether the inputs are already spent. Specifically this method verifies:
     * </p>
     *
     * <ul>
     * <li>That the serialized size is not larger than the max block size.</li>
     * <li>That no outputs have negative value.</li>
     * <li>That the outputs do not sum to larger than the max allowed quantity of
     * coin in the system.</li>
     * <li>If the tx is a coinbase tx, the coinbase scriptSig size is within range.
     * Otherwise that there are no coinbase inputs in the tx.</li>
     * </ul>
     *
     */
    public verify(): void {
        // Check for duplicate outpoints
        const outpoints = new Set<string>();
        for (const input of this.inputs) {
            const outpointKey = input.getOutpoint().toString();
            if (outpoints.has(outpointKey)) {
                throw new VerificationException("Duplicated outpoint");
            }
            outpoints.add(outpointKey);
        }

        // Check for coinbase input in non-coinbase transaction
        if (this.inputs.length > 0 && !this.isCoinBase()) {
            for (const input of this.inputs) {
                if (input.isCoinBase()) {
                    throw new VerificationException("Unexpected coinbase input");
                }
            }
        }

        // Check coinbase script size
        if (this.isCoinBase()) {
            const scriptBytes = this.inputs[0].getScriptBytes();
            if (scriptBytes.length < 2 || scriptBytes.length > 100) {
                throw new VerificationException("Coinbase script size out of range");
            }
        }
    }

    protected parse(): void {
        // Check if we have a payload to parse
        if (!this.payload) {
            throw new Error("No payload to parse");
        }
        
        console.log(`Transaction.parse: Starting parse at offset ${this.offset}, cursor ${this.cursor}, payload length ${this.payload.length}`);
        
        // Check if we have enough bytes to read the version
        if (this.cursor + 4 > this.payload.length) {
            throw new Error(`Not enough bytes to read version: offset=${this.cursor}, buffer length=${this.payload.length}`);
        }
        this.version = this.readUint32();
        console.log(`Transaction.parse: Read version ${this.version}, cursor now ${this.cursor}`);
        
        // Check if we have enough bytes to read the number of inputs
        // We need at least 1 byte for the VarInt, but it could be more
        if (this.cursor >= this.payload.length) {
            throw new Error(`Not enough bytes to read number of inputs: offset=${this.cursor}, buffer length=${this.payload.length}`);
        }
        const numInputs = this.readVarInt();
        console.log(`Transaction.parse: Number of inputs: ${numInputs}, cursor now ${this.cursor}`);
        this.inputs = [];
        for (let i = 0; i < numInputs; i++) {
            if (this.params === null) {
                throw new Error("Network parameters are null");
            }
            if (this.payload === null) {
                throw new Error("Payload is null");
            }
            console.log(`Transaction.parse: Parsing input ${i} at cursor ${this.cursor}`);
            const input = TransactionInput.fromTransactionInput5(
                this.params, 
                this, 
                this.payload, 
                this.cursor, 
                this.serializer!
            );
            this.inputs.push(input);
            // Update the cursor based on the input's message size
            this.cursor += input.getMessageSize();
            console.log(`Transaction.parse: Parsed input ${i}, cursor now ${this.cursor}`);
        }
        
        // Check if we have enough bytes to read the number of outputs
        if (this.cursor >= this.payload.length) {
            throw new Error(`Not enough bytes to read number of outputs: offset=${this.cursor}, buffer length=${this.payload.length}`);
        }
        const numOutputs = this.readVarInt();
        console.log(`Transaction.parse: Number of outputs: ${numOutputs}, cursor now ${this.cursor}`);
        this.outputs = [];
        for (let i = 0; i < numOutputs; i++) {
            if (this.params === null) {
                throw new Error("Network parameters are null");
            }
            if (this.payload === null) {
                throw new Error("Payload is null");
            }
            console.log(`Transaction.parse: Parsing output ${i} at cursor ${this.cursor}`);
            const output = TransactionOutput.fromTransactionOutput(
                this.params, 
                this, 
                this.payload, 
                this.cursor, 
                this.serializer!
            );
            this.outputs.push(output);
            // Update the parent cursor by the parsed output's size (child parse doesn't affect parent cursor)
            this.cursor += output.getMessageSize();
            console.log(`Transaction.parse: Parsed output ${i}, cursor now ${this.cursor}`);
        }
        
        // Check if we have enough bytes to read the lockTime
        if (this.cursor + 4 > this.payload.length) {
            throw new Error(`Not enough bytes to read lockTime: offset=${this.cursor}, buffer length=${this.payload.length}`);
        }
        this.lockTime = this.readUint32();
        console.log(`Transaction.parse: Read lockTime ${this.lockTime}, cursor now ${this.cursor}`);
        // Read optional additional fields present in the Java implementation
        // Each field is prefixed by a uint32 length. Defensive: validate the
        // claimed length before attempting to read to avoid throwing when the
        // cursor is misaligned and claims an absurdly large length.
        const safeReadLen = (): number => {
            let l = this.readUint32();
            const remaining = this.payload ? (this.payload.length - this.cursor) : 0;
            if (l < 0 || l > remaining || l > (Message ? Message.MAX_SIZE : Number.MAX_SAFE_INTEGER)) {
                console.warn(`Transaction.parse: claimed length ${l} at cursor ${this.cursor - 4} is invalid (remaining=${remaining}), treating as 0`);
                return 0;
            }
            return l;
        };

        // dataClassName
        let len = safeReadLen();
        if (len > 0) {
            const buf = this.readBytes(len);
            this.dataClassName = new TextDecoder().decode(buf);
        }

        // data
        len = safeReadLen();
        if (len > 0) {
            this.data = this.readBytes(len);
        }

        // toAddressInSubtangle
        len = safeReadLen();
        if (len > 0) {
            this.toAddressInSubtangle = this.readBytes(len);
        }

        // memo
        len = safeReadLen();
        if (len > 0) {
            this.memo = new TextDecoder().decode(this.readBytes(len));
        }

        // dataSignature
        len = safeReadLen();
        if (len > 0) {
            this.dataSignature = this.readBytes(len);
        }

        this.length = this.cursor - this.offset;
        console.log(`Transaction.parse: Finished parse, length ${this.length}`);
    }

    protected bitcoinSerializeToStream(stream: any): void {
        Utils.uint32ToByteStreamLE(this.version, stream);
        stream.write(new VarInt(this.inputs.length).encode());
        for (const input of this.inputs) {
            input.bitcoinSerialize(stream);
        }
        stream.write(new VarInt(this.outputs.length).encode());
        for (const output of this.outputs) {
            output.bitcoinSerialize(stream);
        }
        Utils.uint32ToByteStreamLE(this.lockTime, stream);
        // write dataClassName
        if (this.dataClassName == null) {
            Utils.uint32ToByteStreamLE(0, stream);
        } else {
            const b = new TextEncoder().encode(this.dataClassName);
            Utils.uint32ToByteStreamLE(b.length, stream);
            stream.write(b);
        }

        // write data
        if (this.data == null) {
            Utils.uint32ToByteStreamLE(0, stream);
        } else {
            Utils.uint32ToByteStreamLE(this.data.length, stream);
            stream.write(this.data);
        }

        // write toAddressInSubtangle
        if (this.toAddressInSubtangle == null) {
            Utils.uint32ToByteStreamLE(0, stream);
        } else {
            Utils.uint32ToByteStreamLE(this.toAddressInSubtangle.length, stream);
            stream.write(this.toAddressInSubtangle);
        }

        // write memo
        if (this.memo == null) {
            Utils.uint32ToByteStreamLE(0, stream);
        } else {
            const membyte = new TextEncoder().encode(this.memo);
            Utils.uint32ToByteStreamLE(membyte.length, stream);
            stream.write(membyte);
        }

        // write dataSignature
        if (this.dataSignature == null) {
            Utils.uint32ToByteStreamLE(0, stream);
        } else {
            Utils.uint32ToByteStreamLE(this.dataSignature.length, stream);
            stream.write(this.dataSignature);
        }
    }

    // Helper mirroring Java's calcLength utility (used in some callers)
    protected static calcLength(buf: Uint8Array, offset: number): number {
        // Minimal implementation: attempt to decode sizes similar to Java
        let cursor = offset + 4; // skip version
        let varint = new VarInt(buf, cursor);
        let txInCount = Number(varint.value);
        cursor += varint.getOriginalSizeInBytes();
        for (let i = 0; i < txInCount; i++) {
            cursor += 36; // prevout length
            varint = new VarInt(buf, cursor);
            const scriptLen = Number(varint.value);
            cursor += scriptLen + 4 + varint.getOriginalSizeInBytes();
        }
        varint = new VarInt(buf, cursor);
        let txOutCount = Number(varint.value);
        cursor += varint.getOriginalSizeInBytes();
        for (let i = 0; i < txOutCount; i++) {
            cursor += 8;
            varint = new VarInt(buf, cursor);
            const scriptLen = Number(varint.value);
            cursor += scriptLen + varint.getOriginalSizeInBytes();
        }
        return cursor - offset + 4;
    }
    /**
     * A human readable version of the transaction useful for debugging. The format
     * is not guaranteed to be stable.
     */
    public toString(): string {
        let s: string[] = [];
        s.push("  " + (this.getHash ? this.getHash().toString() : "unknown") + '\n');
        // if (this.updatedAt != null)
        //     s.push(" updated: " + Utils.dateTimeFormat(this.updatedAt) + '\n');
        if (this.version !== 1)
            s.push("  version " + this.version + '\n');
        // If you have isTimeLocked() and isOptInFullRBF() methods, implement them accordingly.
        if ((this as any).isTimeLocked && (this as any).isTimeLocked()) {
            s.push("  time locked until ");
            if (this.lockTime < Transaction.LOCKTIME_THRESHOLD) {
                s.push("block " + this.lockTime);
            } else {
                s.push(Utils.dateTimeFormat(this.lockTime * 1000));
            }
            s.push('\n');
        }
        if ((this as any).isOptInFullRBF && (this as any).isOptInFullRBF()) {
            s.push("  opts into full replace-by-fee\n");
        }
        if (this.isCoinBase()) {
            let script: string;
            let script2: string;
            try {
                script = this.inputs.length === 0 ? "None" : this.inputs[0].getScriptSig().toString();
                script2 = this.outputs.length === 0 ? "None" : this.outputs[0].toString();
            } catch (e: any) {
                script = "???";
                script2 = "???";
            }
            s.push("     == COINBASE (scriptSig " + script + ")  (scriptPubKey " + script2 + ")\n");
            return s.join('');
        }
        if (this.inputs.length > 0) {
            for (const input of this.inputs) {
                s.push("     ");
                s.push("in   ");
                    try {
                    let scriptSigStr = "";
                    const ss = input.getScriptSig();
                    if (ss) scriptSigStr = ss.toString();
                    s.push((scriptSigStr && scriptSigStr.length > 0) ? scriptSigStr : "<no scriptSig>");
                    const inputValue = input.getValue ? input.getValue() : null;
                    if (inputValue != null)
                        s.push(" " + inputValue.toString());
                    s.push("\n          ");
                    s.push("outpoint:");
                    const outpoint = input.getOutpoint ? input.getOutpoint() : null;
                    s.push(outpoint ? outpoint.toString() : "null");
                    const connectedOutput = outpoint && outpoint.getConnectedOutput ? outpoint.getConnectedOutput() : null;
                    if (connectedOutput != null) {
                        const scriptPubKey = connectedOutput.getScriptPubKey ? connectedOutput.getScriptPubKey() : null;
                        if (scriptPubKey && (scriptPubKey.isSentToAddress && scriptPubKey.isSentToAddress() || scriptPubKey.isPayToScriptHash && scriptPubKey.isPayToScriptHash())) {
                            s.push(" hash160:");
                            s.push(Utils.HEX.encode(scriptPubKey.getPubKeyHash()));
                        }
                    }
                    if (input.hasSequence && input.hasSequence()) {
                        s.push("\n          sequence:" + (input.getSequenceNumber ? input.getSequenceNumber().toString(16) : "unknown"));
                        if (input.isOptInFullRBF && input.isOptInFullRBF())
                            s.push(", opts into full RBF");
                    }
                } catch (e: any) {
                    s.push("[exception: " + (e && e.message ? e.message : e) + "]");
                }
                s.push('\n');
            }
        } else {
            s.push("     ");
            // s.push("INCOMPLETE: No inputs!\n");
        }
        for (const out of this.outputs) {
            s.push("     ");
            s.push("out  ");
            try {
                let scriptPubKeyStr = out.getScriptPubKey ? out.getScriptPubKey().toString() : "";
                s.push((scriptPubKeyStr && scriptPubKeyStr.length > 0) ? scriptPubKeyStr : "<no scriptPubKey>");
                s.push("\n ");
                s.push(out.getValue().toString());
                if (!out.isAvailableForSpending()) {
                    s.push(" Spent");
                }
                const spentBy = out.getSpentBy ? out.getSpentBy() : null;
                if (spentBy != null) {
                    const pt = spentBy.getParentTransaction ? spentBy.getParentTransaction() : null;
                    if (pt && pt.getHash) {
                        const h = pt.getHash();
                        s.push(" by ");
                        s.push(h ? h.toString() : "unknown");
                    } else {
                        s.push(" by unknown");
                    }
                }
            } catch (e: any) {
                s.push("[exception: " + (e && e.message ? e.message : e) + "]");
            }
            s.push('\n');
        }
        if (this.memo != null)
            s.push("   memo " + this.memo + '\n');
        return s.join('');
    }
}
