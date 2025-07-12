import { ChildMessage } from './ChildMessage';
import { Sha256Hash } from './Sha256Hash';
import { TransactionInput } from './TransactionInput';
import { TransactionOutput } from './TransactionOutput';
import { NetworkParameters } from '../params/NetworkParameters';
import { MessageSerializer } from './MessageSerializer';
import { Coin } from './Coin';
import { Buffer } from 'buffer';
import { VerificationException } from '../exception/VerificationException';
import { DataOutputStream } from '../utils/DataOutputStream'; // Ensure DataOutputStream is used
import { FreeStandingTransactionOutput } from '../wallet/FreeStandingTransactionOutput';

export enum SigHash {
    ALL = 1,
    NONE = 2,
    SINGLE = 3,
    ANYONECANPAY = 0x80,
    ANYONECANPAY_ALL = 0x81,
    ANYONECANPAY_NONE = 0x82,
    ANYONECANPAY_SINGLE = 0x83,
    UNSET = 0
}

export enum Purpose {
    UNKNOWN,
    USER_PAYMENT,
    KEY_ROTATION,
    ASSURANCE_CONTRACT_CLAIM,
    ASSURANCE_CONTRACT_PLEDGE,
    ASSURANCE_CONTRACT_STUB,
    RAISE_FEE
}

export class Transaction extends ChildMessage {
    // Make SigHash accessible as a static property
    static SigHash = SigHash;
    
    public static readonly UNCONNECTED = 0xFFFFFFFF;


    // Helper to read a Bitcoin-style varint
    private readVarIntFromBuffer(buffer: Buffer, offset: number): [number, number] {
        const first = buffer[offset];
        if (first < 0xfd) {
            return [first, 1];
        } else if (first === 0xfd) {
            return [buffer.readUInt16LE(offset + 1), 3];
        } else if (first === 0xfe) {
            return [buffer.readUInt32LE(offset + 1), 5];
        } else {
            // 0xff
            return [Number(buffer.readBigUInt64LE(offset + 1)), 9];
        }
    }
    public static readonly LOCKTIME_THRESHOLD = 500000000;
    public static readonly LOCKTIME_THRESHOLD_BIG = BigInt(500000000);
    // Placeholder values until NetworkParameters is implemented
    public static get REFERENCE_DEFAULT_MIN_TX_FEE(): Coin {
        return Coin.ZERO;
    }
    public static get MIN_NONDUST_OUTPUT(): Coin {
        return Coin.ZERO;
    }

    private version: number = 1;
    private inputs: TransactionInput[] = [];
    private outputs: TransactionOutput[] = [];
    private lockTime: number = 0;
    private hash: Sha256Hash | null = null;
    private appearsInHashes: Map<Sha256Hash, number> | null = null;
    private optimalEncodingMessageSize: number = 0;
    private purpose: Purpose = Purpose.UNKNOWN;
    private memo: string | null = null;
    private data: Buffer | null = null;
    private dataSignature: Buffer | null = null;
    private dataClassName: string | null = null;
    private toAddressInSubtangle: Buffer | null = null;

    public bitcoinSerialize(): Uint8Array {
        const stream = new DataOutputStream();
        this.bitcoinSerializeToStream(stream);
        return stream.toByteArray();
    }
    
    public getMessageSize(): number {
        return this.length;
    }
    
    private cached: boolean = false;

    public isCached(): boolean {
        return this.cached;
    }

    public unCache(): void {
        this.hash = null;
        this.cached = false;
    }

    public adjustLength(adjustment: number): void;
    public adjustLength(newArraySize: number, adjustment: number): void;
    public adjustLength(arg1: number, arg2?: number): void {
        // Placeholder implementation
        // Length adjustment logic would go here
        // If called with one argument, treat as (adjustment)
        // If called with two arguments, treat as (newArraySize, adjustment)
    }

    public length: number = 0;  // Add length property
    
    public constructor(params: NetworkParameters, payload?: Buffer, offset: number = 0, serializer?: MessageSerializer) {
        super(params, payload, offset, serializer);
        this.inputs = [];
        this.outputs = [];
        this.length = 8;
    }
    
    public setPayloadAndOffset(payload: Buffer, offset: number = 0): void {
        this.payload = payload;
        this.offset = offset;
    }

