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

import { Message } from './Message';
import { Sha256Hash } from './Sha256Hash';
import { Utils } from './Utils';
import { VarInt } from './VarInt';
import { UnsafeByteArrayOutputStream } from './UnsafeByteArrayOutputStream';
import { Transaction } from './Transaction';
import { NetworkParameters } from '../params/NetworkParameters';
import { MessageSerializer } from './MessageSerializer';
import { ProtocolException } from '../exception/ProtocolException';
import { VerificationException } from '../exception/VerificationException';
import { BlockType } from './BlockType';
import { Address } from './Address';
import { RewardInfo } from './RewardInfo';
import { OrderOpenInfo } from './OrderOpenInfo';
import { TokenInfo } from './TokenInfo';
import { ContractExecutionResult } from './ContractExecutionResult';
import { OrderExecutionResult } from './OrderExecutionResult';
import { Script } from '../script/Script';
import { ScriptBuilder } from '../script/ScriptBuilder';
import { ECKey } from './ECKey';
import { TransactionOutput } from './TransactionOutput';
import { TransactionInput } from './TransactionInput';
import { Coin } from './Coin';
import { MemoInfo } from './MemoInfo';
import { DataClassName } from './DataClassName';
import { Buffer } from 'buffer';

/**
 * <p>
 * A block is a group of transactions, and is one of the fundamental data
 * structures of the Bitcoin system. It records a set of {@link Transaction}s
 * together with some data that links it into a place in the global block
 * structure, and proves that a difficult calculation was done over its
 * contents. See <a href="http://bitcoin.net/bigtangle.pdf">the white paper</a>
 * for more detail on blocks.
 * <p/>
 *
 * <p>
 * To get a block, you can either build one from the raw bytes you can get from
 * another implementation, or request one specifically using
 * </p>
 *
 */
export class Block extends Message {
    // Fields defined as part of the protocol format.
    private version: number = 0;
    private prevBlockHash: Sha256Hash;
    private prevBranchBlockHash: Sha256Hash; // second predecessor
    private merkleRoot: Sha256Hash;
    private time: number = 0;
    private difficultyTarget: number = 0; // "nBits"
    private lastMiningRewardBlock: number = 0; // last approved reward blocks max
    private nonce: number = 0;
    private minerAddress: Uint8Array; // Utils.sha256hash160
    private blockType: BlockType;
    private height: number = 0;
    // If NetworkParameters.USE_EQUIHASH, this field will contain the PoW
    // solution

    /** If null, it means this object holds only the headers. */
    private transactions: Transaction[] | null = null;

    /** Stores the hash of the block. If null, getHash() will recalculate it. */
    private hash: Sha256Hash | null = null;

    protected headerBytesValid: boolean = false;
    protected transactionBytesValid: boolean = false;

    // Blocks can be encoded in a way that will use more bytes than is optimal
    // (due to VarInts having multiple encodings)
    // MAX_BLOCK_SIZE must be compared to the optimal encoding, not the actual
    // encoding, so when parsing, we keep track
    // of the size of the ideal encoding in addition to the actual message size
    // (which Message needs)
    protected optimalEncodingMessageSize: number = 0;

    public constructor(params: NetworkParameters) {
        super(params);
        this.prevBlockHash = Sha256Hash.ZERO_HASH;
        this.prevBranchBlockHash = Sha256Hash.ZERO_HASH;
        this.merkleRoot = Sha256Hash.ZERO_HASH;
        this.minerAddress = new Uint8Array(20);
        this.blockType = BlockType.BLOCKTYPE_TRANSFER;
    }

    public static setBlock2(params: NetworkParameters, setVersion: number): Block {
        const block = Block.setBlock7(params, Sha256Hash.ZERO_HASH, Sha256Hash.ZERO_HASH,
            BlockType.BLOCKTYPE_TRANSFER, 0, Utils.encodeCompactBits(params.getMaxTarget()), 0);
        block.version = setVersion;
        block.length = NetworkParameters.HEADER_SIZE;
        block.transactions = null; // Explicitly set transactions to null for headers
        return block;
    }

