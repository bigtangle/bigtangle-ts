import { NetworkParameters } from '../params/NetworkParameters';
import { Transaction } from './Transaction';
import { Message } from './Message';
import { Sha256Hash } from './Sha256Hash';
import { BlockType } from './BlockType';
import { Utils } from './Utils';
import { VarInt } from './VarInt';
import { Address } from './Address';
import { RewardInfo } from './RewardInfo';
import { OrderOpenInfo } from './OrderOpenInfo';
import { TokenInfo } from './TokenInfo';
import { ContractExecutionResult } from './ContractExecutionResult';
import { OrderExecutionResult } from './OrderExecutionResult';
import { VerificationException } from '../exception/VerificationException';
import { ScriptBuilder } from '../script/ScriptBuilder';
import { ECKey } from './ECKey';
import { Coin } from './Coin';
import { DataClassName } from './DataClassName';
import { MemoInfo } from './MemoInfo';
import bigInt from 'big-integer';
import { TransactionInput } from './TransactionInput';
import { TransactionOutput } from './TransactionOutput';
import { Buffer } from 'buffer';
import { UnsafeByteArrayOutputStream } from './UnsafeByteArrayOutputStream';
import { TransactionOutPoint } from './TransactionOutPoint';
import { MessageSerializer } from './MessageSerializer';
import { BaseEncoding } from '../utils/BaseEncoding';

export class Block extends Message {
    public parent: Message | null = null;
    private static readonly LARGEST_HASH = 2n ** 256n;
    
    // Override the protected unCache method from Message to make it public
    // Remove the duplicate unCache method
    // The public unCache() override was causing a duplicate function implementation error
    // The protected unCache() method from the parent class is already defined below
    // This comment is just to explain the removal

    private version: number = 0;
    private prevBlockHash: Sha256Hash | null = null;
    private prevBranchBlockHash: Sha256Hash | null = null;
    private merkleRoot: Sha256Hash | null = null;
    private time: number = 0;
    private difficultyTarget: number = 0;
    private lastMiningRewardBlock: number = 0;
    private nonce: number = 0;
    private minerAddress: Buffer | null = null;
    private blockType: BlockType | null = null;
    private height: number = 0;

    private transactions: Transaction[] | null = null;
    private hash: Sha256Hash | null = null;

    protected headerBytesValid: boolean = false;
    protected transactionBytesValid: boolean = false;
    protected optimalEncodingMessageSize: number = 0;

    constructor(params: NetworkParameters, setVersion?: number) {
        super(params);
        if (setVersion !== undefined) {
            this.version = NetworkParameters.BLOCK_VERSION_GENESIS;
            this.difficultyTarget = Utils.encodeCompactBits(params.getMaxTarget());
            this.lastMiningRewardBlock = 0;
            this.time = Math.floor(Date.now() / 1000);
            this.prevBlockHash = Sha256Hash.ZERO_HASH;
            this.prevBranchBlockHash = Sha256Hash.ZERO_HASH;
            this.blockType = BlockType.BLOCKTYPE_INITIAL; // Changed from BLOCKTYPE_TRANSFER to BLOCKTYPE_INITIAL
            this.minerAddress = Buffer.alloc(20);
            this.length = NetworkParameters.HEADER_SIZE;
            this.transactions = [];
        } else {
            this.version = 0;
            this.prevBlockHash = null;
            this.prevBranchBlockHash = null;
            this.merkleRoot = null;
            this.time = 0;
            this.difficultyTarget = 0;
            this.lastMiningRewardBlock = 0;
            this.nonce = 0;
            this.minerAddress = null;
            this.blockType = null;
            this.height = 0;
            this.transactions = null;
            this.hash = null;
            this.headerBytesValid = false;
            this.transactionBytesValid = false;
            this.optimalEncodingMessageSize = 0;
        }
    }

    static fromPayload(params: NetworkParameters, payloadBytes: Buffer, serializer: MessageSerializer<any>, length: number): Block {
        const block = new Block(params);
        block.payload = Buffer.from(payloadBytes); // Ensure we have a copy of the payload
        block.offset = 0;
        block.length = length;
        block.serializer = serializer;
        block.parse();
        return block;
    }

