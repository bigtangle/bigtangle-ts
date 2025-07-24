import bigInt, { BigInteger } from "big-integer"; // Use big-integer
import { secp256k1 } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { ripemd160 } from "@noble/hashes/ripemd160";
import { ECDSASignature } from "../core/ECDSASignature";
import { ECPoint } from "./ECPoint";
import { NetworkParameters } from "../params/NetworkParameters";
import * as Address from "./Address";
import { KeyParameter, KeyCrypter } from "../crypto/KeyCrypter";
import { EncryptedData } from "../crypto/EncryptedData";
import { DumpedPrivateKey } from "./DumpedPrivateKey";
import { VarInt } from "./VarInt";
import { Utils } from "../utils/Utils";
export class ECKey {
  public static readonly CURVE = secp256k1.CURVE;

  public static createNewKey(compressed: boolean = true): ECKey {
   
    const randomBytes = secp256k1.utils.randomPrivateKey();
    const hex =Utils.HEX.encode (randomBytes);
    const privateKey = bigInt(hex, 16);
    return ECKey.fromPrivate(privateKey, compressed);
  }

  // Helper to convert bigint or BigInteger to 32-byte Uint8Array
  private static bigIntToBytes(
    bi: bigint | BigInteger,
    length: number = 32
  ): Uint8Array {
    let hex: string;

    if (typeof bi === "bigint") {
      hex = bi.toString(16);
    } else {
      // Handle big-integer BigInteger
      hex = bi.toString(16);
    }

    // Pad with leading zeros if necessary to match the desired byte length
    // Each byte is 2 hex characters, so length * 2
    hex = hex.padStart(length * 2, "0");
    // Ensure we don't exceed the desired length
    if (hex.length > length * 2) {
      hex = hex.substring(hex.length - length * 2);
    }
    // Convert hex string to Uint8Array
    return Uint8Array.from(Buffer.from(hex, "hex"));
  }

  // Helper to convert Buffer or Uint8Array to hex string
  private static bufferToHex(buf:   Uint8Array): string {
    return Utils.HEX.encode(buf);
  }

  public priv: BigInteger | null;
  public pub: ECPoint | null;
  private pubKeyHash: Uint8Array | null = null;
  public creationTimeSeconds: number = Math.floor(Date.now() / 1000);
  public encryptedPrivateKey: EncryptedData | null = null;
  public keyCrypter: KeyCrypter | null = null;

  constructor(
    priv: BigInteger | null,
    pub: ECPoint | null,
    compressed: boolean = true
  ) {
    this.priv = priv;
    this.pub = pub;
    if (pub) {
      pub.setCompressed(compressed);
    }
  }

  public static createBigInteger(signum: number, magnitude: Uint8Array): BigInteger {
    // Handle zero case
    if (signum === 0 || magnitude.length === 0) {
      return bigInt(0);
    }

    // Convert magnitude bytes to BigInteger
    let result = bigInt(0);
    for (const element of magnitude) {
      result = result.shiftLeft(8).add(element);
    }

    // Apply sign
    return signum < 0 ? result.negate() : result;
  }

  public static fromPrivateByte(privKeyBytes: Uint8Array): ECKey {
  
    return ECKey.fromPrivate(ECKey. createBigInteger(1, privKeyBytes));
  }

  public static fromPrivate(
    privKey: BigInteger,
    compressed: boolean = true
  ): ECKey {
    const pubPoint = ECKey.publicPointFromPrivate(privKey);
    return new ECKey(privKey, pubPoint, compressed);
  }

  public static fromPrivateString(privKey: string): ECKey {
  
    return ECKey.fromPrivateByte(Utils.HEX.decode( privKey ));
  }

  public static fromPublic(
    pubKeyBytes: Uint8Array,
    compressed: boolean = true
  ): ECKey {
    const pubPoint = ECPoint.decodePoint(pubKeyBytes);
    return new ECKey(null, pubPoint, compressed);
  }

  public static publicPointFromPrivate(privKey: BigInteger): ECPoint {
    // Convert directly to Uint8Array
    const privKeyBytes = ECKey.bigIntToBytes(privKey, 32);
    const pubKey = secp256k1.getPublicKey(privKeyBytes);
    return ECPoint.decodePoint(pubKey);
  }

  public getPrivKeyBytes(): Uint8Array {
    if (!this.priv) {
      throw new Error("Private key is not available");
    }
    // Use the BigInteger directly
    return ECKey.bigIntToBytes(this.priv, 32);
  }

  public decompress(): ECKey {
    if (!this.pub) {
      throw new Error("Public key is not available");
    }
    const newPub = this.pub.decompress();
    return new ECKey(this.priv, newPub, false);
  }

  public isCompressed(): boolean {
    return this.pub?.isCompressed() ?? true;
  }

  public getPubKeyBytes(): Uint8Array {
    if (!this.pub) {
      throw new Error("Public key is not available");
    }
    return this.pub.encode(this.isCompressed());
  }

  /**
   * Gets the raw public key value. This appears in transaction scriptSigs.
   * Note: This is not the same as the pubKeyHash/address.
   */
  public getPubKey(): Uint8Array {
    return this.getPubKeyBytes();
  }