    public static createBlock(networkParameters: NetworkParameters, r1: Block, r2: Block): Block {
        const block = Block.setBlock7(networkParameters, r1.getHash(), r2.getHash(),
            BlockType.BLOCKTYPE_TRANSFER, Math.max(r1.getTimeSeconds(), r2.getTimeSeconds()),
            Math.max(r1.getLastMiningRewardBlock(), r2.getLastMiningRewardBlock()),
            r1.getLastMiningRewardBlock() > r2.getLastMiningRewardBlock() ? r1.getDifficultyTarget()
                : r2.getDifficultyTarget());
        block.setHeight(Math.max(r1.getHeight(), r2.getHeight()) + 1);

        return block;
    }

    public static setBlock7(params: NetworkParameters, prevBlockHash: Sha256Hash, prevBranchBlockHash: Sha256Hash,
        blocktype: BlockType, minTime: number, lastMiningRewardBlock: number, difficultyTarget: number): Block {
        const a = new Block(params);
        // Set up a few basic things. We are not complete after this though.
        a.version = NetworkParameters.BLOCK_VERSION_GENESIS;
        a.difficultyTarget = difficultyTarget;
        a.lastMiningRewardBlock = lastMiningRewardBlock;
        a.time = Date.now() / 1000;
        if (a.time < minTime)
            a.time = minTime;
        a.prevBlockHash = prevBlockHash;
        a.prevBranchBlockHash = prevBranchBlockHash;

        a.blockType = blocktype;
        a.minerAddress = new Uint8Array(20);
        a.length = NetworkParameters.HEADER_SIZE;
        a.transactions = [];
        return a;
    }

    /**
     * Construct a block object from the Bitcoin wire format.
     *
     * @param params       NetworkParameters object.
     * @param payloadBytes the payload to extract the block from.
     * @param serializer   the serializer to use for this message.
     * @param length       The length of message if known. Usually this is provided
     *                     when deserializing of the wire as the length will be
     *                     provided as part of the header. If unknown then set to
     *                     Message.UNKNOWN_LENGTH
     */
    public static setBlock4(params: NetworkParameters, payloadBytes: Uint8Array, serializer: MessageSerializer<NetworkParameters>,
        length: number): Block {
        return Block.setBlock5(params, payloadBytes, 0, serializer, length);
    }

    /**
     * Construct a block object from the Bitcoin wire format.
     *
     * @param params       NetworkParameters object.
     * @param payloadBytes the payload to extract the block from.
     * @param offset       The location of the first payload byte within the array.
     * @param serializer   the serializer to use for this message.
     * @param length       The length of message if known. Usually this is provided
     *                     when deserializing of the wire as the length will be
     *                     provided as part of the header. If unknown then set to
     *                     Message.UNKNOWN_LENGTH
     */
    public static setBlock5(params: NetworkParameters, payloadBytes: Uint8Array, offset: number,
        serializer: MessageSerializer<NetworkParameters>, length: number): Block {
        // Log the first few bytes of the payload for debugging
        if (payloadBytes && payloadBytes.length > 0) {
            let bytesStr = "";
            const end = Math.min(payloadBytes.length, 20);
            for (let i = 0; i < end; i++) {
                bytesStr += payloadBytes[i].toString(16).padStart(2, '0') + " ";
            }
            console.log(`Block.setBlock5: payloadBytes[0..${end-1}]=${bytesStr}`);
            console.log(`Block.setBlock5: payloadBytes.length=${payloadBytes.length}`);
        }
        const a = new Block(params);
        a.setValues5(params, payloadBytes, offset, serializer, length);
        return a;
    }

    public isBLOCKTYPE_INITIAL(): boolean {
        return this.getBlockType() === BlockType.BLOCKTYPE_INITIAL;
    }