    static fromPayloadWithOffsetAndParent(params: NetworkParameters, payloadBytes: Buffer, offset: number, parent: Message | null, serializer: MessageSerializer<any>, length: number): Block {
        const block = new Block(params);
        block.payload = Buffer.from(payloadBytes); // Ensure we have a copy of the payload
        block.offset = offset;
        block.length = length;
        block.serializer = serializer;
        block.parent = parent;
        block.parse();
        return block;
    }

    public adjustLength(...args: any[]): void {
        if (args.length === 1) {
            this.length += args[0];
            this.optimalEncodingMessageSize += args[0];
        } else if (args.length === 2) {
            this.length += args[1];
            this.optimalEncodingMessageSize += args[1];
        }
        if (this.parent !== null) {
            if (args.length === 1) {
                (this.parent as any).adjustLength(0, args[0]);
            } else if (args.length === 2) {
                (this.parent as any).adjustLength(args[0], args[1]);
            }
        }
    }

    static createBlock(networkParameters: NetworkParameters, r1: Block, r2: Block): Block {
        const block = new Block(networkParameters);
        block.prevBlockHash = r1.getHash();
        block.prevBranchBlockHash = r2.getHash();
        block.time = Math.max(r1.getTimeSeconds(), r2.getTimeSeconds());
        block.lastMiningRewardBlock = Math.max(r1.getLastMiningRewardBlock(), r2.getLastMiningRewardBlock());
        block.difficultyTarget = r1.getLastMiningRewardBlock() > r2.getLastMiningRewardBlock() ? 
            r1.getDifficultyTarget() : r2.getDifficultyTarget();
        block.blockType = BlockType.BLOCKTYPE_TRANSFER;
        block.setHeight(Math.max(r1.getHeight(), r2.getHeight()) + 1);
        return block;
    }
 
    isBLOCKTYPE_INITIAL(): boolean {
        return this.getBlockType() === BlockType.BLOCKTYPE_INITIAL;
    }

    protected parseTransactions(transactionsOffset: number): void {
        this.cursor = transactionsOffset;
        this.optimalEncodingMessageSize = NetworkParameters.HEADER_SIZE;
        
        if (!this.payload || this.payload.length === this.cursor) {
            this.transactionBytesValid = false;
            return;
        }

        const numTransactions = this.readVarInt();
        this.optimalEncodingMessageSize += VarInt.sizeOf(Number(numTransactions));
        this.transactions = [];
        
        for (let i = 0; i < numTransactions; i++) {
            const tx = new Transaction(this.params, this.payload, this.cursor, this.serializer, this, Message.UNKNOWN_LENGTH);
            // Parse the transaction to set its length
            tx.parse();
            this.transactions.push(tx);
            this.cursor += tx.getMessageSize();
            this.optimalEncodingMessageSize += tx.getOptimalEncodingMessageSize();
        }
        
        this.transactionBytesValid = this.serializer.isParseRetainMode();
    }

    protected parse(): void {
        this.cursor = this.offset;
        this.version = this.readUint32();
        this.prevBlockHash = this.readHash();
        this.prevBranchBlockHash = this.readHash();
        this.merkleRoot = this.readHash();
        this.time = Number(this.readInt64());
        this.difficultyTarget = Number(this.readInt64());
        this.lastMiningRewardBlock = Number(this.readInt64());
        // Read nonce as unsigned 32-bit integer
        const nonceBytes = this.readBytes(4);
        this.nonce = nonceBytes.readUInt32LE(0);
        this.minerAddress = this.readBytes(20);
        const blockTypeValue = this.readUint32();
        const blockTypeKeys = Object.keys(BlockType).filter(key => typeof BlockType[key as keyof typeof BlockType] === 'number');
        const isValidBlockType = blockTypeKeys.some(key => BlockType[key as keyof typeof BlockType] === blockTypeValue);
        this.blockType = isValidBlockType ? blockTypeValue as unknown as BlockType : null;
        this.height = Number(this.readInt64());
        
        if (this.payload) {
            const headerBytes = this.payload.slice(this.offset, this.cursor);
            this.hash = Sha256Hash.wrapReversed(Sha256Hash.hashTwice(headerBytes)) || Sha256Hash.ZERO_HASH;
        }
        this.headerBytesValid = this.serializer.isParseRetainMode();
        this.parseTransactions(this.cursor);
        this.length = this.cursor - this.offset;
    }

    getOptimalEncodingMessageSize(): number {
        if (this.optimalEncodingMessageSize !== 0) return this.optimalEncodingMessageSize;
        this.optimalEncodingMessageSize = this.bitcoinSerialize().length;
        return this.optimalEncodingMessageSize;
    }