  /**
   * Gets the public key in the form of an elliptic curve point object.
   */
  public getPubKeyPoint(): ECPoint | null {
    return this.pub;
  }

  /**
   * Gets the private key as a BigInteger.
   * Throws if the private key is not available.
   */
  public getPrivKey(): BigInteger {
    if (!this.priv) {
      throw new Error("Private key is not available");
    }
    return this.priv;
  }

  public getPubKeyHash(): Uint8Array {
    this.pubKeyHash ??= ripemd160(sha256(this.getPubKeyBytes()));
    return this.pubKeyHash!;
  }

  public async sign(
    messageHash: Uint8Array,
    aesKey?: KeyParameter
  ): Promise<ECDSASignature> {
    if (this.isEncrypted()) {
      if (!aesKey) {
        throw new Error("AES key is required for signing an encrypted key");
      }
      if (!this.keyCrypter || !this.encryptedPrivateKey) {
        throw new Error("KeyCrypter or encrypted private key missing");
      }
      const decryptedPrivKey = await this.keyCrypter.decrypt(
        this.encryptedPrivateKey,
        aesKey
      );
      const hex = ECKey.bufferToHex(decryptedPrivKey);
      // Convert directly to native bigint without intermediate BigInteger
      const nativePrivKey = BigInt("0x" + hex);
      return this.doSign(messageHash, nativePrivKey);
    } else {
      if (!this.priv) {
        throw new Error("Private key is not available for signing");
      }
      // Convert BigInteger to bigint
      const privKeyBigInt = BigInt(this.priv.toString());
      return this.doSign(messageHash, privKeyBigInt);
    }
  }

  public doSign(messageHash: Uint8Array, privKey: bigint): ECDSASignature {
    // Convert to Uint8Array for signing
    const privKeyBytes = ECKey.bigIntToBytes(privKey, 32);
    const signature = secp256k1.sign(messageHash, privKeyBytes);
    // Use native bigint values directly
    return new ECDSASignature(signature.r, signature.s);
  }

  public verify(messageHash: Uint8Array, signature: ECDSASignature): boolean {
    if (!this.pub) {
      throw new Error("Public key is not available for verification");
    }
    return secp256k1.verify(
      { r: signature.r, s: signature.s },
      messageHash,
      this.pub.encode(true)
    );
  }

  public isPubKeyOnly(): boolean {
    return this.priv === null;
  }

  public isEncrypted(): boolean {
    return this.encryptedPrivateKey !== null;
  }

  public getCreationTimeSeconds(): number {
    return this.creationTimeSeconds;
  }

  public setCreationTimeSeconds(creationTimeSeconds: number): void {
    this.creationTimeSeconds = creationTimeSeconds;
  }

  public async encrypt(
    keyCrypter: KeyCrypter,
    aesKey: KeyParameter
  ): Promise<ECKey> {
    if (!this.priv) {
      throw new Error("Private key is not available for encryption");
    }
    const encryptedData = await keyCrypter.encrypt(
      this.getPrivKeyBytes(),
      aesKey
    );
    const encryptedKey = new ECKey(null, this.pub);
    encryptedKey.encryptedPrivateKey = encryptedData;
    encryptedKey.keyCrypter = keyCrypter;
    encryptedKey.creationTimeSeconds = this.creationTimeSeconds;
    return encryptedKey;
  }

  public async decrypt(
    keyCrypter: KeyCrypter,
    aesKey: KeyParameter
  ): Promise<ECKey> {
    if (!this.encryptedPrivateKey || !this.keyCrypter) {
      throw new Error("Key is not encrypted or keyCrypter is missing");
    }
    if (!this.keyCrypter.equals(keyCrypter)) {
      throw new Error("KeyCrypter mismatch");
    }
    const decryptedPrivKeyBytes = await keyCrypter.decrypt(
      this.encryptedPrivateKey,
      aesKey
    );
    const hex = ECKey.bufferToHex(decryptedPrivKeyBytes);
    // Convert directly to native bigint and then to BigInteger
    const nativePrivKey = BigInt("0x" + hex);
    const decryptedPrivKey = bigInt(nativePrivKey.toString());
    const decryptedKey = new ECKey(decryptedPrivKey, this.pub);
    decryptedKey.creationTimeSeconds = this.creationTimeSeconds;
    return decryptedKey;
  }

  public equals(other: any): boolean {
    if (!(other instanceof ECKey)) return false;
    return (
      (this.priv === null ||
        other.priv === null ||
        this.priv.toString() === other.priv.toString()) &&
      (this.pub === null || other.pub === null || this.pub.equals(other.pub))
    );
  }

  public hashCode(): number {
    let result = 17;
    if (this.priv) {
      // Use the BigInteger's toString method directly
      const hex = this.priv.toString(16);
      for (let i = 0; i < hex.length; i++) {
        result = 31 * result + hex.charCodeAt(i);
      }
    }
    if (this.pub) {
      result = 31 * result + this.pub.hashCode();
    }
    return result;
  }