    public parse(): void {
        if (!this.payload) {
            throw new Error('No payload to parse');
        }
        this.cached = true;
        let offset = this.offset;
        // Version (4 bytes, little endian)
        this.version = this.payload.readInt32LE(offset);
        offset += 4;

        // Input count (varint)
        const [inputCount, inputCountSize] = this.readVarIntFromBuffer(this.payload, offset);
        offset += inputCountSize;
        this.inputs = [];
        for (let i = 0; i < inputCount; i++) {
            const [input, size] = TransactionInput.parseFromBuffer(this.params, this.payload, offset);
            this.inputs.push(input);
            offset += size;
        }

        // Output count (varint)
        const [outputCount, outputCountSize] = this.readVarIntFromBuffer(this.payload, offset);
        offset += outputCountSize;
        this.outputs = [];
        for (let i = 0; i < outputCount; i++) {
            const [output, size] = TransactionOutput.parseFromBuffer(this.params, this.payload, offset);
            this.outputs.push(output);
            offset += size;
        }

        // LockTime (4 bytes, little endian)
        this.lockTime = this.payload.readUInt32LE(offset);
        offset += 4;

        this.length = offset - this.offset;
    }

    public getHash(): Sha256Hash {
        // Use static method to create a dummy hash
        return Sha256Hash.wrap(Buffer.alloc(32));
    }

    setHash(hash: Sha256Hash): void {
        this.hash = hash;
    }

    // Simplified placeholder implementations
    isCoinBase(): boolean {
        return false;
    }

    public bitcoinSerializeToStream(stream: DataOutputStream): void {
        stream.writeInt(this.version);

        stream.write(this.writeVarInt(this.inputs.length));
        for (const input of this.inputs) {
            input.bitcoinSerializeToStream(stream);
        }

        stream.write(this.writeVarInt(this.outputs.length));
        for (const output of this.outputs) {
            output.bitcoinSerializeToStream(stream);
        }

        stream.writeUInt32LE(this.lockTime); // Assuming writeUInt32LE is available or needs to be added to DataOutputStream
    }

    private writeVarInt(value: number): Buffer {
        if (value < 0xfd) {
            return Buffer.from([value]);
        } else if (value <= 0xffff) {
            const buf = Buffer.alloc(3);
            buf[0] = 0xfd;
            buf.writeUInt16LE(value, 1);
            return buf;
        } else if (value <= 0xffffffff) {
            const buf = Buffer.alloc(5);
            buf[0] = 0xfe;
            buf.writeUInt32LE(value, 1);
            return buf;
        } else {
            const buf = Buffer.alloc(9);
            buf[0] = 0xff;
            buf.writeBigUInt64LE(BigInt(value), 1);
            return buf;
        }
    }

    getLockTime(): number {
        return this.lockTime;
    }

    setLockTime(lockTime: number): void {
        this.unCache();
        this.lockTime = lockTime;
    }

    getVersion(): number {
        return this.version;
    }

    setVersion(version: number): void {
        this.version = version;
        this.unCache();
    }

    getInput(index: number): TransactionInput {
        return this.inputs[index];
    }

    getInputs(): TransactionInput[] {
        return [...this.inputs];
    }

    getOutput(index: number): TransactionOutput {
        return this.outputs[index];
    }

    getOutputs(): TransactionOutput[] {
        return [...this.outputs];
    }

    // Simplified placeholder implementations

    getPurpose(): Purpose {
        return this.purpose;
    }

    setPurpose(purpose: Purpose): void {
        this.purpose = purpose;
        this.unCache();
    }

    getMemo(): string | null {
        return this.memo;
    }