    private writeHeader(stream: UnsafeByteArrayOutputStream): void {
        if (this.headerBytesValid && this.payload && this.payload.length >= this.offset + NetworkParameters.HEADER_SIZE) {
            stream.write(this.payload.slice(this.offset, this.offset + NetworkParameters.HEADER_SIZE));
            return;
        }

        // Ensure version is within 32-bit range
        if (this.version < 0 || this.version > 0xFFFFFFFF) {
            throw new Error(`Version out of range: ${this.version}`);
        }
        Utils.uint32ToByteStreamLE(this.version, stream);
        
        stream.write(this.prevBlockHash?.getReversedBytes() || Buffer.alloc(32));
        stream.write(this.prevBranchBlockHash?.getReversedBytes() || Buffer.alloc(32));
        // Calculate merkle root if not already calculated
        const merkleRoot = this.getMerkleRoot();
        stream.write(merkleRoot.getReversedBytes());
        
        Utils.int64ToByteStreamLE(BigInt(this.time), stream);
        Utils.int64ToByteStreamLE(BigInt(this.difficultyTarget), stream);
        Utils.int64ToByteStreamLE(BigInt(this.lastMiningRewardBlock), stream);
        
        // Ensure nonce is within 32-bit range
        if (this.nonce < 0 || this.nonce > 0xFFFFFFFF) {
            throw new Error(`Nonce out of range: ${this.nonce}`);
        }
        Utils.uint32ToByteStreamLE(this.nonce, stream);
        
        stream.write(this.minerAddress || Buffer.alloc(20));
        
        // Ensure blockType is within 32-bit range
        const blockTypeValue = this.blockType?.valueOf() || 0;
        if (blockTypeValue < 0 || blockTypeValue > 0xFFFFFFFF) {
            throw new Error(`BlockType out of range: ${blockTypeValue}`);
        }
        Utils.uint32ToByteStreamLE(blockTypeValue, stream);
        
        Utils.int64ToByteStreamLE(BigInt(this.height), stream);
    }

    private writePoW(stream: UnsafeByteArrayOutputStream): void {
        // No PoW implementation needed for now
    }

    public getLength(): number {
        return this.length;
    }

    private writeTransactions(stream: UnsafeByteArrayOutputStream): void {
        if (!this.transactions) return;

        // Always serialize transactions from scratch to ensure consistency
        const varInt = new VarInt(this.transactions.length);
        stream.write(varInt.encode());
        
        for (const tx of this.transactions) {
            tx.bitcoinSerializeToStream(stream);
        }
    }

    bitcoinSerialize(): Uint8Array {
        // Always serialize the block from scratch to ensure consistency
        const stream = new UnsafeByteArrayOutputStream();
        this.writeHeader(stream);
        this.writePoW(stream);
        this.writeTransactions(stream);
        
        return stream.toByteArray();
    }

    public bitcoinSerializeToStream(stream: UnsafeByteArrayOutputStream): void {
        this.writeHeader(stream);
        this.writePoW(stream);
        this.writeTransactions(stream);
    }

    private guessTransactionsLength(): number {
        if (this.transactionBytesValid && this.payload) {
            return this.payload.length - NetworkParameters.HEADER_SIZE;
        }
        if (!this.transactions) return 0;
        
        let len = VarInt.sizeOf(this.transactions.length);
        for (const tx of this.transactions) {
            len += tx.getMessageSize() === Message.UNKNOWN_LENGTH ? 255 : tx.getMessageSize();
        }
        return len;
    }


    public getParent(): Message | null {
        return this.parent;
    }

    public setParent(parent: Message | null): void {
        this.parent = parent;
    }

    private unCacheHeader(): void {
        this.headerBytesValid = false;
        if (!this.transactionBytesValid) this.payload = Buffer.alloc(0);
        if (!this.headerBytesValid) this.payload = Buffer.alloc(0);
        this.hash = null;
    }

    private unCacheTransactions(): void {
        this.transactionBytesValid = false;
        if (!this.headerBytesValid) this.payload = Buffer.alloc(0);
        this.unCacheHeader();
        this.merkleRoot = null;
    }