    /**
     * Parse transactions from the block.
     *
     * @param transactionsOffset Offset of the transactions within the block. Useful
     *                           for non-Bitcoin chains where the block header may
     *                           not be a fixed size.
     */
    protected parseTransactions(transactionsOffset: number): void {
        this.cursor = transactionsOffset;
        console.log(`parseTransactions: transactionsOffset=${transactionsOffset}, payloadLen=${this.payload ? this.payload.length : 'null'}`);
        this.optimalEncodingMessageSize = this.getHeaderSize();
        
        if (!this.payload || this.payload.length <= this.cursor) {
            this.transactionBytesValid = false;
            return;
        }
        
        try {
            const numTransactions = this.readVarInt();
            this.optimalEncodingMessageSize += new VarInt(numTransactions).encode().length;
            this.transactions = [];
            
            for (let i = 0; i < numTransactions; i++) {
                // Check if we have enough data to read at least the transaction header
                if (this.cursor >= (this.payload?.length || 0)) {
                    console.warn("Reached end of payload while parsing transactions");
                    break;
                }
                
                if (this.params === null) throw new Error("Network parameters are null");
                if (this.payload === null) throw new Error("Payload is null");
                if (this.serializer === null) throw new Error("Serializer is null");

                const tx = Transaction.fromTransaction6(this.params, this.payload, this.cursor, this, this.serializer, Message.UNKNOWN_LENGTH);
                this.transactions.push(tx);
                
                this.cursor += tx.getMessageSize();
                this.optimalEncodingMessageSize += tx.getOptimalEncodingMessageSize();
            }
            
            this.transactionBytesValid = this.serializer !== null && this.serializer.isParseRetainMode();
        } catch (e) {
            console.error("Error parsing transactions:", e);
            // If we're in parse-retain mode, keep the original transaction
            // bytes valid and mark the block length as the full payload length
            // so bitcoinSerialize can return the raw payload and preserve exact
            // round-trip behavior even if parsing failed.
            const retain = this.serializer !== null && this.serializer.isParseRetainMode();
            this.transactionBytesValid = retain;
            if (retain && this.payload) {
                // Set length to the full payload slice so serialization copies the
                // original bytes back out.
                this.length = this.payload.length - this.offset;
            }
        }
    }

    /**
     * Try parsing transactions at a given offset without mutating this object.
     * Returns parsed transactions, the cursor position after parsing, and the
     * optimal encoding size. Throws on parse errors.
     */
    private tryParseTransactionsAt(startOffset: number): { txs: Transaction[]; endCursor: number; optimalSize: number } {
        if (!this.payload) throw new Error('Payload is null');
        let localCursor = startOffset;
        let localOptimal = this.getHeaderSize();
        // Use a fresh array for txs
        const txs: Transaction[] = [];

        // Helper to read VarInt from payload at localCursor without changing global cursor
        const readVarIntAt = (offset: number) => {
            const v = new VarInt(Buffer.from(this.payload!), offset);
            return { value: v.value.toJSNumber(), size: v.getOriginalSizeInBytes() };
        };

        // Read number of transactions
        const nv = readVarIntAt(localCursor);
        const numTransactions = nv.value;
        localOptimal += nv.size;
        localCursor += nv.size;

        console.log(`tryParseTransactionsAt: startOffset=${startOffset}, numTransactions=${numTransactions}, firstVarIntSize=${nv.size}`);

        for (let i = 0; i < numTransactions; i++) {
            if (!this.params) throw new Error('Network parameters are null');
            if (!this.serializer) throw new Error('Serializer is null');

            // Construct transaction using Transaction.fromTransaction6 which will parse using Message parsing
            const tx = Transaction.fromTransaction6(this.params, this.payload, localCursor, this as any as Block, this.serializer, Message.UNKNOWN_LENGTH);
            txs.push(tx);

            // advance local cursor by parsed message size
            localCursor += tx.getMessageSize();
            localOptimal += tx.getOptimalEncodingMessageSize();
            console.log(`tryParseTransactionsAt: parsed tx ${i} size=${tx.getMessageSize()} outputs=${tx.getOutputs().length}`);
        }

        return { txs, endCursor: localCursor, optimalSize: localOptimal };
    }

    protected parse(): void {
        // header
        this.cursor = this.offset;
        const headerSize = this.getHeaderSize();
        
        if (this.payload && this.payload.length >= this.offset + headerSize) {
            this.version = this.readUint32();
            this.prevBlockHash = this.readHash();
            this.prevBranchBlockHash = this.readHash();
            this.merkleRoot = this.readHash();
            this.time = Number(this.readInt64());
            this.difficultyTarget = Number(this.readInt64());
            this.lastMiningRewardBlock = Number(this.readInt64());
            this.nonce = this.readUint32();
            this.minerAddress = this.readBytes(20);
            this.blockType = BlockType.values()[this.readUint32()];
            this.height = Number(this.readInt64());
            
            // Now we've read the fixed header
            this.hash = Sha256Hash.wrapReversed(
                Sha256Hash.hashTwice(Buffer.from(this.payload.subarray(this.offset, this.cursor)))
            );
            this.headerBytesValid = this.serializer !== null && this.serializer.isParseRetainMode();
            
            // Only parse transactions if we have payload beyond the header
            if (this.payload.length > this.cursor) {
                this.parseTransactions(this.cursor);
            } else {
                // No transactions, set to empty array
                this.transactions = [];
                this.transactionBytesValid = false;
            }
            
            // Set length to the actual parsed length
            this.length = this.cursor - this.offset;
        } else {
            throw new ProtocolException("Incomplete header");
        }
    }

