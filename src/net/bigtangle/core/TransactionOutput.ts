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
    private value!: Coin;
    private scriptBytes!: Buffer;
    private scriptPubKey: Script | null = null;
    private availableForSpending: boolean = true;
    private spentBy: TransactionInput | null = null;
    private scriptLen: number = 0;
    private tokenLen: number = 0;
    private description: string | null = null;
    private readonly index: number = 0;
 

    /**
     * Creates an output that sends 'value' to the given address (public key hash).
     * The amount should be created with something like Coin.valueOf(int, int).
     * Typically you would use Transaction#addOutput(Coin, Address) instead of creating a TransactionOutput directly.
     */
    static fromAddress(params: NetworkParameters, parent: Transaction | null, value: Coin, to: Address): TransactionOutput {
        return new TransactionOutput(params, parent, value, Buffer.from(ScriptBuilder.createOutputScript(to).getProgram()), 0);
    }

    /**
     * Creates an output that sends 'value' to the given public key using a simple CHECKSIG script (no addresses).
     * The amount should be created with something like Coin.valueOf(int, int).
     * Typically you would use Transaction#addOutput(Coin, ECKey) instead of creating an output directly.
     */
    static fromECKey(params: NetworkParameters, parent: Transaction | null, value: Coin, to: ECKey): TransactionOutput {
        return new TransactionOutput(params, parent, value, Buffer.from(ScriptBuilder.createOutputScript(to).getProgram()), 0);
    }

    
    // TypeScript constructor
    constructor(params: NetworkParameters, parent: Transaction | null, value: Coin, scriptBytes: Buffer, index: number = 0) {
        super(params);
        if (value.signum() < 0 && !value.equals(Coin.NEGATIVE_SATOSHI)) {
            throw new Error("Negative values not allowed");
        }
        this.value = value;
        this.scriptBytes = scriptBytes;
        this.setParent(parent as any);
        this.availableForSpending = true;
        this.index = index;
        this.length = this.value.getTokenid().length + VarInt.sizeOf(this.value.getTokenid().length)
            + VarInt.sizeOf(scriptBytes.length) + scriptBytes.length
            + VarInt.sizeOf(TransactionOutput.bigintToBuffer(this.value.getValue(), 32).length) + TransactionOutput.bigintToBuffer(this.value.getValue(), 32).length;
    }

    /**
     * Constructs a TransactionOutput from the given parameters.
     * @param params Network parameters
     * @param parent The parent transaction, if any
     * @param payload The raw payload bytes
     * @param offset The offset into the payload where this message starts
     * @throws ProtocolException if there's a parsing issue
     */
    static fromPayload(params: NetworkParameters, parent: Transaction | null, payload: Buffer, offset: number): TransactionOutput {
        console.log(`Parsing TransactionOutput at offset ${offset}`);
        const output = new TransactionOutput(params, parent, Coin.ZERO, Buffer.alloc(0));
        output.payload = payload;
        output.offset = offset;
        output.cursor = offset;
        output.parse();
        console.log(`Parsed TransactionOutput length: ${output.length}`);
        return output;
    }



    private calculateLength(): number {
        // This calculation needs to be accurate based on the Bitcoin serialization format
        // For now, a simplified version
        return (this.value ? this.value.getTokenid().length + VarInt.sizeOf(this.value.getTokenid().length) : 0) +
               (this.value ? VarInt.sizeOf(TransactionOutput.bigintToBuffer(this.value.getValue(), 32).length) + TransactionOutput.bigintToBuffer(this.value.getValue(), 32).length : 0) +
               VarInt.sizeOf(this.scriptBytes.length) + this.scriptBytes.length;
    }

    public getScriptPubKey(): Script {
        this.scriptPubKey ??= new Script(this.scriptBytes);
        return this.scriptPubKey;
    }

    public getAddressFromP2PKHScript(networkParameters: NetworkParameters): Address | null {
        if (this.getScriptPubKey().isSentToAddress()) {
            return this.getScriptPubKey().getToAddress(networkParameters);
        }
        return null;
    }

    public getAddressFromP2SH(networkParameters: NetworkParameters): Address | null {
        if (this.getScriptPubKey().isPayToScriptHash()) {
            return this.getScriptPubKey().getToAddress(networkParameters);
        }
        return null;
    }

    protected parse(): void {
        const vlen = Number(this.readVarInt());
        const v = this.readBytes(vlen);
        this.tokenLen = Number(this.readVarInt());
        this.value = new Coin(BigInt('0x' + Utils.HEX.encode(v)), this.readBytes(this.tokenLen));
        
        this.scriptLen = Number(this.readVarInt());
        this.scriptBytes = this.readBytes(this.scriptLen);
        this.length = this.cursor - this.offset;
    }

    public bitcoinSerializeToStream(stream: any): void {
        if (!this.scriptBytes) throw new Error("scriptBytes is null");
        if (!this.value) throw new Error("value is null");

        const valuebytes = TransactionOutput.bigintToBuffer(this.value.getValue(), 32);
        const valueBytesVarInt = new VarInt(valuebytes.length);
        const valueBytesVarIntBuffer = valueBytesVarInt.encode();
        stream.write(valueBytesVarIntBuffer);
        stream.write(valuebytes);

        const tokenIdVarInt = new VarInt(this.value.getTokenid().length);
        const tokenIdVarIntBuffer = tokenIdVarInt.encode();
        stream.write(tokenIdVarIntBuffer);
        stream.write(this.value.getTokenid());
        
        const scriptBytesVarInt = new VarInt(this.scriptBytes.length);
        const scriptBytesVarIntBuffer = scriptBytesVarInt.encode();
        stream.write(scriptBytesVarIntBuffer);
        stream.write(this.scriptBytes);
    }

    public getValue(): Coin {
        if (!this.value) throw new Error("Value is null");
        return this.value;
    }

    public setValue(value: Coin): void {
        this.value = value;
        this.unCache();
    }

    public getIndex(): number {
        // Assuming this.index exists or is derived from outpoint/index logic
        return this.index ?? 0; // Default to 0 if not set
    }

    public markAsSpent(input: TransactionInput): void {
        if (!this.availableForSpending) throw new Error("Transaction already marked as spent.");
        this.availableForSpending = false;
        this.spentBy = input;
    }

    public markAsUnspent(): void {
        this.availableForSpending = true;
        this.spentBy = null;
    }

    public isAvailableForSpending(): boolean {
        return this.availableForSpending;
    }

    public getScriptBytes(): Buffer {
        return this.scriptBytes;
    }

    
 
 
    public toString(): string {
        try {
            const script = this.getScriptPubKey();
            let buf = `TxOut of ${this.value.toString()}`;
            if (script.isSentToAddress() || script.isPayToScriptHash()) {
                buf += ` to ${script.getToAddress(this.params)}`;
            } else if (script.isSentToRawPubKey()) {
                buf += ` to pubkey ${Utils.HEX.encode(script.getPubKey())}`;
            } else if (script.isSentToMultiSig()) {
                buf += ` to multisig`;
            } else {
                buf += ` (unknown type)`;
            }
            buf += ` script:${script}`;
            return buf;
        } catch (e: any) {
            throw new Error(e);
        }
    }

    public getSpentBy(): TransactionInput | null {
        return this.spentBy;
    }

    public getParentTransaction(): Transaction | null {
        return this.parent as unknown as Transaction;
    }

    public getParentTransactionHash(): Sha256Hash | null {
        return this.parent === null ? null : this.parent.getHash();
    }

    public getOutPointFor(containingBlockHash: Sha256Hash): TransactionOutPoint {
        return new TransactionOutPoint(this.params, this.getIndex(), containingBlockHash, this.getParentTransaction());
    }

    public duplicateDetached(): TransactionOutput {
        return new TransactionOutput(this.params, null, this.value, Buffer.from(this.scriptBytes));
    }

    public equals(o: any): boolean {
        if (this === o) return true;
        if (o === null || !(o instanceof TransactionOutput)) return false;
        const other = o as TransactionOutput;
        return this.value.equals(other.value) &&
               (this.parent === null || (this.parent === other.parent && this.getIndex() === other.getIndex())) &&
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

    public getDescription(): string | null {
        return this.description;
    }

    public setDescription(description: string | null): void {
        this.description = description;
    }

    // Utility function to convert bigint to Buffer
    private static bigintToBuffer(value: bigint, length: number): Buffer {
        let hex = value.toString(16);
        if (hex.length % 2) hex = '0' + hex;
        const buf = Buffer.from(hex, 'hex');
        if (buf.length < length) {
            const pad = Buffer.alloc(length - buf.length, 0);
            return Buffer.concat([pad, buf]);
        }
        return buf;
    }

    // Add this static method to parse a TransactionOutput from a buffer
    static parseFromBuffer(params: NetworkParameters, buffer: Buffer, offset: number): [TransactionOutput, number] {
        const output = new TransactionOutput(params, null, Coin.ZERO, Buffer.alloc(0)); // Initial dummy values
        output.payload = buffer;
        output.offset = offset;
        output.cursor = offset;
        output.parse();
        const size = output.getMessageSize();
        return [output, size];
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
        } catch (e: any) {
            // Just means we didn't understand the output of this transaction:
            // ignore it.
            console.debug("Could not parse tx output script: " + e.toString());
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
        } catch (e: any) {
            // Just means we didn't understand the output of this transaction:
            // ignore it.
            console.debug("Could not parse tx " + (this.parent ? this.parent.getHash() : "(no parent)") + " output script: " + e.toString());
            return false;
        }
    }
}