    private calculateHash(): Sha256Hash {
        const stream = new UnsafeByteArrayOutputStream();
        this.writeHeader(stream);
        return Sha256Hash.wrapReversed(Sha256Hash.hashTwice(stream.toByteArray()));
    }

    private calculatePoWHash(): Sha256Hash {
        const stream = new UnsafeByteArrayOutputStream();
        this.writeHeader(stream);
        return Sha256Hash.wrapReversed(Sha256Hash.hashTwice(stream.toByteArray()));
    }

    getHashAsString(): string {
        return this.getHash().toString();
    }

    getHash(): Sha256Hash {
        if (!this.hash) this.hash = this.calculateHash();
        return this.hash;
    }

    getWork(): bigint {
        const target = this.getDifficultyTargetAsInteger();
        // Using bigInt library for mathematical operations
        return BigInt(bigInt(Block.LARGEST_HASH.toString()).divide(bigInt(target.toString()).add(bigInt(1))).toString());
    }

    cloneAsHeader(): Block {
        const block = new Block(this.params);
        this.copyBitcoinHeaderTo(block);
        return block;
    }

    protected copyBitcoinHeaderTo(block: Block): void {
        block.nonce = this.nonce;
        block.prevBlockHash = this.prevBlockHash;
        block.prevBranchBlockHash = this.prevBranchBlockHash;
        // Use the stored merkle root if available, otherwise calculate it
        block.merkleRoot = this.merkleRoot || this.calculateMerkleRoot();
        block.version = this.version;
        block.time = this.time;
        block.difficultyTarget = this.difficultyTarget;
        block.lastMiningRewardBlock = this.lastMiningRewardBlock;
        block.minerAddress = this.minerAddress;
        block.blockType = this.blockType;
        block.transactions = null;
        block.hash = this.getHash();
    }

    toString(): string {
        const s: string[] = [];
        s.push(`   hash: ${this.getHashAsString()}\n`);
        s.push(`   version: ${this.version}`);
        s.push(`   time: ${this.time} (${new Date(this.time * 1000).toISOString()})\n`);
        s.push(`   height: ${this.height}\n`);
        s.push(`   chain length: ${this.getLastMiningRewardBlock()}\n`);
        s.push(`   previous: ${this.getPrevBlockHash()}\n`);
        s.push(`   branch: ${this.getPrevBranchBlockHash()}\n`);
        s.push(`   merkle: ${this.getMerkleRoot()}\n`);
        s.push(`   difficulty target (nBits):    ${this.difficultyTarget}\n`);
        s.push(`   nonce: ${this.nonce}\n`);
        
        if (this.minerAddress) {
            const address = new Address(this.params, 0, this.minerAddress);
            s.push(`   mineraddress: ${address}\n`);
        }

        s.push(`   blocktype: ${this.blockType}\n`);
        
        if (this.transactions && this.transactions.length > 0) {
            s.push(`   ${this.transactions.length} transaction(s):\n`);
            for (const tx of this.transactions) {
                s.push(tx.toString());
            }
        }

        if (this.blockType === BlockType.BLOCKTYPE_REWARD) {
            try {
                if (this.transactions && this.transactions.length > 0 && this.transactions[0]) {
                    const data = this.transactions[0].getData();
                    if (data !== null) {
                        const rewardInfo = new RewardInfo().parse(data);
                        s.push(rewardInfo.toString());
                    }
                }
            } catch (e) {
                // Ignore
            }
        }

        if (this.blockType === BlockType.BLOCKTYPE_ORDER_OPEN) {
            try {
                if (this.transactions && this.transactions.length > 0 && this.transactions[0]) {
                    const data = this.transactions[0].getData();
                    if (data !== null) {
                        const info = new OrderOpenInfo().parse(data);
                        s.push(info.toString());
                    }
                }
            } catch (e) {
                // Ignore
            }
        }

        if (this.blockType === BlockType.BLOCKTYPE_TOKEN_CREATION) {
            try {
                if (this.transactions && this.transactions.length > 0 && this.transactions[0]) {
                    const data = this.transactions[0].getData();
                    if (data !== null) {
                        const info = new TokenInfo().parse(data);
                        s.push(info.toString());
                    }
                }
            } catch (e) {
                // Ignore
            }
        }

        if (this.blockType === BlockType.BLOCKTYPE_CONTRACT_EXECUTE) {
            try {
                if (this.transactions && this.transactions.length > 0 && this.transactions[0]) {
                    const data = this.transactions[0].getData();
                    if (data !== null) {
                        const info = new ContractExecutionResult().parse(data);
                        s.push(info.toString());
                    }
                }
            } catch (e) {
                // Ignore
            }
        }

        if (this.blockType === BlockType.BLOCKTYPE_ORDER_EXECUTE) {
            try {
                if (this.transactions && this.transactions.length > 0 && this.transactions[0]) {
                    const data = this.transactions[0].getData();
                    if (data !== null) {
                        const info = new OrderExecutionResult().parse(data);
                        s.push(info.toString());
                    }
                }
            } catch (e) {
                // Ignore
            }
        }

        return s.join('');
    }