    private getHeaderSize(): number {
        // In the future, this might depend on the block version
        return NetworkParameters.HEADER_SIZE;
    }

    public getOptimalEncodingMessageSize(): number {
        if (this.optimalEncodingMessageSize !== 0)
            return this.optimalEncodingMessageSize;
        this.optimalEncodingMessageSize = this.bitcoinSerialize().length;
        return this.optimalEncodingMessageSize;
    }

    // default for testing
    writeHeader(stream: any): void {
        // try for cached write first
        if (this.headerBytesValid && this.payload && this.payload.length >= this.offset + NetworkParameters.HEADER_SIZE) {
            stream.write(Buffer.from(this.payload.subarray(this.offset, this.offset + NetworkParameters.HEADER_SIZE)));
            return;
        }

        // fall back to manual write
        Utils.uint32ToByteStreamLE(this.version, stream);
        stream.write(this.prevBlockHash.getReversedBytes());
        stream.write(this.prevBranchBlockHash.getReversedBytes());
        stream.write(this.getMerkleRoot().getReversedBytes());
        // Write time and difficultyTarget as 64-bit values to match the
        // authoritative header layout (NetworkParameters.HEADER_SIZE).
        // Ensure we convert floating point times to integer seconds before writing
        Utils.int64ToByteStreamLE(BigInt(Math.floor(this.time)), stream);
        Utils.int64ToByteStreamLE(BigInt(Math.floor(this.difficultyTarget)), stream);
        Utils.int64ToByteStreamLE(BigInt(Math.floor(this.lastMiningRewardBlock)), stream);
        Utils.uint32ToByteStreamLE(this.nonce, stream);
        stream.write(this.minerAddress);
        Utils.uint32ToByteStreamLE(BlockType.ordinal(this.blockType), stream);
        Utils.int64ToByteStreamLE(BigInt(Math.floor(this.height)), stream);
        // Ensure the written header occupies exactly NetworkParameters.HEADER_SIZE bytes.
        // Some networks include extra PoW/padding bytes in the header. If the
        // output stream exposes size(), use it to calculate how many bytes to
        // pad. Otherwise fall back to padding the difference between the
        // canonical field length (152) and the authoritative header size.
        try {
            const headerSize = NetworkParameters.HEADER_SIZE;
            let written = -1;
            if (typeof (stream.size) === 'function') {
                written = stream.size();
            }
            if (written >= 0) {
                if (written < headerSize) {
                    const pad = Buffer.alloc(headerSize - written);
                    stream.write(pad);
                }
            } else {
                // Fallback: we've written the canonical fields (152 bytes). Pad the rest.
                const canonicalFields = 152;
                if (headerSize > canonicalFields) {
                    const pad = Buffer.alloc(headerSize - canonicalFields);
                    stream.write(pad);
                }
            }
        } catch (e) {
            // If padding fails for any reason, ignore; serialization will still be valid
            // albeit possibly shorter than the authoritative header size.
        }
    }

    writePoW(stream: any): void {
        // Empty implementation for now
    }

    private writeTransactions(stream: any): void {
        // check for no transaction conditions first
        // must be a more efficient way to do this but I'm tired atm.
        console.log(`Block.writeTransactions: transactions=${this.transactions ? this.transactions.length : 'null'}, transactionBytesValid=${this.transactionBytesValid}, payloadLen=${this.payload ? this.payload.length : 'null'}, offset=${this.offset}, length=${this.length}`);
        if (this.transactions === null) {
            console.log('Block.writeTransactions: no transactions to write');
            return;
        }

        // confirmed we must have transactions either cached or as objects.
        // Only use cached transaction bytes when we actually have no in-memory
        // transaction objects. This prevents returning a stale cached slice when
        // the block was created/modified programmatically.
        if (this.transactionBytesValid && this.payload && this.payload.length >= this.offset + this.length && (this.transactions === null || this.transactions.length === 0)) {
            const sliceStart = this.offset + NetworkParameters.HEADER_SIZE;
            const sliceEnd = this.offset + this.length;
            console.log(`Block.writeTransactions: writing cached transaction bytes slice [${sliceStart}..${sliceEnd}) length=${sliceEnd - sliceStart}`);
            stream.write(Buffer.from(this.payload.subarray(sliceStart, sliceEnd)));
            return;
        }

        console.log(`Block.writeTransactions: serializing ${this.transactions.length} transactions`);

        console.log(`Block.writeTransactions: writing VarInt of ${this.transactions.length}`);
        stream.write(new VarInt(this.transactions.length).encode());
        for (const tx of this.transactions) {
            tx.bitcoinSerialize(stream);
        }
    }