    setMemo(memo: string | null): void {
        this.memo = memo;
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

    public toString(): string {
        return `Transaction: ${this.getHash().toString()}`;
    }

    getToAddressInSubtangle(): Buffer | null {
        return this.toAddressInSubtangle;
    }

    setToAddressInSubtangle(toAddressInSubtangle: Buffer | null): void {
        this.toAddressInSubtangle = toAddressInSubtangle;
        this.unCache();
    }

    addInput(input: TransactionInput): void {
        input.setParent(this as any);
        this.inputs.push(input);
        this.length += input.getMessageSize ? input.getMessageSize() : 0;
        this.unCache();
    }

    public addOutput(output: TransactionOutput): void {
        this.outputs.push(output);
        this.length += output.getMessageSize ? output.getMessageSize() : 0;
        this.unCache();
    }

    /**
     * Adds a coinbase input and output to this transaction.
     * @param pubKeyTo The public key buffer to pay to.
     * @param value The coinbase value.
     * @param tokenInfo Optional token info for token blocks.
     * @param memoInfo Optional memo info.
     */
    public addCoinbaseTransaction(pubKeyTo: Buffer, value: Coin, tokenInfo?: any, memoInfo?: any): void {
        // Set memo if provided
        if (memoInfo) {
            this.setMemo(memoInfo.toString());
        }
        // Set token data if provided
        if (tokenInfo) {
            this.setDataClassName('TOKEN');
            if (typeof tokenInfo.toByteArray === 'function') {
                this.setData(Buffer.from(tokenInfo.toByteArray()));
            }
        }
        // Build coinbase input
        const inputBuilder = new (require('./ScriptBuilder').ScriptBuilder)();
        inputBuilder.data(Buffer.from([0, 0])); // Placeholder coinbase script
        this.addInput(new (require('./TransactionInput').TransactionInput)(this.params, this, Buffer.from(inputBuilder.build().getProgram())));
        // Build coinbase output
        const scriptPubKey = require('./ScriptBuilder').ScriptBuilder.createOutputScript(require('./ECKey').ECKey.fromPublic(pubKeyTo));
        this.addOutput(new (require('./TransactionOutput').TransactionOutput)(this.params, this, value, Buffer.from(scriptPubKey.getProgram())));
    }

    public getSigOpCount(): number {
        // TODO: Implement actual sigops counting logic based on scripts
        return 0;
    }

    public verify(): void {
        // Memo size check (uncomment if you want to enforce)
        // if (this.getMemo() && this.getMemo()!.length > NetworkParameters.MAX_TRANSACTION_MEMO_SIZE) {
        //     throw new VerificationException(`memo size too large MAX ${NetworkParameters.MAX_TRANSACTION_MEMO_SIZE}`);
        // }
        // Data class name and signature size checks (uncomment if you want to enforce)
        // if (this.getDataClassName() && this.getDataClassName()!.length > NetworkParameters.MAX_TRANSACTION_MEMO_SIZE) {
        //     throw new VerificationException(`getDataClassName size too large MAX ${NetworkParameters.MAX_TRANSACTION_MEMO_SIZE}`);
        // }
        // if (this.getDataSignature() && this.getDataSignature()!.length > NetworkParameters.MAX_TRANSACTION_MEMO_SIZE) {
        //     throw new VerificationException(`getDataSignature size too large MAX ${NetworkParameters.MAX_TRANSACTION_MEMO_SIZE}`);
        // }

        // Check for duplicate outpoints
        const outpoints = new Set<string>();
        for (const input of this.inputs) {
            const outpointStr = input.getOutpoint().toString();
            if (outpoints.has(outpointStr)) {
                throw new VerificationException.DuplicatedOutPoint();
            }
            outpoints.add(outpointStr);
        }

        // Check for negative output values
        try {
            for (const output of this.outputs) {
                if (output.getValue().signum() < 0) {
                    throw new VerificationException.NegativeValueOutput();
                }
            }
        } catch (e: any) {
            throw new VerificationException.ExcessiveValue();
        }

        // Coinbase checks
        if (this.isCoinBase()) {
            const firstInput = this.inputs[0];
            const scriptLen = firstInput.getScriptBytes().length;
            if (scriptLen < 2 || scriptLen > 100) {
                throw new VerificationException.CoinbaseScriptSizeOutOfRange();
            }
        } else {
            for (const input of this.inputs) {
                if (input.isCoinBase()) {
                    throw new VerificationException.UnexpectedCoinbaseInput();
                }
            }
        }
    }

 /**
     * Computes the hash for signature for the given input index, script, and sighash flags.
     * This is a stub implementation; you should replace it with your actual logic.
     */
    hashForSignature(index: number, script: Uint8Array, sighashFlags: number): Sha256Hash {
        // TODO: Implement actual signature hash logic according to your transaction format
        // For now, return a dummy hash for compilation
        return Sha256Hash.hash(Buffer.from(script));
    }
}