    solve(target:bigint): void {
        // Add randomness to prevent new empty blocks from same miner with same approved blocks to be the same
        // Ensure nonce is within 32-bit range
        this.setNonce(Math.floor(Math.random() * 0xFFFFFFFF));

        while (true) {
            try {
                if (this.checkProofOfWorkWithTarget(false, target)) return;
                // Ensure nonce is within 32-bit range
                if (this.getNonce() + 1 > 0xFFFFFFFF) {
                    this.setNonce(0);
                } else {
                    this.setNonce(this.getNonce() + 1);
                }
            } catch (e) {
                throw new Error(`Unexpected error during block solving: ${e}`);
            }
        }
    }

    solveWithoutTarget(): void {
        // For genesis block, solve with the actual difficulty target
        this.solve(this.getDifficultyTargetAsInteger());
    }

    getDifficultyTargetAsInteger(): bigint {
        const target = Utils.decodeCompactBits(this.difficultyTarget);
        if (!target || target < 0 || target >  this.params.getMaxTarget()  ) {
            throw new VerificationException.DifficultyTargetException();
        }
        return target;
    }

    checkProofOfWork(throwException: boolean): boolean {
        return this.checkProofOfWorkWithTarget(throwException, this.getDifficultyTargetAsInteger());
    }

    checkProofOfWorkWithTarget(throwException: boolean, target: bigint): boolean {
        if (this.getBlockType() === BlockType.BLOCKTYPE_INITIAL) {
            return true;
        }

        const h = this.calculatePoWHash();
        const hBigInt = bigInt(h.toString(), 16);

        if (hBigInt.greater(target)) {
            if (throwException) {
                throw new VerificationException.ProofOfWorkException();
            } else {
                return false;
            }
        }

        return true;
    }

    private checkTimestamp(): void {
        const currentTime = Math.floor(Date.now() / 1000);
        if (this.time > currentTime + NetworkParameters.ALLOWED_TIME_DRIFT) {
            throw new VerificationException.TimeTravelerException();
        }
    }

    private checkSigOps(): void {
        let sigOps = 0;
        if (!this.transactions) return;

        for (const tx of this.transactions) {
            sigOps += tx.getSigOpCount();
        }

        if (sigOps > NetworkParameters.MAX_BLOCK_SIGOPS) {
            throw new VerificationException.SigOpsException();
        }
    }

    private checkMerkleRoot(): void {
        const calculatedRoot = this.calculateMerkleRoot();
        if (this.merkleRoot && !calculatedRoot.equals(this.merkleRoot)) {
            throw new VerificationException.MerkleRootMismatchException();
        }
    }

    private calculateMerkleRoot(): Sha256Hash {
        // If there are no transactions, return zero hash
        if (!this.transactions || this.transactions.length === 0) {
            return Sha256Hash.ZERO_HASH;
        }
        
        // Start with the hashes of all transactions
        let hashes: Buffer[] = this.transactions.map(tx => tx.getHash().getBytes());
        
        // Build the merkle tree by repeatedly hashing pairs
        while (hashes.length > 1) {
            const newHashes: Buffer[] = [];
            
            // Process pairs of hashes
            for (let i = 0; i < hashes.length; i += 2) {
                const left = hashes[i];
                const right = i + 1 < hashes.length ? hashes[i + 1] : left; // Duplicate last if odd number
                
                // Concatenate the two hashes
                const concat = Buffer.concat([left, right]);
                
                // Hash the concatenation twice
                const hash = Sha256Hash.hashTwice(concat);
                
                newHashes.push(hash);
            }
            
            hashes = newHashes;
        }
        
        // The final hash is the merkle root
        return Sha256Hash.wrap(hashes[0]);
    }