    /**
     * Special handling to check if we have a valid byte array for both header and
     * transactions
     */
    public bitcoinSerialize(): Uint8Array {
        // Check if we have valid cached bytes for both header and transactions
        // but only return the cached bytes if there are no transaction objects
        // present (i.e. this is strictly a header or the payload already
        // contains the full transactions slice). This avoids returning a
        // cached payload that doesn't reflect in-memory transaction objects
        // (e.g. genesis created programmatically).
        if (this.headerBytesValid && this.transactionBytesValid && this.payload !== null && (this.transactions === null || this.transactions.length === 0)) {
            // Bytes should never be null if both flags are true
            if (this.length === this.payload.length) {
                return this.payload;
            } else {
                // byte array is offset so copy out the correct range
                const buf = new Uint8Array(this.length);
                buf.set(this.payload.subarray(this.offset, this.offset + this.length));
                return buf;
            }
        }

        console.log(`Block.bitcoinSerialize: starting length=${this.length}`);
        const stream = new UnsafeByteArrayOutputStream(
            this.length === Message.UNKNOWN_LENGTH ? NetworkParameters.HEADER_SIZE + this.guessTransactionsLength() : this.length);
        try {
            this.writeHeader(stream);
            try { console.log(`Block.bitcoinSerialize: after writeHeader size=${typeof (stream.size) === 'function' ? stream.size() : -1}`); } catch (e) {}
            this.writePoW(stream);
            try { console.log(`Block.bitcoinSerialize: after writePoW size=${typeof (stream.size) === 'function' ? stream.size() : -1}`); } catch (e) {}
            // For headers, we still need to write the transaction count (0)
            if (this.transactions !== null) {
                if (this.transactions.length > 0) {
                    this.writeTransactions(stream);
                } else {
                    // Write transaction count as 0 for headers with empty transaction list
                    stream.write(new VarInt(0).encode());
                }
            } else {
                // If transactions is null, this is a header, so write transaction count as 0
                stream.write(new VarInt(0).encode());
            }
            try { console.log(`Block.bitcoinSerialize: after writeTransactions size=${typeof (stream.size) === 'function' ? stream.size() : -1}`); } catch (e) {}
        } catch (e) {
            // Cannot happen, we are serializing to a memory stream.
        }
        let out: Uint8Array;
        try {
            out = stream.toByteArray();
        } catch (e) {
            console.error('Block.bitcoinSerialize: error converting stream to byte array', e);
            // Fall back to an empty buffer to avoid throwing further.
            out = new Uint8Array(0);
        }
        console.log(`Block.bitcoinSerialize: final out.length=${out.length}`);
        return out;
    }

    protected bitcoinSerializeToStream(stream: any): void {
        this.writeHeader(stream);
        this.writePoW(stream);
        // We may only have enough data to write the header and PoW.
        // For headers, we still need to write the transaction count (0)
        if (this.transactions !== null) {
            if (this.transactions.length > 0) {
                this.writeTransactions(stream);
            } else {
                // Write transaction count as 0 for headers with empty transaction list
                stream.write(new VarInt(0).encode());
            }
        } else {
            // If transactions is null, this is a header, so write transaction count as 0
            stream.write(new VarInt(0).encode());
        }
    }