  public getPrivateKeyAsHex(): string {
    if (!this.priv) {
      throw new Error("Private key is not available");
    }
    return ECKey.bufferToHex(this.getPrivKeyBytes());
  }

  public getPublicKeyAsHex(): string {
    return ECKey.bufferToHex(this.getPubKeyBytes());
  }

  public toString(): string {
    return `ECKey{pub HEX=${this.getPublicKeyAsHex()}, isEncrypted=${this.isEncrypted()}, isPubKeyOnly=${this.isPubKeyOnly()}}`;
  }

  public toStringWithPrivate(params: NetworkParameters): string {
    let privHex = "";
    let privWIF = "";
    if (this.priv) {
      privHex = this.getPrivateKeyAsHex();
      try {
        const dumpedPrivKey = this.getPrivateKeyEncoded(params);
        privWIF = dumpedPrivKey.toString();
      } catch {
        privWIF = "N/A";
      }
    }
    return `ECKey{pub HEX=${this.getPublicKeyAsHex()}, priv HEX=${privHex}, priv WIF=${privWIF}, isEncrypted=${this.isEncrypted()}, isPubKeyOnly=${this.isPubKeyOnly()}}`;
  }

  public getPrivateKeyEncoded(params: NetworkParameters): DumpedPrivateKey {
    if (!this.priv) {
      throw new Error("Private key is not available");
    }
    const privBytes = this.getPrivKeyBytes();
    const compressed = this.isCompressed();
    return DumpedPrivateKey.encodePrivateKey(params, privBytes, compressed);
  }

  public async signMessage(message: string): Promise<ECDSASignature> {
    // Sign a message following Bitcoin's message signing standard
    const prefix = Buffer.from("\x18Bitcoin Signed Message:\n");
    const messageBuffer = Buffer.from(message, "utf-8");

    // Create a buffer to write the VarInt
    const varIntBuffer = Buffer.alloc(5); // Max size for VarInt is 5 bytes
    let offset = 0;
    VarInt.write(messageBuffer.length, {
      write: (chunk: Buffer) => {
        chunk.copy(varIntBuffer, offset);
        offset += chunk.length;
      },
    });

    const buffer = Buffer.concat([
      prefix,
      varIntBuffer.slice(0, offset),
      messageBuffer,
    ]);
    const hash = sha256(sha256(buffer));
    return this.sign(Uint8Array.from(hash));
  }

  public static signedMessageToKey(
    message: string,
    signatureBase64: string
  ): ECKey {
    // Implementation of message recovery
    const prefix = Buffer.from("\x18Bitcoin Signed Message:\n");
    const messageBuffer = Buffer.from(message, "utf-8");

    // Create a buffer to write the VarInt
    const varIntBuffer = Buffer.alloc(5);
    let offset = 0;
    VarInt.write(messageBuffer.length, {
      write: (chunk: Buffer) => {
        chunk.copy(varIntBuffer, offset);
        offset += chunk.length;
      },
    });

    const buffer = Buffer.concat([
      prefix,
      varIntBuffer.slice(0, offset),
      messageBuffer,
    ]);
    const messageHash = sha256(sha256(buffer));

    const signatureBuffer = Buffer.from(signatureBase64, "base64");
    if (signatureBuffer.length !== 65) {
      throw new Error("Invalid signature length");
    }

    const headerByte = signatureBuffer[0];
    const recoveryId = (headerByte - 27) & 0x03; // Ensure recoveryId is 0-3
    const r = BigInt("0x" + signatureBuffer.slice(1, 33).toString("hex"));
    const s = BigInt("0x" + signatureBuffer.slice(33, 65).toString("hex"));

    // Create a signature object
    new ECDSASignature(r, s);

    // Recover public key using noble/secp256k1's Signature instance
    const sigInstance = secp256k1.Signature.fromCompact(
      signatureBuffer.slice(1, 65)
    );
    const sigWithRecovery = sigInstance.addRecoveryBit(recoveryId);
    const publicKey = sigWithRecovery.recoverPublicKey(messageHash);
    const publicKeyBytes = publicKey.toRawBytes();

    return ECKey.fromPublic(publicKeyBytes);
  }

  public toAddress(params: NetworkParameters): Address.Address {
    const version = params.getAddressHeader();
    return new Address.Address(
      params,
      version,
      Buffer.from(this.getPubKeyHash())
    );
  }

  public static async encryptionIsReversible(
    originalKey: ECKey,
    encryptedKey: ECKey,
    keyCrypter: KeyCrypter,
    aesKey: KeyParameter
  ): Promise<boolean> {
    try {
      const decryptedKey = await encryptedKey.decrypt(keyCrypter, aesKey);
      return originalKey.equals(decryptedKey);
    } catch {
      // Exception intentionally caught for reversibility check; do not rethrow.
      return false;
    }
  }

  // Helper to convert native BigInt to big-integer BigInteger
  private static nativeBigIntToBigInteger(bi: bigint): BigInteger {
    return bigInt(bi.toString());
  }

  public isWatching(): boolean {
    // Placeholder for isWatching logic
    return this.isPubKeyOnly();
  }
} 
