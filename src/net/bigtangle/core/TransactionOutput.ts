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
import { Script } from '../script/Script';
import { ScriptBuilder } from '../script/ScriptBuilder';
import { NetworkParameters } from '../params/NetworkParameters';
import { ProtocolException } from '../exception/ProtocolException';
import { ScriptException } from '../exception/ScriptException';
import { Address } from './Address';
import { ECKey } from './ECKey';
import { Coin } from './Coin';
import { Sha256Hash } from './Sha256Hash';
import { Utils } from './Utils';
import { VarInt } from './VarInt';
import { TransactionInput } from './TransactionInput';
import { TransactionBag } from './TransactionBag';
import { Preconditions } from '../utils/Preconditions';
import { Buffer } from 'buffer';
import { Transaction } from './Transaction';
import { TransactionOutPoint } from './TransactionOutPoint';

const { checkArgument, checkNotNull, checkState } = Preconditions;

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
    // The output's value is kept as a native type in order to save class
    // instances.
    private value: Coin;

    // A transaction output has a script used for authenticating that the
    // redeemer is allowed to spend
    // this output.
    private scriptBytes: Uint8Array;

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


    public constructor(params: NetworkParameters, parent: Transaction | null, value: Coin, scriptBytes: Uint8Array) {
        super(params);
        // Negative values obviously make no sense, except for -1 which is used
        // as a sentinel value when calculating
        // SIGHASH_SINGLE signatures, so unfortunately we have to allow that
        // here.
        checkArgument(value.signum() >= 0 || value.equals(Coin.NEGATIVE_SATOSHI), "Negative values not allowed");
        // checkArgument(!params.hasMaxMoney() ||
        // value.compareTo(params.getMaxMoney()) <= 0, "Values larger than
        // MAX_MONEY not allowed");
        this.value = value;
        this.scriptBytes = scriptBytes;
        this.setParent(parent);
        this.availableForSpending = true;
        this.length = this.value.getTokenid().length + VarInt.sizeOf(this.value.getTokenid().length)
            + VarInt.sizeOf(scriptBytes.length) + scriptBytes.length
            + VarInt.sizeOf(this.value.getValue().toString().length) + this.value.getValue().toString().length;
    }

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
    public static fromTransactionOutput(params: NetworkParameters, parent: Transaction | null, payload: Uint8Array, offset: number,
        serializer: any): TransactionOutput {
        const a = new TransactionOutput(params, parent, Coin.ZERO, new Uint8Array(0));
        a.setValues5(params, payload, offset, serializer, TransactionOutput.UNKNOWN_LENGTH);
        a.setParent(parent);
        a.availableForSpending = true;
        return a;

    }

    /**
     * Creates an output that sends 'value' to the given address (public key
     * hash). The amount should be created with something like
     * {@link Coin#valueOf(int, int)}. Typically you would use
     * {@link Transaction#addOutput(Coin, Address)} instead of creating a
     * TransactionOutput directly.
     */
    public static fromAddress(params: NetworkParameters, parent: Transaction | null, value: Coin, to: Address): TransactionOutput {
        const script = ScriptBuilder.createOutputScript(to);
        return new TransactionOutput(params, parent, value, script.getProgram());
    }

    /**
     * Creates an output that sends 'value' to the given public key using a
     * simple CHECKSIG script (no addresses). The amount should be created with
     * something like {@link Coin#valueOf(int, int)}. Typically you would use
     * {@link Transaction#addOutput(Coin, ECKey)} instead of creating an output
     * directly.
     */
    public static fromCoinKey(params: NetworkParameters, parent: Transaction | null, value: Coin, to: ECKey): TransactionOutput {
        const script = ScriptBuilder.createOutputScript(to);
        return new TransactionOutput(params, parent, value, script.getProgram());
    }

    public getScriptPubKey(): Script {
        if (this.scriptPubKey === null) {
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
        if (this.getScriptPubKey().isSentToAddress())
            return this.getScriptPubKey().getToAddress(networkParameters);

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
        if (this.getScriptPubKey().isPayToScriptHash())
            return this.getScriptPubKey().getToAddress(networkParameters);

        return null;
    }

    protected parse(): void {
        if (!this.payload) throw new Error("Payload is null");
        
        if (!this.payload) throw new Error("Payload is null");
        
        // Read the value as a little-endian 8-byte signed integer
        let valueBytes = this.readBytes(8);
        // Pad with zeros if truncated
        if (valueBytes.length < 8) {
            const padded = new Uint8Array(8);
            padded.set(valueBytes);
            valueBytes = padded;
        }
        let valueBigInt = 0n;
        // Convert little-endian bytes to signed 64-bit integer
        for (let i = 0; i < 8; i++) {
            valueBigInt += BigInt(valueBytes[i]) << (BigInt(8) * BigInt(i));
        }
        
        // Handle two's complement for negative values
        if (valueBigInt >= 0x8000000000000000n) {
            valueBigInt = valueBigInt - 0x10000000000000000n;
        }
        
        // Read tokenid length
        this.tokenLen = this.readVarInt();
        let tokenid = new Uint8Array(0);
        if (this.tokenLen > 0) {
            // Check if we have enough bytes for tokenid
            if (this.cursor + this.tokenLen > this.payload.length) {
                throw new ProtocolException(`Not enough bytes for tokenid: need ${this.tokenLen}, have ${this.payload.length - this.cursor}`);
            }
            tokenid = this.readBytes(this.tokenLen);
        }
        
        // Create the Coin with the parsed value and tokenid
        this.value = Coin.valueOf(valueBigInt, Buffer.from(tokenid));

        // Read script length
        this.scriptLen = this.readVarInt();
        if (this.scriptLen > 0) {
            // Check if we have enough bytes for script
            if (this.cursor + this.scriptLen > this.payload.length) {
                throw new ProtocolException(`Not enough bytes for script: need ${this.scriptLen}, have ${this.payload.length - this.cursor}`);
            }
            this.scriptBytes = this.readBytes(this.scriptLen);
        } else {
            this.scriptBytes = new Uint8Array(0);
        }
        this.length = this.cursor - this.offset;
    }

    public bitcoinSerializeToStream(stream: any): void {
        checkNotNull(this.scriptBytes); 
        
       const  valuebytes= Utils.bigIntToBytes( this.value.getValue());
          stream.write(new VarInt(valuebytes.length).encode()); 
        stream.write(valuebytes);

        // Write the tokenid with length prefix
        const tokenid = this.value.getTokenid();
        stream.write(new VarInt(tokenid.length).encode());
        stream.write(tokenid);
        
        // Write the script with length prefix
        stream.write(new VarInt(this.scriptBytes.length).encode());
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
        checkNotNull(value);
        this.unCache();
        this.value = value;
    }

    /**
     * Gets the index of this output in the parent transaction, or throws if
     * this output is free standing. Iterates over the parents list to discover
     * this.
     */
    public getIndex(): number {
        const outputs = this.getParentTransaction().getOutputs();
        for (let i = 0; i < outputs.length; i++) {
            if (outputs[i] === this)
                return i;
        }
        throw new Error("Output linked to wrong parent transaction?");
    }


    /**
     * Sets this objects availableForSpending flag to false and the spentBy
     * pointer to the given input. If the input is null, it means this output
     * was signed over to somebody else rather than one of our own keys.
     *
     * @throws IllegalStateException
     *             if the transaction was already marked as spent.
     */
    public markAsSpent(input: TransactionInput): void {
        checkState(this.availableForSpending);
        this.availableForSpending = false;
        this.spentBy = input;
        if (this.parent !== null)
            console.debug(`Marked ${this.getParentTransactionHash()}:${this.getIndex()} as spent by ${input}`);
        else
            console.debug(`Marked floating output as spent by ${input}`);
    }

    /**
     * Resets the spent pointer / availableForSpending flag to null.
     */
    public markAsUnspent(): void {
        if (this.parent !== null)
            console.debug(`Un-marked ${this.getParentTransactionHash()}:${this.getIndex()} as spent by ${this.spentBy}`);
        else
            console.debug(`Un-marked floating output as spent by ${this.spentBy}`);
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
    public getScriptBytes(): Uint8Array {
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
            console.debug("Could not parse tx output script: " + e);
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
            console.debug("Could not parse tx " + (this.parent !== null ? this.parent.getHash() : "(no parent)") +
                " output script: " + e);
            return false;
        }
    }

    /**
     * Returns a human readable debug string.
     */
    public toString(): string {
        try {
            const script = this.getScriptPubKey();
            let buf = "TxOut of ";
            buf += this.value.toString();
            if (script.isSentToAddress() || script.isPayToScriptHash())
                buf += " to " + script.getToAddress(this.params!);
            else if (script.isSentToRawPubKey())
                buf += " to pubkey " + Utils.HEX.encode(script.getPubKey());
            else if (script.isSentToMultiSig())
                buf += " to multisig";
            else
                buf += " (unknown type)";
            buf += " script:" + script;
            return buf;
        } catch (e) {
            throw new Error("Script exception: " + e);
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
    public getParentTransaction(): Transaction {
        return this.parent as Transaction;
    }

    /**
     * Returns the transaction hash that owns this output.
     */
    public getParentTransactionHash(): Sha256Hash {
        return this.parent === null ? Sha256Hash.ZERO_HASH : this.parent.getHash();
    }

    /**
     * Returns a new {@link TransactionOutPoint}, which is essentially a
     * structure pointing to this output. Requires that this output is not
     * detached.
     */
    public getOutPointFor(containingBlockHash: Sha256Hash): TransactionOutPoint {
        return TransactionOutPoint.fromTx4(
            this.params!,
            this.getIndex(),
            containingBlockHash,
            this.getParentTransaction()
        );
    }

    /**
     * Returns a copy of the output detached from its containing transaction, if
     * need be.
     */
    public duplicateDetached(): TransactionOutput {
        // TODO: Implement Arrays.clone
        return new TransactionOutput(this.params!, null, this.value, this.scriptBytes);
    }

    public equals(o: any): boolean {
        if (this === o)
            return true;
        if (o === null || !(o instanceof TransactionOutput))
            return false;
        const other = o as TransactionOutput;
        return this.value === other.value && (this.parent === null || (this.parent === other.parent && this.getIndex() === other.getIndex()))
            && this.arraysEqual(this.scriptBytes, other.scriptBytes);
    }

    private arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    public hashCode(): number {
        let result = this.value.hashCode();
        result = 31 * result + (this.parent ? (this.parent as any).hashCode() : 0);
        for (let i = 0; i < this.scriptBytes.length; i++) {
            result = 31 * result + this.scriptBytes[i];
        }
        return result;
    }

    public getDescription(): string | null {
        return this.description;
    }

    public setDescription(description: string): void {
        this.description = description;
    }
}