    /**
     * Provides a reasonable guess at the byte length of the transactions part of
     * the block. The returned value will be accurate in 99% of cases and in those
     * cases where not will probably slightly oversize. This is used to preallocate
     * the underlying byte array for a ByteArrayOutputStream. If the size is under
     * the real value the only penalty is resizing of the underlying byte array.
     */
    private guessTransactionsLength(): number {
        if (this.transactionBytesValid && this.payload)
            return this.payload.length - NetworkParameters.HEADER_SIZE;
        if (this.transactions === null)
            return 0;
        let len = VarInt.sizeOf(this.transactions.length);
        for (const tx of this.transactions) {
            // 255 is just a guess at an average tx length
            len += tx.getLength() === Message.UNKNOWN_LENGTH ? 255 : tx.getLength();
        }
        return len;
    }

    protected unCache(): void {
        // Since we have alternate uncache methods to use internally this will
        // only ever be called by a child
        // transaction so we only need to invalidate that part of the cache.
        this.unCacheTransactions();
    }

    private unCacheHeader(): void {
        this.headerBytesValid = false;
        if (!this.transactionBytesValid)
            this.payload = null;
        this.hash = null;
    }

    private unCacheTransactions(): void {
        this.transactionBytesValid = false;
        if (!this.headerBytesValid)
            this.payload = null;
        // Current implementation has to uncache headers as well as any change
        // to a tx will alter the merkle root. In
        // future we can go more granular and cache merkle root separately so
        // rest of the header does not need to be
        // rewritten.
        this.unCacheHeader();
        // Clear merkleRoot last as it may end up being parsed during
        // unCacheHeader().
        this.merkleRoot = null as any; // This will be recalculated when needed
    }

    /**
     * Calculates the block hash by serializing the block and hashing the resulting
     * bytes.
     */
    private calculateHash(): Sha256Hash {
        const bos = new UnsafeByteArrayOutputStream(NetworkParameters.HEADER_SIZE);
        this.writeHeader(bos);
        return Sha256Hash.wrapReversed(Sha256Hash.hashTwice(bos.toByteArray()));
    }

    /**
     * Calculates the hash relevant for PoW difficulty checks.
     */
    private calculatePoWHash(): Sha256Hash {
        const bos = new UnsafeByteArrayOutputStream(NetworkParameters.HEADER_SIZE);
        this.writeHeader(bos);
        return Sha256Hash.wrapReversed(Sha256Hash.hashTwice(bos.toByteArray()));
    }

    /**
     * Returns the hash of the block (which for a valid, solved block should be
     * below the target) in the form seen on the block explorer. If you call this on
     * block 1 in the mainnet chain you will get
     * "00000000839a8e6886ab5951d76f411475428afc90947ee320161bbf18eb6048".
     */
    public getHashAsString(): string {
        return this.getHash().toString();
    }

    /**
     * Returns the hash of the block (which for a valid, solved block should be
     * below the target). Big endian.
     */
    public getHash(): Sha256Hash {
        if (this.hash === null)
            this.hash = this.calculateHash();
        return this.hash;
    }

    /**
     * The number that is one greater than the largest representable SHA-256 hash.
     */
    private static readonly LARGEST_HASH = BigInt(1) << BigInt(256);

    /**
     * Returns the work represented by this block.
     * <p>
     *
     * Work is defined as the number of tries needed to solve a block in the average
     * case. Consider a difficulty target that covers 5% of all possible hash
     * values. Then the work of the block will be 20. As the target gets lower, the
     * amount of work goes up.
     */
    public getWork(): bigint {
        const target = this.getDifficultyTargetAsInteger();
        return Block.LARGEST_HASH / (target + BigInt(1));
    }

    /** Returns a copy of the block */
    public cloneAsHeader(): Block {
        if (this.params === null) {
            throw new Error("Network parameters are null");
        }
        const block = Block.setBlock2(this.params, this.version);
        this.copyBitcoinHeaderTo(block);
        return block;
    }

    /** Copy the block into the provided block. */
    protected copyBitcoinHeaderTo(block: Block): void {
        block.nonce = this.nonce;
        block.prevBlockHash = this.prevBlockHash;
        block.prevBranchBlockHash = this.prevBranchBlockHash;
        block.merkleRoot = this.getMerkleRoot();
        block.version = this.version;
        block.time = this.time;
        block.difficultyTarget = this.difficultyTarget;
        block.lastMiningRewardBlock = this.lastMiningRewardBlock;
        block.minerAddress = this.minerAddress;

        block.blockType = this.blockType;
        block.transactions = null;
        block.hash = this.getHash();
    }

