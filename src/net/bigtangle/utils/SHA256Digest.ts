import { MessageDigest } from "./MessageDigest";
import { createHash } from 'crypto';

export class SHA256Digest extends MessageDigest {
  private hashBuffer: Uint8Array[] = [];

  constructor() {
    super("SHA-256");
  }

  protected engineUpdateByte(input: number): void {
    this.hashBuffer.push(new Uint8Array([input]));
  }

  protected engineUpdateBytes(input: Uint8Array, offset: number, len: number): void {
    this.hashBuffer.push(input.subarray(offset, offset + len));
  }

  protected engineDigest(): Uint8Array {
    const hash = createHash('sha256');
    for (const buffer of this.hashBuffer) {
      hash.update(buffer);
    }
    return hash.digest();
  }

  protected engineReset(): void {
    this.hashBuffer = [];
  }

  protected engineGetDigestLength(): number {
    return 32; // SHA-256 produces 32-byte digests
  }

  public clone(): SHA256Digest {
    const copy = new SHA256Digest();
    copy.state = this.state;
    copy.provider = this.provider;
    // Deep copy the hashBuffer
    copy.hashBuffer = this.hashBuffer.map(buffer => new Uint8Array(buffer));
    return copy;
  }

  public static getInstance(algorithm: string): SHA256Digest {
    if (algorithm.toUpperCase() === "SHA-256" || algorithm.toUpperCase() === "SHA256") {
      return new SHA256Digest();
    }
    throw new Error(`Unsupported algorithm: ${algorithm}`);
  }

  public static from(algorithm: string): SHA256Digest {
    return SHA256Digest.getInstance(algorithm);
  }
}
