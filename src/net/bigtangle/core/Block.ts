import { NetworkParameters } from "../params/NetworkParameters";
import { Transaction } from "./Transaction";
import { Message } from "./Message";
import { Sha256Hash } from "./Sha256Hash";
import { BlockType, allowCoinbaseTransaction, getMaxBlockSize } from "./BlockType";
import { Utils } from "./Utils";
import { Utils as UtilsCore } from "../utils/Utils";
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
  private static readonly LARGEST_HASH = bigInt(1).shiftLeft(256);

  // Fields defined as part of the protocol format.
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

  constructor(params: NetworkParameters, setVersion?: number);
  constructor(
    params: NetworkParameters,
    prevBlockHash: Sha256Hash,
    prevBranchBlockHash: Sha256Hash,
    blocktype: number,
    minTime: number,
    lastMiningRewardBlock: number,
    difficultyTarget: number
  );
  constructor(
    params: NetworkParameters,
    payloadBytes: Buffer,
    serializer: MessageSerializer<any>,
    length: number
  );
  constructor(
    params: NetworkParameters,
    payloadBytes: Buffer,
    offset: number,
    serializer: MessageSerializer<any>,
    length: number
  );
  constructor(
    params: NetworkParameters,
    payloadBytes: Buffer,
    offset: number,
    parent: Message | null,
    serializer: MessageSerializer<any>,
    length: number
  );
  constructor(...args: any[]) {
    super(args[0]);
    
    if (args.length === 2 && typeof args[1] === "number") {
      // Constructor: Block(NetworkParameters params, long setVersion)
      const params = args[0];
      this.version = NetworkParameters.BLOCK_VERSION_GENESIS;
      this.difficultyTarget = Utils.encodeCompactBits(params.getMaxTarget());
      this.lastMiningRewardBlock = 0;
      this.time = Math.floor(Date.now() / 1000);
      this.prevBlockHash = Sha256Hash.ZERO_HASH;
      this.prevBranchBlockHash = Sha256Hash.ZERO_HASH;
      this.blockType = BlockType.BLOCKTYPE_TRANSFER;
      this.minerAddress = Buffer.alloc(20);
      this.length = NetworkParameters.HEADER_SIZE;
      this.transactions = [];
    } else if (args.length === 7 && args[1] instanceof Sha256Hash) {
      // Constructor: Block(NetworkParameters params, Sha256Hash prevBlockHash, Sha256Hash prevBranchBlockHash, int blocktype, long minTime, long lastMiningRewardBlock, long difficultyTarget)
      const params = args[0];
      const prevBlockHash = args[1];
      const prevBranchBlockHash = args[2];
      const blocktype = args[3];
      const minTime = args[4];
      const lastMiningRewardBlock = args[5];
      const difficultyTarget = args[6];
      
      // Set up a few basic things. We are not complete after this though.
      this.version = NetworkParameters.BLOCK_VERSION_GENESIS;
      this.difficultyTarget = difficultyTarget;
      this.lastMiningRewardBlock = lastMiningRewardBlock;
      this.time = Math.floor(Date.now() / 1000);
      if (this.time < minTime) this.time = minTime;
      this.prevBlockHash = prevBlockHash;
      this.prevBranchBlockHash = prevBranchBlockHash;
      this.blockType = blocktype;
      this.minerAddress = Buffer.alloc(20);
      this.length = NetworkParameters.HEADER_SIZE;
      this.transactions = [];
    } else if (args.length === 4 || args.length === 5 || args.length === 6) {
      // Constructor for deserialization
      const params = args[0];
      const payloadBytes = args[1];
      const offset = args.length >= 4 ? args[2] : 0;
      const parent = args.length === 6 ? args[3] : null;
      const serializer = args.length >= 5 ? (args.length === 6 ? args[4] : args[3]) : params.getDefaultSerializer();
      const length = args.length >= 5 ? (args.length === 6 ? args[5] : args[4]) : Message.UNKNOWN_LENGTH;
      
      this.payload = Buffer.from(payloadBytes);
      this.offset = offset;
      this.parent = parent;
      this.serializer = serializer;
      this.length = length;
      
      this.parse();
      
      if (this.length === Message.UNKNOWN_LENGTH) {
        throw new Error(`Length field has not been set in constructor for ${this.constructor.name} after parse.`);
      }
      
      if (!serializer.isParseRetainMode()) {
        this.payload = null;
      }
    } else {
      // Default constructor - initialize all fields to default values
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

  static createBlock(
    networkParameters: NetworkParameters,
    r1: Block,
    r2: Block
  ): Block {
    const block = new Block(networkParameters, 1);
    block.setPrevBlockHash(r1.getHash());
    block.setPrevBranchBlockHash(r2.getHash());
    block.setTime(Math.max(r1.getTimeSeconds(), r2.getTimeSeconds()));
    block.setLastMiningRewardBlock(
      Math.max(r1.getLastMiningRewardBlock(), r2.getLastMiningRewardBlock())
    );
    block.setDifficultyTarget(
      r1.getLastMiningRewardBlock() > r2.getLastMiningRewardBlock()
        ? r1.getDifficultyTarget()
        : r2.getDifficultyTarget()
    );
    block.setBlockType(BlockType.BLOCKTYPE_TRANSFER);
    block.setHeight(Math.max(r1.getHeight(), r2.getHeight()) + 1);
    return block;
  }

  isBLOCKTYPE_INITIAL(): boolean {
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
    this.optimalEncodingMessageSize = NetworkParameters.HEADER_SIZE;
    
    if (!this.payload || this.payload.length === this.cursor) {
      // This message is just a header, it has no transactions.
      this.transactionBytesValid = false;
      return;
    }

    const numTransactions = this.readVarInt();
    this.optimalEncodingMessageSize += VarInt.sizeOf(numTransactions);
    this.transactions = [];
    
    for (let i = 0; i < Number(numTransactions); i++) {
      const tx = new Transaction(
        this.params!,
        this.payload,
        this.cursor,
        null,
        this.serializer,
        Message.UNKNOWN_LENGTH
      );
      this.transactions.push(tx);
      const txMessageSize = tx.getMessageSize();
      this.cursor += txMessageSize;
      this.optimalEncodingMessageSize += tx.getOptimalEncodingMessageSize();
    }
    
    this.transactionBytesValid = this.serializer.isParseRetainMode();
  }

  protected parse(): void {
    // header
    this.cursor = this.offset;
    this.version = this.readUint32();
    this.prevBlockHash = this.readHash();
    this.prevBranchBlockHash = this.readHash();
    this.merkleRoot = this.readHash();
    this.time = Number(this.readInt64());
    this.difficultyTarget = Number(this.readInt64());
    this.lastMiningRewardBlock = Number(this.readInt64());
    this.nonce = this.readUint32();
    this.minerAddress = this.readBytes(20);
    const blockTypeValue = this.readUint32();
    // Safely convert the numeric value to BlockType enum
    this.blockType = blockTypeValue in BlockType ? blockTypeValue : BlockType.BLOCKTYPE_TRANSFER;
    this.height = Number(this.readInt64());
    
    const headerBytes = this.payload!.slice(this.offset, this.cursor);
    this.hash = Sha256Hash.wrapReversed(Sha256Hash.hashTwice(headerBytes));
    this.headerBytesValid = this.serializer.isParseRetainMode();
    
    // transactions
    this.parseTransactions(this.cursor);
    this.length = this.cursor - this.offset;
  }

  getOptimalEncodingMessageSize(): number {
    if (this.optimalEncodingMessageSize !== 0)
      return this.optimalEncodingMessageSize;
    this.optimalEncodingMessageSize = this.bitcoinSerialize().length;
    return this.optimalEncodingMessageSize;
  }

  // default for testing
  private writeHeader(stream: UnsafeByteArrayOutputStream): void {
    // try for cached write first
    if (
      this.headerBytesValid &&
      this.payload &&
      this.payload.length >= this.offset + NetworkParameters.HEADER_SIZE
    ) {
      const headerBytes = this.payload.slice(
        this.offset,
        this.offset + NetworkParameters.HEADER_SIZE
      );
      stream.write(headerBytes);
      return;
    }

    // fall back to manual write
    UtilsCore.uint32ToByteStreamLE(this.version, stream);
    stream.write(this.prevBlockHash?.getReversedBytes() || Buffer.alloc(32));
    stream.write(this.prevBranchBlockHash?.getReversedBytes() || Buffer.alloc(32));
    stream.write(this.getMerkleRoot().getReversedBytes());
    Utils.int64ToByteStreamLE(BigInt(this.time), stream);
    Utils.int64ToByteStreamLE(BigInt(this.difficultyTarget), stream);
    Utils.int64ToByteStreamLE(BigInt(this.lastMiningRewardBlock), stream);
    UtilsCore.uint32ToByteStreamLE(this.nonce, stream);
    stream.write(this.minerAddress || Buffer.alloc(20));
    UtilsCore.uint32ToByteStreamLE(this.blockType || 0, stream);
    Utils.int64ToByteStreamLE(BigInt(this.height), stream);
  }

  private writePoW(stream: UnsafeByteArrayOutputStream): void {
    // No PoW implementation needed for now
  }

  private writeTransactions(stream: UnsafeByteArrayOutputStream): void {
    // check for no transaction conditions first
    // must be a more efficient way to do this but I'm tired atm.
    if (!this.transactions) {
      return;
    }

    // confirmed we must have transactions either cached or as objects.
    if (
      this.transactionBytesValid &&
      this.payload &&
      this.payload.length >= this.offset + this.length
    ) {
      stream.write(
        this.payload.slice(
          this.offset + NetworkParameters.HEADER_SIZE,
          this.offset + this.length
        )
      );
      return;
    }

    stream.write(new VarInt(this.transactions.length).encode());
    for (const tx of this.transactions) {
      tx.bitcoinSerializeToStream(stream);
    }
  }

  /**
   * Special handling to check if we have a valid byte array for both header and
   * transactions
   */
  bitcoinSerialize(): Buffer {
    // we have completely cached byte array.
    if (this.headerBytesValid && this.transactionBytesValid) {
      if (this.payload) {
        if (this.length === this.payload.length) {
          return this.payload;
        } else {
          // byte array is offset so copy out the correct range.
          const buf = Buffer.alloc(this.length);
          this.payload.copy(buf, 0, this.offset, this.offset + this.length);
          return buf;
        }
      }
    }

    // At least one of the two cacheable components is invalid
    // so fall back to stream write since we can't be sure of the length.
    const stream = new UnsafeByteArrayOutputStream(
      this.length === Message.UNKNOWN_LENGTH
        ? NetworkParameters.HEADER_SIZE + this.guessTransactionsLength()
        : this.length
    );
    this.writeHeader(stream);
    this.writePoW(stream);
    this.writeTransactions(stream);
    
    return stream.toByteArray();
  }

  bitcoinSerializeToStream(stream: UnsafeByteArrayOutputStream): void {
    this.writeHeader(stream);
    this.writePoW(stream);
    // We may only have enough data to write the header and PoW.
    this.writeTransactions(stream);
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
    if (!this.transactions) return 0;
    let len = VarInt.sizeOf(this.transactions.length);
    for (const tx of this.transactions) {
      len +=
        tx.getMessageSize() === Message.UNKNOWN_LENGTH
          ? 255
          : tx.getMessageSize();
    }
    return len;
  }

  public unCache(): void {
    // Since we have alternate uncache methods to use internally this will
    // only ever be called by a child
    // transaction so we only need to invalidate that part of the cache.
    this.unCacheTransactions();
  }

  private unCacheHeader(): void {
    this.headerBytesValid = false;
    if (!this.transactionBytesValid) this.payload = null;
    this.hash = null;
  }

  private unCacheTransactions(): void {
    this.transactionBytesValid = false;
    if (!this.headerBytesValid) this.payload = null;
    // Current implementation has to uncache headers as well as any change
    // to a tx will alter the merkle root. In
    // future we can go more granular and cache merkle root separately so
    // rest of the header does not need to be
    // rewritten.
    this.unCacheHeader();
    // Clear merkleRoot last as it may end up being parsed during
    // unCacheHeader().
    this.merkleRoot = null;
  }

  /**
   * Calculates the block hash by serializing the block and hashing the resulting
   * bytes.
   */
  private calculateHash(): Sha256Hash {
    const stream = new UnsafeByteArrayOutputStream(NetworkParameters.HEADER_SIZE);
    this.writeHeader(stream);
    return Sha256Hash.wrapReversed(Sha256Hash.hashTwice(stream.toByteArray()));
  }

  /**
   * Calculates the hash relevant for PoW difficulty checks.
   */
  private calculatePoWHash(): Sha256Hash {
    const stream = new UnsafeByteArrayOutputStream(NetworkParameters.HEADER_SIZE);
    this.writeHeader(stream);
    return Sha256Hash.wrapReversed(Sha256Hash.hashTwice(stream.toByteArray()));
  }

  /**
   * Returns the hash of the block (which for a valid, solved block should be
   * below the target) in the form seen on the block explorer. If you call this on
   * block 1 in the mainnet chain you will get
   * "00000000839a8e6886ab5951d76f411475428afc90947ee320161bbf18eb6048".
   */
  getHashAsString(): string {
    return this.getHash().toString();
  }

  /**
   * Returns the hash of the block (which for a valid, solved block should be
   * below the target). Big endian.
   */
  getHash(): Sha256Hash {
    if (!this.hash) this.hash = this.calculateHash();
    return this.hash;
  }

  /**
   * Returns the work represented by this block.
   * <p>
   *
   * Work is defined as the number of tries needed to solve a block in the average
   * case. Consider a difficulty target that covers 5% of all possible hash
   * values. Then the work of the block will be 20. As the target gets lower, the
   * amount of work goes up.
   */
  getWork(): bigInt.BigInteger {
    const target = this.getDifficultyTargetAsInteger();
    return Block.LARGEST_HASH.divide(target.add(bigInt(1)));
  }

  /** Returns a copy of the block */
  cloneAsHeader(): Block {
    const block = new Block(this.params!, 1);
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
      try {
        const address = new Address(this.params!, 0, this.minerAddress);
        s.push(`   mineraddress: ${address}\n`);
      } catch (e) {
        s.push(`   mineraddress: ${this.minerAddress.toString('hex')}\n`);
      }
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
          if (data) {
            const rewardInfo = new RewardInfo().parse(data);
            s.push(rewardInfo.toString());
          }
        }
      } catch (e) {
        // ignore
      }
    }
    
    if (this.blockType === BlockType.BLOCKTYPE_ORDER_OPEN) {
      try {
        if (this.transactions && this.transactions.length > 0 && this.transactions[0]) {
          const data = this.transactions[0].getData();
          if (data) {
            const info = new OrderOpenInfo().parse(data);
            s.push(info.toString());
          }
        }
      } catch (e) {
        // ignore
      }
    }
    
    if (this.blockType === BlockType.BLOCKTYPE_TOKEN_CREATION) {
      try {
        if (this.transactions && this.transactions.length > 0 && this.transactions[0]) {
          const data = this.transactions[0].getData();
          if (data) {
            const info = new TokenInfo().parse(data);
            s.push(info.toString());
          }
        }
      } catch (e) {
        // ignore
      }
    }
    
    if (this.blockType === BlockType.BLOCKTYPE_CONTRACT_EXECUTE) {
      try {
        if (this.transactions && this.transactions.length > 0 && this.transactions[0]) {
          const data = this.transactions[0].getData();
          if (data) {
            const info = new ContractExecutionResult().parse(data);
            s.push(info.toString());
          }
        }
      } catch (e) {
        // ignore
      }
    }
    
    if (this.blockType === BlockType.BLOCKTYPE_ORDER_EXECUTE) {
      try {
        if (this.transactions && this.transactions.length > 0 && this.transactions[0]) {
          const data = this.transactions[0].getData();
          if (data) {
            const info = new OrderExecutionResult().parse(data);
            s.push(info.toString());
          }
        }
      } catch (e) {
        // ignore
      }
    }
    
    return s.join("");
  }

  /**
   * <p>
   * Finds a value of nonce and equihashProof if using Equihash that validates
   * correctly.
   */
  solve(target: bigInt.BigInteger): void {
    // Add randomness to prevent new empty blocks from same miner with same
    // approved blocks to be the same
    this.setNonce(Math.floor(Math.random() * 0xFFFFFFFF));
    
    while (true) {
      try {
        // Is our proof of work valid yet?
        if (this.checkProofOfWorkWithTarget(false, target))
          return;
        
        // No, so increment the nonce and try again.
        this.setNonce(this.getNonce() + 1);
      } catch (e) {
        throw new Error(`Unexpected error during block solving: ${e}`);
      }
    }
  }

  /**
   * <p>
   * Finds a value of nonce and equihashProof if using Equihash that validates
   * correctly.
   */
  solveWithoutTarget(): void {
    this.solve(this.getDifficultyTargetAsInteger());
  }

  /**
   * Returns the difficulty target as a 256 bit value that can be compared to a
   * SHA-256 hash. Inside a block the target is represented using a compact form.
   * If this form decodes to a value that is out of bounds, an exception is
   * thrown.
   */
  getDifficultyTargetAsInteger(): bigInt.BigInteger {
    const target = UtilsCore.decodeCompactBits(this.difficultyTarget);
    if (target.isNegative() || target.greater(bigInt(this.params!.getMaxTarget().toString(16), 16)))
      throw new VerificationException.DifficultyTargetException();
    return target;
  }

  /**
   * Returns true if the PoW of the block is OK
   */
  checkProofOfWork(throwException: boolean): boolean {
    return this.checkProofOfWorkWithTarget(
      throwException,
      this.getDifficultyTargetAsInteger()
    );
  }

  /**
   * Returns true if the PoW of the block is OK
   */
  checkProofOfWorkWithTarget(throwException: boolean, target: bigInt.BigInteger): boolean {
    // No PoW for genesis block
    if (this.getBlockType() === BlockType.BLOCKTYPE_INITIAL) {
      return true;
    }

    // This part is key - it is what proves the block was as difficult to
    // make as it claims to be. Note however that in the context of this function,
    // the block can claim to be as difficult as it wants to be .... if somebody was able to take
    // control of our network connection and fork us onto a different chain, they could send us
    // valid blocks with ridiculously easy difficulty and this function would accept them.
    //
    // To prevent this attack from being possible, elsewhere we check that the difficultyTarget
    // field is of the right value. This requires us to have the preceeding blocks.

    const h = bigInt(this.calculatePoWHash().toString(), 16);

    if (h.greater(target)) {
      // Proof of work check failed!
      if (throwException)
        throw new VerificationException.ProofOfWorkException();
      else
        return false;
    }

    return true;
  }

  private checkTimestamp(): void {
    // Allow injection of a fake clock to allow unit testing.
    const currentTime = Math.floor(Date.now() / 1000);
    if (this.time > currentTime + NetworkParameters.ALLOWED_TIME_DRIFT)
      throw new VerificationException.TimeTravelerException();
  }

  private checkSigOps(): void {
    // Check there aren't too many signature verifications in the block.
    // This is an anti-DoS measure, see the comments for MAX_BLOCK_SIGOPS.
    let sigOps = 0;
    if (!this.transactions) return;
    for (const tx of this.transactions) {
      sigOps += tx.getSigOpCount();
    }
    if (sigOps > NetworkParameters.MAX_BLOCK_SIGOPS)
      throw new VerificationException.SigOpsException();
  }

  private checkMerkleRoot(): void {
    const calculatedRoot = this.calculateMerkleRoot();
    if (this.merkleRoot && !calculatedRoot.equals(this.merkleRoot)) {
      throw new VerificationException.MerkleRootMismatchException();
    }
  }

  private calculateMerkleRoot(): Sha256Hash {
    // The Merkle root is based on a tree of hashes calculated from the transactions:
    //
    //     root
    //    /  \
    //   A    B
    //  / \  / \
    // t1 t2 t3 t4
    //
    // The tree is represented as a list: t1,t2,t3,t4,A,B,root where each entry is a hash.
    //
    // The hashing algorithm is double SHA-256. The leaves are a hash of the serialized contents of the transaction.
    // The interior nodes are hashes of the concenation of the two child hashes.
    //
    // This structure allows the creation of proof that a transaction was included into a block without having to
    // provide the full block contents. Instead, you can provide only a Merkle branch. For example to prove tx2 was
    // in a block you can just provide tx2, the hash(tx1) and B. Now the other party has everything they need to
    // derive the root, which can be checked against the block header. These proofs aren't used right now but
    // will be helpful later when we want to download partial block contents.
    //
    // Note that if the number of transactions is not even the last tx is repeated to make it so (see
    // tx3 above). A tree with 5 transactions would look like this:
    //
    //        root
    //       /  \
    //      1    5
    //     / \  / \
    //    2  3 4   4
    //   / \/ \/ \ / \
    //  t1 t2 t3 t4 t5 t5
    
    if (!this.transactions || this.transactions.length === 0)
      return Sha256Hash.ZERO_HASH;
    
    // Start by adding all the hashes of the transactions as leaves of the tree.
    const tree: Buffer[] = [];
    for (const t of this.transactions) {
      tree.push(t.getHash().getBytes());
    }
    
    let levelOffset = 0; // Offset in the list where the currently processed level starts.
    // Step through each level, stopping when we reach the root (levelSize == 1).
    for (let levelSize = this.transactions.length; levelSize > 1; levelSize = Math.floor((levelSize + 1) / 2)) {
      // For each pair of nodes on that level:
      for (let left = 0; left < levelSize; left += 2) {
        // The right hand node can be the same as the left hand, in the case where we don't have enough
        // transactions.
        const right = Math.min(left + 1, levelSize - 1);
        const leftBytes = Utils.reverseBytes(tree[levelOffset + left]);
        const rightBytes = Utils.reverseBytes(tree[levelOffset + right]);
        tree.push(
          Utils.reverseBytes(
            Sha256Hash.hashTwiceRanges(
              leftBytes, 0, 32,
              rightBytes, 0, 32
            )
          )
        );
      }
      // Move to the next level.
      levelOffset += levelSize;
    }
    
    return Sha256Hash.wrap(tree[tree.length - 1]);
  }

  /**
   * Checks the block data to ensure it follows the rules laid out in the network
   * parameters. Specifically, throws an exception if the proof of work is
   * invalid, or if the timestamp is too far from what it should be. This is
   * <b>not</b> everything that is required for a block to be valid, only what is
   * checkable independent of the chain and without a transaction index.
   */
  verifyHeader(): void {
    // Prove that this block is OK. It might seem that we can just ignore
    // most of these checks given that the
    // network is also verifying the blocks, but we cannot as it'd open us
    // to a variety of obscure attacks.
    //
    // Firstly we need to ensure this block does in fact represent real work
    // done. If the difficulty is high
    // enough, it's probably been done by the network.
    this.checkProofOfWork(true);
    this.checkTimestamp();
  }

  /**
   * Checks the block contents formally
   *
   * @throws VerificationException if there was an error verifying the block.
   */
  verifyTransactions(): void {
    // Now we need to check that the body of the block actually matches the
    // headers. The network won't generate
    // an invalid block, but if we didn't validate this then an untrusted
    // man-in-the-middle could obtain the next
    // valid block from the network and simply replace the transactions in
    // it with their own fictional
    // transactions that reference spent or non-existant inputs.
    // if (transactions.isEmpty())
    // throw new VerificationException("Block had no transactions");
    if (this.getOptimalEncodingMessageSize() > this.getMaxBlockSize())
      throw new VerificationException.LargerThanMaxBlockSize();
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
    return this.blockType ? getMaxBlockSize(this.blockType) : NetworkParameters.MAX_DEFAULT_BLOCK_SIZE;
  }

  /**
   * Verifies both the header and that the transactions hash to the merkle root.
   */
  verify(): void {
    this.verifyHeader();
    this.verifyTransactions();
  }

  equals(other: any): boolean {
    if (this === other) return true;
    if (!(other instanceof Block)) return false;
    return this.getHash().equals(other.getHash());
  }

  hashCode(): number {
    return this.getHash().hashCode();
  }

  /**
   * Returns the merkle root in big endian form, calculating it from transactions
   * if necessary.
   */
  getMerkleRoot(): Sha256Hash {
    if (!this.merkleRoot) {
      this.unCacheHeader();
      this.merkleRoot = this.calculateMerkleRoot();
    }
    return this.merkleRoot;
  }

  /** Exists only for unit testing. */
  setMerkleRoot(value: Sha256Hash): void {
    this.unCacheHeader();
    this.merkleRoot = value;
    this.hash = null;
  }

  /**
   * Adds a transaction to this block. The nonce and merkle root are invalid after
   * this.
   */
  addTransaction(t: Transaction): void {
    this.unCacheTransactions();
    if (!this.transactions) {
      this.transactions = [];
    }
    t.setParent(this);
    this.transactions.push(t);
    this.adjustLength(this.transactions.length, t.getMessageSize());
    // Force a recalculation next time the values are needed.
    this.merkleRoot = null;
    this.hash = null;
  }

  /**
   * Returns the version of the block data structure as defined by the Bitcoin
   * protocol.
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * Returns the hash of the previous trunk block in the chain, as defined by the
   * block header.
   */
  getPrevBlockHash(): Sha256Hash {
    return this.prevBlockHash!;
  }

  setPrevBlockHash(prevBlockHash: Sha256Hash): void {
    this.unCacheHeader();
    this.prevBlockHash = prevBlockHash;
    this.hash = null;
  }

  /**
   * Returns the hash of the previous branch block in the chain, as defined by the
   * block header.
   */
  getPrevBranchBlockHash(): Sha256Hash {
    return this.prevBranchBlockHash!;
  }

  setPrevBranchBlockHash(prevBranchBlockHash: Sha256Hash): void {
    this.unCacheHeader();
    this.prevBranchBlockHash = prevBranchBlockHash;
    this.hash = null;
  }

  /**
   * Returns the time at which the block was solved and broadcast, according to
   * the clock of the solving node. This is measured in seconds since the UNIX
   * epoch (midnight Jan 1st 1970).
   */
  getTimeSeconds(): number {
    return this.time;
  }

  /**
   * Returns the time at which the block was solved and broadcast, according to
   * the clock of the solving node.
   */
  getTime(): Date {
    return new Date(this.time * 1000);
  }

  setTime(time: number): void {
    this.unCacheHeader();
    this.time = time;
    this.hash = null;
  }

  /**
   * Returns the nonce, an arbitrary value that exists only to make the hash of
   * the block header fall below the difficulty target.
   */
  getNonce(): number {
    return this.nonce;
  }

  /** Sets the nonce and clears any cached data. */
  setNonce(nonce: number): void {
    this.unCacheHeader();
    this.nonce = nonce;
    this.hash = null;
  }

  /**
   * Returns an immutable list of transactions held in this block, or null if this
   * object represents just a header.
   */
  getTransactions(): Transaction[] {
    return this.transactions ? [...this.transactions] : [];
  }

  addCoinbaseTransaction(
    pubKeyTo: Buffer,
    value: Coin,
    tokenInfo: TokenInfo | null,
    memoInfo: MemoInfo | null
  ): void {
    this.unCacheTransactions();
    this.transactions = [];

    const coinbase = new Transaction(this.params!);
    if (tokenInfo !== null) {
      coinbase.setDataClassName(DataClassName.TOKEN);
      const buf = tokenInfo.toByteArray();
      coinbase.setData(Buffer.from(buf));
    }
    coinbase.setMemo(memoInfo);

    const inputBuilder = new ScriptBuilder();
    // Use txCounter to make transactions unique
    inputBuilder.data(
      Buffer.from([txCounter & 0xff, (txCounter >> 8) & 0xff])
    );
    txCounter++;

    coinbase.addInput(
      TransactionInput.fromOutpoint(
        this.params!,
        coinbase,
        Buffer.from(inputBuilder.build().getProgram()),
        new TransactionOutPoint(
          this.params!,
          0,
          Sha256Hash.ZERO_HASH,
          Sha256Hash.ZERO_HASH
        )
      )
    );

    if (tokenInfo === null) {
      coinbase.addOutput(
        new TransactionOutput(
          this.params!,
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
            this.params!,
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
              this.params!,
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
              this.params!,
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
    const coinbaseLength = coinbase.unsafeBitcoinSerialize().length;
    this.adjustLength(this.transactions.length, coinbaseLength);
  }

  allowCoinbaseTransaction(): boolean {
    return this.blockType ? allowCoinbaseTransaction(this.blockType) : true;
  }

  /**
   * Return whether this block contains any transactions.
   * 
   * @return true if the block contains transactions, false otherwise (is purely a
   *         header).
   */
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
    if (typeof blocktype === "number") {
      // Safely convert the numeric value to BlockType enum
      this.blockType = blocktype in BlockType ? blocktype : BlockType.BLOCKTYPE_TRANSFER;
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

  static fromPayloadWithOffsetAndParent(
    params: NetworkParameters,
    payloadBytes: Buffer,
    offset: number,
    parent: Message | null,
    serializer: MessageSerializer<any>,
    length: number
  ): Block {
    const block = new Block(params);
    block.payload = Buffer.from(payloadBytes);
    block.offset = offset;
    block.length = length;
    block.serializer = serializer;
    block.parent = parent;
    block.parse();
    return block;
  }
}

// Used to make transactions unique.
let txCounter: number = 0;