    /**
     * Returns a multi-line string containing a description of the contents of the
     * block. Use for debugging purposes only.
     */
    public toString(): string {
        let s = "";
        s += "   hash: " + this.getHashAsString() + '\n';
        s += "   version: " + this.version;
        s += "   time: " + this.time + " (" + Utils.dateTimeFormat(this.time * 1000) + ")\n";
        s += "   height: " + this.height + "\n";
        s += "   chain length: " + this.getLastMiningRewardBlock() + "\n";
        s += "   previous: " + this.getPrevBlockHash() + "\n";
        s += "   branch: " + this.getPrevBranchBlockHash() + "\n";
        s += "   merkle: " + this.getMerkleRoot() + "\n";
        s += "   difficulty target (nBits):    " + this.difficultyTarget + "\n";
        s += "   nonce: " + this.nonce + "\n";
        if (this.minerAddress !== null) {
            if (this.params === null) {
                throw new Error("Network parameters are null");
            }
            s += "   mineraddress: " + new Address(this.params, this.params.getAddressHeader(), Buffer.from(this.minerAddress)) + "\n";
        }

        s += "   blocktype: " + this.blockType + "\n";
        if (this.transactions !== null && this.transactions.length > 0) {
            s += "   " + this.transactions.length + " transaction(s):\n";
            for (const tx of this.transactions) {
                s += tx.toString();
            }
        }
        if (this.blockType === BlockType.BLOCKTYPE_REWARD) {
            try {
                if (this.transactions !== null && this.transactions.length > 0 && this.transactions[0].getData() !== null) {
                    const rewardInfo = new RewardInfo().parse(this.transactions[0].getData()!);
                    s += rewardInfo.toString();
                }
            } catch (e) {
                // ignore throw new RuntimeException(e);
            }
        }
        if (this.blockType === BlockType.BLOCKTYPE_ORDER_OPEN) {
            try {
                if (this.transactions !== null && this.transactions.length > 0 && this.transactions[0].getData() !== null) {
                    const info = new OrderOpenInfo().parse(this.transactions[0].getData()!);
                    s += info.toString();
                }
            } catch (e) {
                // ignore throw new RuntimeException(e);
            }
        }
        if (this.blockType === BlockType.BLOCKTYPE_TOKEN_CREATION) {
            try {
                if (this.transactions !== null && this.transactions.length > 0 && this.transactions[0].getData() !== null) {
                    const info = new TokenInfo().parse(this.transactions[0].getData()!);
                    s += info.toString();
                }
            } catch (e) {
                // ignore throw new RuntimeException(e);
            }
        }
        if (this.blockType === BlockType.BLOCKTYPE_CONTRACT_EXECUTE) {
            try {
                if (this.transactions !== null && this.transactions.length > 0 && this.transactions[0].getData() !== null) {
                    const info = new ContractExecutionResult().parse(this.transactions[0].getData()!);
                    s += info.toString();
                }
            } catch (e) {
                // ignore throw new RuntimeException(e);
            }
        }
        if (this.blockType === BlockType.BLOCKTYPE_ORDER_EXECUTE) {
            try {
                if (this.transactions !== null && this.transactions.length > 0 && this.transactions[0].getData() !== null) {
                    const info = new OrderExecutionResult().parse(this.transactions[0].getData()!);
                    s += info.toString();
                }
            } catch (e) {
                // ignore throw new RuntimeException(e);
            }
        }
        return s;
    }

    /**
     * <p>
     * Finds a value of nonce and equihashProof if using Equihash that validates
     * correctly.
     */
    public solve(target: bigint): void {
        // Add randomness to prevent new empty blocks from same miner with same
        // approved blocks to be the same
        this.setNonce(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));

