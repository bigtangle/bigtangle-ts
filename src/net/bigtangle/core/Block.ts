import { NetworkParameters } from "../params/NetworkParameters";
import { Transaction } from "./Transaction";
import { Message } from "./Message";
import { Sha256Hash } from "./Sha256Hash";
import { BlockType } from "./BlockType";
import { Utils } from "./Utils";
import { VarInt } from "./VarInt";
import { Address } from "./Address";
import { RewardInfo } from "./RewardInfo";
import { OrderOpenInfo } from "./OrderOpenInfo";
import { TokenInfo } from "./TokenInfo";
import { ContractExecutionResult } from "./ContractExecutionResult";
import { OrderExecutionResult } from "./OrderExecutionResult";
import { VerificationException } from "../exception/VerificationException";
import { ScriptBuilder } from "../script/ScriptBuilder";
import { ECKey } from "./ECKey";
import { Coin } from "./Coin";
import { DataClassName } from "./DataClassName";
import { MemoInfo } from "./MemoInfo";
import bigInt from "big-integer";
import { TransactionInput } from "./TransactionInput";
import { TransactionOutput } from "./TransactionOutput";
import { Buffer } from "buffer";
import { UnsafeByteArrayOutputStream } from "./UnsafeByteArrayOutputStream";
import { TransactionOutPoint } from "./TransactionOutPoint";
import { MessageSerializer } from "./MessageSerializer";
import { BaseEncoding } from "../utils/BaseEncoding";

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
      this.blockType = BlockType.BLOCKTYPE_TRANSFER; // default
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

  static fromPayload(
    params: NetworkParameters,
    payloadBytes: Buffer,
    serializer: MessageSerializer<any>,
    length: number
  ): Block {
    const block = new Block(params);
    block.payload = Buffer.from(payloadBytes); // Ensure we have a copy of the payload
    block.offset = 0;
    block.length = length;
    block.serializer = serializer;
    block.parse();
    return block;
  }

  static fromPayloadWithOffsetAndParent(
    params: NetworkParameters,
    payloadBytes: Buffer,
    offset: number,
    parent: Message | null,
    serializer: MessageSerializer<any>,
    length: number
  ): Block {
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
    try {
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
    } catch (error) {
      console.error("Error in adjustLength:", error);
      throw error;
    }
  }

  static createBlock(
    networkParameters: NetworkParameters,
    r1: Block,
    r2: Block
  ): Block {
    const block = new Block(networkParameters);
    block.prevBlockHash = r1.getHash();
    block.prevBranchBlockHash = r2.getHash();
    block.time = Math.max(r1.getTimeSeconds(), r2.getTimeSeconds());
    block.lastMiningRewardBlock = Math.max(
      r1.getLastMiningRewardBlock(),
      r2.getLastMiningRewardBlock()
    );
    block.difficultyTarget =
      r1.getLastMiningRewardBlock() > r2.getLastMiningRewardBlock()
        ? r1.getDifficultyTarget()
        : r2.getDifficultyTarget();
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

    console.log(`parseTransactions called with transactionsOffset: ${transactionsOffset}`);
    console.log(`this.payload is null: ${this.payload === null}`);
    if (this.payload) {
      console.log(`this.payload length: ${this.payload.length}`);
      console.log(`this.cursor: ${this.cursor}`);
      console.log(`Bytes at cursor: ${this.payload.slice(this.cursor, this.cursor + 5).toString('hex')}`);
    }

    if (!this.payload || this.payload.length === this.cursor) {
      this.transactionBytesValid = false;
      return;
    }

    const numTransactions = this.readVarInt();
    console.log(`Parsing ${Number(numTransactions)} transactions at offset ${transactionsOffset}`);
    this.optimalEncodingMessageSize += VarInt.sizeOf(Number(numTransactions));
    this.transactions = [];

    for (let i = 0; i < Number(numTransactions); i++) {
      console.log(`Parsing transaction ${i} at cursor ${this.cursor}`);
      if (!this.getParams()) {
        throw new Error(
          "Network parameters are required to parse transactions"
        );
      }
      const tx = new Transaction(
        this.getParams(),
        this.payload,
        this.cursor,
        this.serializer,
        null,
        Message.UNKNOWN_LENGTH
      );
      tx.parse();
      const txMessageSize = tx.getMessageSize();
      console.log(`Transaction ${i} parsed, message size: ${txMessageSize}`);
      
      // Now create a new transaction with the correct payload length
      const txPayload = this.payload.slice(this.cursor, this.cursor + txMessageSize);
      const finalTx = new Transaction(
          this.getParams(),
          txPayload,
          0, // offset is 0 within the new payload
          this.serializer,
          null,
          txMessageSize
      );
      finalTx.parse(); // Reparse with the correct length
      
      this.transactions.push(finalTx);
      this.cursor += txMessageSize;
      this.optimalEncodingMessageSize += finalTx.getOptimalEncodingMessageSize();
    }

    console.log(`Parsed ${this.transactions.length} transactions`);
    // Always set transactionBytesValid to true after parsing transactions
    this.transactionBytesValid = true;
  }

  protected parse(): void {
    this.cursor = this.offset;
    console.log(`Starting Block parse at offset ${this.offset}, payload length: ${this.payload?.length}`);
    if (this.payload) {
      console.log(`First 20 bytes of payload: ${this.payload.slice(0, 20).toString('hex')}`);
      console.log(`Bytes at cursor 160: ${this.payload.slice(160, 165).toString('hex')}`);
      console.log(`Bytes 150-170: ${this.payload.slice(150, 170).toString('hex')}`);
    }
    console.log(`Reading version at cursor ${this.cursor}`);
    this.version = this.readUint32();
    console.log(`Version: ${this.version}, cursor after version: ${this.cursor}`);
    console.log(`Reading prevBlockHash at cursor ${this.cursor}`);
    this.prevBlockHash = this.readHash();
    console.log(`prevBlockHash cursor after: ${this.cursor}`);
    console.log(`Reading prevBranchBlockHash at cursor ${this.cursor}`);
    this.prevBranchBlockHash = this.readHash();
    console.log(`prevBranchBlockHash cursor after: ${this.cursor}`);
    console.log(`Reading merkleRoot at cursor ${this.cursor}`);
    this.merkleRoot = this.readHash();
    console.log(`merkleRoot cursor after: ${this.cursor}`);
    console.log(`Reading time at cursor ${this.cursor}`);
    this.time = Number(this.readInt64());
    console.log(`time: ${this.time}, cursor after time: ${this.cursor}`);
    console.log(`Reading difficultyTarget at cursor ${this.cursor}`);
    this.difficultyTarget = Number(this.readInt64());
    console.log(`difficultyTarget: ${this.difficultyTarget}, cursor after difficultyTarget: ${this.cursor}`);
    console.log(`Reading lastMiningRewardBlock at cursor ${this.cursor}`);
    this.lastMiningRewardBlock = Number(this.readInt64());
    console.log(`lastMiningRewardBlock: ${this.lastMiningRewardBlock}, cursor after lastMiningRewardBlock: ${this.cursor}`);
    // Read nonce as unsigned 32-bit integer
    console.log(`Reading nonce at cursor ${this.cursor}`);
    const nonceBytes = this.readBytes(4);
    this.nonce = nonceBytes.readUInt32LE(0);
    console.log(`nonce: ${this.nonce}, cursor after nonce: ${this.cursor}`);
    console.log(`Reading minerAddress at cursor ${this.cursor}`);
    this.minerAddress = this.readBytes(20);
    console.log(`minerAddress length: ${this.minerAddress?.length}, cursor after minerAddress: ${this.cursor}`);
    console.log(`Reading blockType at cursor ${this.cursor}`);
    const blockTypeValue = this.readUint32();
    console.log(`blockTypeValue: ${blockTypeValue}, cursor after blockType: ${this.cursor}`);
    const blockTypeKeys = Object.keys(BlockType).filter(
      (key) => typeof BlockType[key as keyof typeof BlockType] === "number"
    );
    const isValidBlockType = blockTypeKeys.some(
      (key) => BlockType[key as keyof typeof BlockType] === blockTypeValue
    );
    this.blockType = isValidBlockType
      ? (blockTypeValue as unknown as BlockType)
      : null;
    console.log(`Reading height at cursor ${this.cursor}`);
    if (this.payload) {
      console.log(`Bytes before reading height: ${this.payload.slice(this.cursor, this.cursor + 10).toString('hex')}`);
    }
    this.height = Number(this.readInt64());
    console.log(`height: ${this.height}, cursor after height: ${this.cursor}`);
    if (this.payload) {
      console.log(`Bytes at cursor ${this.cursor}: ${this.payload.slice(this.cursor, this.cursor + 5).toString('hex')}`);
    }

    if (this.payload) {
      const headerBytes = this.payload.slice(this.offset, this.cursor);
      this.hash =
        Sha256Hash.wrapReversed(Sha256Hash.hashTwice(headerBytes)) ||
        Sha256Hash.ZERO_HASH;
    }
    this.headerBytesValid = this.serializer.isParseRetainMode();
    console.log(`Parsing transactions at cursor ${this.cursor}`);
    this.parseTransactions(this.cursor);
    this.length = this.cursor - this.offset;
  }

  getOptimalEncodingMessageSize(): number {
    try {
      if (this.optimalEncodingMessageSize !== 0)
        return this.optimalEncodingMessageSize;
      this.optimalEncodingMessageSize = this.bitcoinSerialize().length;
      return this.optimalEncodingMessageSize;
    } catch (error) {
      console.error("Error in getOptimalEncodingMessageSize:", error);
      throw error;
    }
  }

  private writeHeader(stream: UnsafeByteArrayOutputStream): void {
    try {
      // Only use cached payload if it's valid and has enough data
      if (
        this.headerBytesValid &&
        this.payload &&
        this.payload.length >= this.offset + NetworkParameters.HEADER_SIZE
      ) {
        const headerBytes = this.payload.slice(
          this.offset,
          this.offset + NetworkParameters.HEADER_SIZE
        );
        // Verify that the header bytes are not empty
        if (
          headerBytes.length === NetworkParameters.HEADER_SIZE &&
          !headerBytes.every((byte) => byte === 0)
        ) {
          stream.write(headerBytes);
          return;
        }
      }

      // Ensure version is within 32-bit range
      if (this.version < 0 || this.version > 0xffffffff) {
        throw new Error(`Version out of range: ${this.version}`);
      }
      Utils.uint32ToByteStreamLE(this.version, stream);

      stream.write(this.prevBlockHash?.getReversedBytes() || Buffer.alloc(32));
      stream.write(
        this.prevBranchBlockHash?.getReversedBytes() || Buffer.alloc(32)
      );
      // Calculate merkle root if not already calculated
      const merkleRoot = this.getMerkleRoot();
      stream.write(merkleRoot.getReversedBytes());

      Utils.int64ToByteStreamLE(BigInt(this.time), stream);
      Utils.int64ToByteStreamLE(BigInt(this.difficultyTarget), stream);
      Utils.int64ToByteStreamLE(BigInt(this.lastMiningRewardBlock), stream);

      // Ensure nonce is within 32-bit range
      if (this.nonce < 0 || this.nonce > 0xffffffff) {
        throw new Error(`Nonce out of range: ${this.nonce}`);
      }
      Utils.uint32ToByteStreamLE(this.nonce, stream);

      stream.write(this.minerAddress || Buffer.alloc(20));

      // Ensure blockType is within 32-bit range
      const blockTypeValue = this.blockType?.valueOf() || 0;
      if (blockTypeValue < 0 || blockTypeValue > 0xffffffff) {
        throw new Error(`BlockType out of range: ${blockTypeValue}`);
      }
      Utils.uint32ToByteStreamLE(blockTypeValue, stream);

      Utils.int64ToByteStreamLE(BigInt(this.height), stream);
    } catch (error) {
      console.error("Error in writeHeader:", error);
      throw error;
    }
  }

  private writePoW(stream: UnsafeByteArrayOutputStream): void {
    try {
      // No PoW implementation needed for now
    } catch (error) {
      console.error("Error in writePoW:", error);
      throw error;
    }
  }

  public getLength(): number {
    try {
      return this.length;
    } catch (error) {
      console.error("Error in getLength:", error);
      throw error;
    }
  }

  private writeTransactions(stream: UnsafeByteArrayOutputStream): void {
    try {
      // Initialize transactions array if it's null
      const transactions = this.transactions || [];

      // Always serialize transactions from scratch to ensure consistency
      const varInt = new VarInt(transactions.length);
      stream.write(varInt.encode());

      for (const tx of transactions) {
        tx.bitcoinSerializeToStream(stream);
      }
    } catch (error) {
      console.error("Error in writeTransactions:", error);
      throw error;
    }
  }

  bitcoinSerialize(): Uint8Array {
    try {
      // Always serialize the block from scratch to ensure consistency
      const stream = new UnsafeByteArrayOutputStream();
      this.writeHeader(stream);
      this.writePoW(stream);
      this.writeTransactions(stream);

      // Add 8 bytes of padding at the end to match expected format
      const padding = Buffer.alloc(8);
      stream.write(padding);

      const result = stream.toByteArray();
      // If result is empty, log for debugging
      if (result.length === 0) {
        console.warn("Block serialization resulted in empty byte array");
      }
      return result;
    } catch (error) {
      console.error("Error serializing block:", error);
      throw error;
    }
  }

  public bitcoinSerializeToStream(stream: UnsafeByteArrayOutputStream): void {
    try {
      this.writeHeader(stream);
      this.writePoW(stream);
      this.writeTransactions(stream);
      
      // Add 8 bytes of padding at the end to match expected format
      const padding = Buffer.alloc(8);
      stream.write(padding);
    } catch (error) {
      console.error("Error in Block.bitcoinSerializeToStream:", error);
      throw error;
    }
  }

  private guessTransactionsLength(): number {
    try {
      if (this.transactionBytesValid && this.payload) {
        return this.payload.length - NetworkParameters.HEADER_SIZE;
      }
      if (!this.transactions) return 0;

      let len = VarInt.sizeOf(this.transactions.length);
      for (const tx of this.transactions) {
        len +=
          tx.getMessageSize() === Message.UNKNOWN_LENGTH
            ? 255
            : tx.getMessageSize();
      }
      return len;
    } catch (error) {
      console.error("Error in guessTransactionsLength:", error);
      throw error;
    }
  }

  public getParent(): Message | null {
    try {
      return this.parent;
    } catch (error) {
      console.error("Error in getParent:", error);
      throw error;
    }
  }

  public setParent(parent: Message | null): void {
    try {
      this.parent = parent;
    } catch (error) {
      console.error("Error in setParent:", error);
      throw error;
    }
  }

  private unCacheHeader(): void {
    try {
      this.headerBytesValid = false;
      this.payload = null;
      this.hash = null;
    } catch (error) {
      console.error("Error in unCacheHeader:", error);
      throw error;
    }
  }

  private unCacheTransactions(): void {
    try {
      this.transactionBytesValid = false;
      this.unCacheHeader();
      this.merkleRoot = null;
    } catch (error) {
      console.error("Error in unCacheTransactions:", error);
      throw error;
    }
  }

  private calculateHash(): Sha256Hash {
    try {
      const stream = new UnsafeByteArrayOutputStream();
      this.writeHeader(stream);
      return Sha256Hash.wrapReversed(
        Sha256Hash.hashTwice(stream.toByteArray())
      );
    } catch (error) {
      console.error("Error in calculateHash:", error);
      throw error;
    }
  }

  private calculatePoWHash(): Sha256Hash {
    try {
      const stream = new UnsafeByteArrayOutputStream();
      this.writeHeader(stream);
      return Sha256Hash.wrapReversed(
        Sha256Hash.hashTwice(stream.toByteArray())
      );
    } catch (error) {
      console.error("Error in calculatePoWHash:", error);
      throw error;
    }
  }

  getHashAsString(): string {
    return this.getHash().toString();
  }

  getHash(): Sha256Hash {
    try {
      if (!this.hash) this.hash = this.calculateHash();
      return this.hash;
    } catch (error) {
      console.error("Error in getHash:", error);
      throw error;
    }
  }

  getWork(): bigint {
    const target = this.getDifficultyTargetAsInteger();
    // Using bigInt library for mathematical operations
    return BigInt(
      bigInt(Block.LARGEST_HASH.toString())
        .divide(bigInt(target.toString()).add(bigInt(1)))
        .toString()
    );
  }

  cloneAsHeader(): Block {
    try {
      const block = new Block(this.getParams());
      this.copyBitcoinHeaderTo(block);
      return block;
    } catch (error) {
      console.error("Error in cloneAsHeader:", error);
      throw error;
    }
  }

  protected copyBitcoinHeaderTo(block: Block): void {
    try {
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
    } catch (error) {
      console.error("Error in copyBitcoinHeaderTo:", error);
      throw error;
    }
  }

  toString(): string {
    const s: string[] = [];
    s.push(`   hash: ${this.getHashAsString()}\n`);
    s.push(`   version: ${this.version}`);
    s.push(
      `   time: ${this.time} (${new Date(this.time * 1000).toISOString()})\n`
    );
    s.push(`   height: ${this.height}\n`);
    s.push(`   chain length: ${this.getLastMiningRewardBlock()}\n`);
    s.push(`   previous: ${this.getPrevBlockHash()}\n`);
    s.push(`   branch: ${this.getPrevBranchBlockHash()}\n`);
    s.push(`   merkle: ${this.getMerkleRoot()}\n`);
    s.push(`   difficulty target (nBits):    ${this.difficultyTarget}\n`);
    s.push(`   nonce: ${this.nonce}\n`);

    if (this.minerAddress) {
      const address = new Address(this.getParams(), 0, this.minerAddress);
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
        if (
          this.transactions &&
          this.transactions.length > 0 &&
          this.transactions[0]
        ) {
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
        if (
          this.transactions &&
          this.transactions.length > 0 &&
          this.transactions[0]
        ) {
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
        if (
          this.transactions &&
          this.transactions.length > 0 &&
          this.transactions[0]
        ) {
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
        if (
          this.transactions &&
          this.transactions.length > 0 &&
          this.transactions[0]
        ) {
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
        if (
          this.transactions &&
          this.transactions.length > 0 &&
          this.transactions[0]
        ) {
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

    return s.join("");
  }

  solve(target: bigint): void {
    // Add randomness to prevent new empty blocks from same miner with same approved blocks to be the same
    // Ensure nonce is within 32-bit range
    this.setNonce(Math.floor(Math.random() * 0xffffffff));

    while (true) {
      try {
        if (this.checkProofOfWorkWithTarget(false, target)) return;

        this.setNonce(this.getNonce() + 1);
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
        // Allow zero target for genesis block or when target is valid
        if (!target) {
            // For genesis block, return a valid target
            if (this.getBlockType() === BlockType.BLOCKTYPE_INITIAL) {
                return 0n;
            }
            throw new VerificationException.DifficultyTargetException();
        }
        if (target < 0n) {
            throw new VerificationException.DifficultyTargetException();
        }
        // For non-genesis blocks, validate against max target
        if (this.getBlockType() !== BlockType.BLOCKTYPE_INITIAL && target > this.getParams().getMaxTarget()) {
            throw new VerificationException.DifficultyTargetException();
        }
        return target;
    }

  checkProofOfWork(throwException: boolean): boolean {
    return this.checkProofOfWorkWithTarget(
      throwException,
      this.getDifficultyTargetAsInteger()
    );
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
    // Compare the stored Merkle root (which is in natural order) with the calculated one (also in natural order)
    if (this.merkleRoot && !calculatedRoot.equals(this.merkleRoot)) {
      throw new VerificationException.MerkleRootMismatchException();
    }
  }


  private calculateMerkleRoot(): Sha256Hash {
    try {
      // If there are no transactions, return zero hash
      if (!this.transactions || this.transactions.length === 0) {
        return Sha256Hash.ZERO_HASH;
      }

      // Filter out any null or undefined transactions before mapping
      const validTransactions = this.transactions.filter(
        (tx) => tx !== null && tx !== undefined
      );

      // If there are no valid transactions, return zero hash
      if (validTransactions.length === 0) {
        return Sha256Hash.ZERO_HASH;
      }

      // Start with the NATURAL hashes of all valid transactions
      let hashes: Buffer[] = validTransactions.map((tx) => {
        return tx.getHash().getBytes();
      });

      // Log the initial transaction hashes
      console.log(`Merkle calculation: ${validTransactions.length} transactions`);
      for (let i = 0; i < validTransactions.length; i++) {
        console.log(`  TX${i}: ${validTransactions[i].getHash().toString()}`);
      }

      // Build the merkle tree by repeatedly hashing pairs
      let level = 0;
      while (hashes.length > 1) {
        level++;
        const newHashes: Buffer[] = [];
        console.log(`Building level ${level} with ${hashes.length} hashes`);

        // Process pairs of hashes
        for (let i = 0; i < hashes.length; i += 2) {
          const left = hashes[i];
          const right = i + 1 < hashes.length ? hashes[i + 1] : left; // Duplicate last if odd
          console.log(`  Pair ${i/2}: ${left.toString('hex')} + ${right.toString('hex')}`);

          // Concatenate the two hashes
          const concat = Buffer.concat([left, right]);

          // Hash the concatenation twice
          const hash = Sha256Hash.hashTwice(concat);
          console.log(`    Hash: ${hash.toString('hex')}`);
          newHashes.push(hash);
        }

        hashes = newHashes;
      }

      // The final hash is the merkle root in NATURAL order
      const merkleRoot = Sha256Hash.wrap(hashes[0]);
      console.log(`Calculated Merkle root: ${merkleRoot.toString()}`);
      return merkleRoot;
    } catch (error) {
      console.error("Error in calculateMerkleRoot:", error);
      throw error;
    }
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
    return (
      this.getHash().equals(otherBlock.getHash()) &&
      this.version === otherBlock.version &&
      (this.prevBlockHash
        ? this.prevBlockHash.equals(otherBlock.prevBlockHash!)
        : otherBlock.prevBlockHash === null) &&
      (this.prevBranchBlockHash
        ? this.prevBranchBlockHash.equals(otherBlock.prevBranchBlockHash!)
        : otherBlock.prevBranchBlockHash === null) &&
      (this.merkleRoot
        ? this.merkleRoot.equals(otherBlock.merkleRoot!)
        : otherBlock.merkleRoot === null) &&
      this.time === otherBlock.time &&
      this.difficultyTarget === otherBlock.difficultyTarget &&
      this.lastMiningRewardBlock === otherBlock.lastMiningRewardBlock &&
      this.nonce === otherBlock.nonce &&
      (this.minerAddress
        ? this.minerAddress.equals(otherBlock.minerAddress!)
        : otherBlock.minerAddress === null) &&
      this.blockType === otherBlock.blockType &&
      this.height === otherBlock.height
    );
  }

  hashCode(): number {
    return this.getHash().hashCode();
  }

  getMerkleRoot(): Sha256Hash {
    try {
      // If we have a stored merkle root, return it
      if (this.merkleRoot) {
        return this.merkleRoot;
      }
      // Otherwise calculate it
      return this.calculateMerkleRoot();
    } catch (error) {
      console.error("Error in getMerkleRoot:", error);
      throw error;
    }
  }

  setMerkleRoot(value: Sha256Hash): void {
    this.unCacheHeader();
    this.merkleRoot = value;
    this.hash = null;
  }

  addTransaction(t: Transaction): void {
    try {
      this.unCacheTransactions();
      if (!this.transactions) {
        this.transactions = [];
      }
      t.setParent(this);
      this.transactions.push(t);
      this.adjustLength(this.transactions.length, t.getMessageSize());
      this.merkleRoot = null;
      this.hash = null;
    } catch (error) {
      console.error("Error in addTransaction:", error);
      throw error;
    }
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
    if (nonce < 0 || nonce > 0xffffffff) {
      throw new Error(`Nonce out of range: ${nonce}`);
    }
    this.unCacheHeader();
    this.nonce = nonce;
    this.hash = null;
  }

  getTransactions(): Transaction[] {
    try {
      return this.transactions || [];
    } catch (error) {
      console.error("Error in getTransactions:", error);
      throw error;
    }
  }

  addCoinbaseTransaction(
    pubKeyTo: Buffer,
    value: Coin,
    tokenInfo: TokenInfo | null,
    memoInfo: MemoInfo | null
  ): void {
    try {
      this.unCacheTransactions();
      this.transactions = [];

      const coinbase = new Transaction(this.getParams());
      if (tokenInfo !== null) {
        coinbase.setDataClassName(DataClassName.TOKEN);
        const buf = tokenInfo.toByteArray();
        coinbase.setData(Buffer.from(buf));
      }
      coinbase.setMemo(memoInfo);

      const inputBuilder = new ScriptBuilder();
      inputBuilder.data(
        Buffer.from([txCounter & 0xff, (txCounter >> 8) & 0xff])
      );
      txCounter++;

      coinbase.addInput(
          TransactionInput.fromOutpoint(
          this.getParams(),
          coinbase,
          Buffer.from(inputBuilder.build().getProgram()),
          new TransactionOutPoint(
            this.getParams(),
            0,
            Sha256Hash.ZERO_HASH,
            Sha256Hash.ZERO_HASH
          )
        )
      );

      if (tokenInfo === null) {
        coinbase.addOutput(
          new TransactionOutput(
            this.getParams(),
            coinbase,
            value,
            Buffer.from(
              ScriptBuilder.createOutputScript(
                ECKey.fromPublic(pubKeyTo)
              ).getProgram()
            )
          )
        );
      } else {
        if (
          tokenInfo.getToken() === null ||
          tokenInfo.getToken()?.getSignnumber() === 0
        ) {
          coinbase.addOutput(
            new TransactionOutput(
              this.getParams(),
              coinbase,
              value,
              Buffer.from(
                ScriptBuilder.createOutputScript(
                  ECKey.fromPublic(pubKeyTo)
                ).getProgram()
              )
            )
          );
        } else {
          const keys: ECKey[] = [];
          for (const multiSignAddress of tokenInfo.getMultiSignAddresses()) {
            if (multiSignAddress.getTokenHolder() === 1) {
              const pubKeyHex = multiSignAddress.getPubKeyHex();
              if (pubKeyHex !== null) {
                const ecKey = ECKey.fromPublic(
                  BaseEncoding.base16().lowerCase().decode(pubKeyHex)
                );
                keys.push(ecKey);
              }
            }
          }

          if (keys.length <= 1) {
            coinbase.addOutput(
              new TransactionOutput(
                this.getParams(),
                coinbase,
                value,
                Buffer.from(
                  ScriptBuilder.createOutputScript(
                    ECKey.fromPublic(pubKeyTo)
                  ).getProgram()
                )
              )
            );
          } else {
            const n = keys.length;
            const scriptPubKey = ScriptBuilder.createMultiSigOutputScript(
              n,
              keys
            );
            coinbase.addOutput(
              new TransactionOutput(
                this.getParams(),
                coinbase,
                value,
                Buffer.from(scriptPubKey.getProgram())
              )
            );
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
    } catch (error) {
      console.error("Error in addCoinbaseTransaction:", error);
      throw error;
    }
  }

  allowCoinbaseTransaction(): boolean {
    return true; // Simplified implementation
  }

  hasTransactions(): boolean {
    try {
      return this.transactions !== null && this.transactions.length > 0;
    } catch (error) {
      console.error("Error in hasTransactions:", error);
      throw error;
    }
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
    if (typeof blocktype === "number") {
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