    verifyHeader(): void {
        this.checkProofOfWork(true);
        this.checkTimestamp();
    }

    verifyTransactions(): void {
        if (this.getOptimalEncodingMessageSize() > this.getMaxBlockSize()) {
            throw new VerificationException.LargerThanMaxBlockSize();
        }
        this.checkMerkleRoot();
        this.checkSigOps();
        
        if (!this.transactions) return;

        for (const transaction of this.transactions) {
            if (!this.allowCoinbaseTransaction() && transaction.isCoinBase()) {
                throw new VerificationException.CoinbaseDisallowedException();
            }
            transaction.verify();
        }
    }

    private getMaxBlockSize(): number {
        return 1000000; // Simplified implementation
    }

    verify(): void {
        this.verifyHeader();
        this.verifyTransactions();
    }

    equals(other: any): boolean {
        if (this === other) return true;
        if (!(other instanceof Block)) return false;
        // Compare all relevant fields, not just the hash
        const otherBlock = other as Block;
        return this.getHash().equals(otherBlock.getHash()) &&
               this.version === otherBlock.version &&
               (this.prevBlockHash ? this.prevBlockHash.equals(otherBlock.prevBlockHash!) : otherBlock.prevBlockHash === null) &&
               (this.prevBranchBlockHash ? this.prevBranchBlockHash.equals(otherBlock.prevBranchBlockHash!) : otherBlock.prevBranchBlockHash === null) &&
               (this.merkleRoot ? this.merkleRoot.equals(otherBlock.merkleRoot!) : otherBlock.merkleRoot === null) &&
               this.time === otherBlock.time &&
               this.difficultyTarget === otherBlock.difficultyTarget &&
               this.lastMiningRewardBlock === otherBlock.lastMiningRewardBlock &&
               this.nonce === otherBlock.nonce &&
               (this.minerAddress ? this.minerAddress.equals(otherBlock.minerAddress!) : otherBlock.minerAddress === null) &&
               this.blockType === otherBlock.blockType &&
               this.height === otherBlock.height;
    }

    hashCode(): number {
        return this.getHash().hashCode();
    }

    getMerkleRoot(): Sha256Hash {
        // If we have a stored merkle root, return it
        if (this.merkleRoot) {
            return this.merkleRoot;
        }
        // Otherwise calculate it
        return this.calculateMerkleRoot();
    }

    setMerkleRoot(value: Sha256Hash): void {
        this.unCacheHeader();
        this.merkleRoot = value;
        this.hash = null;
    }

    addTransaction(t: Transaction): void {
        this.unCacheTransactions();
        if (!this.transactions) {
            this.transactions = [];
        }
        t.setParent(this);
        this.transactions.push(t);
        this.adjustLength(this.transactions.length, t.getMessageSize());
        this.merkleRoot = null;
        this.hash = null;
    }

    getVersion(): number {
        return this.version;
    }

    getPrevBlockHash(): Sha256Hash {
        return this.prevBlockHash!;
    }

    setPrevBlockHash(prevBlockHash: Sha256Hash): void {
        this.unCacheHeader();
        this.prevBlockHash = prevBlockHash;
        this.hash = null;
    }

    getPrevBranchBlockHash(): Sha256Hash {
        return this.prevBranchBlockHash!;
    }

    setPrevBranchBlockHash(prevBranchBlockHash: Sha256Hash): void {
        this.unCacheHeader();
        this.prevBranchBlockHash = prevBranchBlockHash;
        this.hash = null;
    }

    getTimeSeconds(): number {
        return this.time;
    }

    getTime(): Date {
        return new Date(this.time * 1000);
    }

    setTime(time: number): void {
        this.unCacheHeader();
        this.time = time;
        this.hash = null;
    }

    getNonce(): number {
        return this.nonce;
    }

    setNonce(nonce: number): void {
        // Ensure nonce is within 32-bit range
        if (nonce < 0 || nonce > 0xFFFFFFFF) {
            throw new Error(`Nonce out of range: ${nonce}`);
        }
        this.unCacheHeader();
        this.nonce = nonce;
        this.hash = null;
    }

    getTransactions(): Transaction[] {
        return this.transactions || [];
    }