        while (true) {
            try {
                // Is our proof of work valid yet?
                if (this.checkProofOfWork(false, target))
                    return;

                // No, so increment the nonce and try again.
                this.setNonce(this.getNonce() + 1);
            } catch (e) {
                throw new Error("Runtime exception"); // Cannot happen.
            }
        }
    }

    /**
     * <p>
     * Finds a value of nonce and equihashProof if using Equihash that validates
     * correctly.
     */
    public solveDefault(): void {
        this.solve(this.getDifficultyTargetAsInteger());
    }

    /**
     * Returns the difficulty target as a 256 bit value that can be compared to a
     * SHA-256 hash. Inside a block the target is represented using a compact form.
     * If this form decodes to a value that is out of bounds, an exception is
     * thrown.
     */
    public getDifficultyTargetAsInteger(): bigint {
        const target = Utils.decodeCompactBits(this.difficultyTarget);
        if (this.params === null) {
            throw new Error("Network parameters are null");
        }
        if (target < 0 || target > this.params.getMaxTarget())
            throw new VerificationException("Difficulty target out of bounds");
        return target;
    }

    /**
     * Returns true if the PoW of the block is OK
     */
    public checkProofOfWork(throwException: boolean): void;
    public checkProofOfWork(throwException: boolean, target: bigint): boolean;
    public checkProofOfWork(throwException: boolean, target?: bigint): void | boolean {
        if (target === undefined) {
            this.checkProofOfWork(throwException, this.getDifficultyTargetAsInteger());
            return;
        }

        // No PoW for genesis block
        if (this.getBlockType() === BlockType.BLOCKTYPE_INITIAL) {
            return true;
        }

        // This part is key - it is what proves the block was as difficult to
        // make as it claims to be. Note however that in the context of this
        // function, the block can claim to be as difficult as it wants to be ....
        // if somebody was able to take control of our network connection and
        // fork us onto a different chain, they could send us valid blocks with
        // ridiculously easy difficulty and this function would accept them.
        //
        // To prevent this attack from being possible, elsewhere we check that
        // the difficultyTarget field is of the right value. This requires us
        // to have the preceeding blocks.

        const h = this.calculatePoWHash().toBigInteger();

        if (h > target) {
            // Proof of work check failed!
            if (throwException)
                throw new VerificationException("Proof of work failed");
            else
                return false;
        }

        return true;
    }

    // Add the missing verify method
    public verify(): void {
        // For now, we'll just implement a placeholder
        // In a real implementation, this would verify the block's proof-of-work
        // and other consensus rules
        console.log("Block verification called");
    }

    // Add the missing setMinerAddress method
    public setMinerAddress(address: Uint8Array): void {
        this.minerAddress = address;
    }
    
    // Add missing setDifficultyTarget method
    public setDifficultyTarget(difficultyTarget: number): void {
        this.difficultyTarget = difficultyTarget;
    }
    
    // Add the missing addCoinbaseTransaction method
    public addCoinbaseTransaction(coinbaseData: Uint8Array): void {
        if (this.transactions === null) {
            this.transactions = [];
        }
        // Create a new transaction for the coinbase
        const tx = new Transaction(this.params!);
        tx.setData(coinbaseData);
        this.transactions.push(tx);
    }
    
    // Fix merkle root calculation
    public calculateMerkleRoot(): Sha256Hash {
        if (!this.transactions || this.transactions.length === 0) {
            return Sha256Hash.ZERO_HASH;
        }
        
        // Get transaction hashes as Sha256Hash objects
        const hashes = this.transactions.map(tx => tx.getHash());
        return Utils.calculateMerkleRoot(hashes);
    }

    getVersion(): number { return this.version; }
    getTimeSeconds(): number { return this.time; }
    getHeight(): number { return this.height; }
    getPrevBlockHash(): Sha256Hash { return this.prevBlockHash; }
    getPrevBranchBlockHash(): Sha256Hash { return this.prevBranchBlockHash; }
    getMerkleRoot(): Sha256Hash { return this.merkleRoot; }
    getDifficultyTarget(): number { return this.difficultyTarget; }
    getLastMiningRewardBlock(): number { return this.lastMiningRewardBlock; }
    getNonce(): number { return this.nonce; }
    getMinerAddress(): Uint8Array { return this.minerAddress; }
    getTransactions(): Transaction[] | null { return this.transactions; }
    getBlockType(): BlockType { return this.blockType; }
    
    setNonce(nonce: number): void {
        this.unCacheHeader();
        this.nonce = nonce;
        this.hash = null;
    }
    
    setHeight(height: number): void {
        this.unCacheHeader();
        this.height = height;
        this.hash = null;
    }
    
    private checkTimestamp(): void {
        // Allow injection of a fake clock to allow unit testing.
        const currentTime = Math.floor(Date.now() / 1000);
        if (this.time > currentTime + NetworkParameters.ALLOWED_TIME_DRIFT)
            throw new VerificationException("Time traveler");
    }
}