    addCoinbaseTransaction(pubKeyTo: Buffer, value: Coin, tokenInfo: TokenInfo | null, memoInfo: MemoInfo | null): void {
        this.unCacheTransactions();
        this.transactions = [];

        const coinbase = new Transaction(this.params);
        if (tokenInfo !== null) {
            coinbase.setDataClassName(DataClassName.TOKEN);
            const buf = tokenInfo.toByteArray();
            coinbase.setData(Buffer.from(buf));
        }
        coinbase.setMemo(memoInfo);

        const inputBuilder = new ScriptBuilder();
        inputBuilder.data(Buffer.from([txCounter & 0xff, (txCounter >> 8) & 0xff]));
        txCounter++;

        coinbase.addInput(new TransactionInput(this.params, coinbase, Buffer.from( inputBuilder.build().getProgram()), new TransactionOutPoint(this.params, 0, Sha256Hash.ZERO_HASH, Sha256Hash.ZERO_HASH)));
        
        if (tokenInfo === null) {
            coinbase.addOutput(new TransactionOutput(this.params, coinbase, value,
                Buffer.from(ScriptBuilder.createOutputScript(ECKey.fromPublic(pubKeyTo)).getProgram())));
        } else {
            if (tokenInfo.getToken() === null || tokenInfo.getToken()?.getSignnumber() === 0) {
                coinbase.addOutput(new TransactionOutput(this.params, coinbase, value,
                    Buffer.from(ScriptBuilder.createOutputScript(ECKey.fromPublic(pubKeyTo)).getProgram())));
            } else {
                const keys: ECKey[] = [];
                for (const multiSignAddress of tokenInfo.getMultiSignAddresses()) {
                    if (multiSignAddress.getTokenHolder() === 1) {
                        const pubKeyHex = multiSignAddress.getPubKeyHex();
                        if (pubKeyHex !== null) {
                            const ecKey = ECKey.fromPublic(BaseEncoding.base16().lowerCase().decode(pubKeyHex));
                            keys.push(ecKey);
                        }
                    }
                }
                
                if (keys.length <= 1) {
                    coinbase.addOutput(new TransactionOutput(this.params, coinbase, value,
                        Buffer.from(ScriptBuilder.createOutputScript(ECKey.fromPublic(pubKeyTo)).getProgram())));
                } else {
                    const n = keys.length;
                    const scriptPubKey = ScriptBuilder.createMultiSigOutputScript(n, keys);
                    coinbase.addOutput(new TransactionOutput(this.params, coinbase, value, Buffer.from(scriptPubKey.getProgram())));
                }
            }
        }
        
        this.transactions.push(coinbase);
        coinbase.setParent(this);
        // Use the proper method to update the transaction's length
        coinbase.unCache();
        const serializedLength = coinbase.unsafeBitcoinSerialize().length;
        // Update the transaction's length through the parent's adjustLength method
        coinbase.adjustLength(0, serializedLength - coinbase.getMessageSize());
        this.adjustLength(this.transactions.length, serializedLength);
        // Update the merkle root
        this.merkleRoot = null;
    }

    allowCoinbaseTransaction(): boolean {
        return true; // Simplified implementation
    }

    hasTransactions(): boolean {
        return this.transactions !== null && this.transactions.length > 0;
    }

    getMinerAddress(): Buffer | null {
        return this.minerAddress;
    }

    setMinerAddress(mineraddress: Buffer): void {
        this.unCacheHeader();
        this.minerAddress = mineraddress;
        this.hash = null;
    }

    getBlockType(): BlockType {
        return this.blockType!;
    }

    setBlockType(blocktype: number | BlockType): void {
        if (typeof blocktype === 'number') {
            // Directly assign the numeric value to the enum typed property
            this.blockType = blocktype as unknown as BlockType;
        } else {
            this.blockType = blocktype;
        }
        this.unCacheHeader();
        this.hash = null;
    }

    getDifficultyTarget(): number {
        return this.difficultyTarget;
    }

    setDifficultyTarget(difficultyTarget: number): void {
        this.difficultyTarget = difficultyTarget;
    }

    getLastMiningRewardBlock(): number {
        return this.lastMiningRewardBlock;
    }

    setLastMiningRewardBlock(lastMiningRewardBlock: number): void {
        this.lastMiningRewardBlock = lastMiningRewardBlock;
    }

    getHeight(): number {
        return this.height;
    }

    setHeight(height: number): void {
        this.unCacheHeader();
        this.height = height;
        this.hash = null;
    }
}

// Used to make transactions unique
let txCounter: number = 0;
