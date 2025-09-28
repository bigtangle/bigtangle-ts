/**
 * Represents a transaction signature.
 */
export class TransactionSignature {
  /**
   * Creates a transaction signature from a DER-encoded signature.
   * @param derSignature The DER-encoded signature
   * @param sigHash The signature hash type
   */
  public static fromDER(derSignature: Uint8Array, sigHash: number, anyoneCanPay: boolean): TransactionSignature {
    return new TransactionSignature(derSignature, sigHash, anyoneCanPay);
  }

  constructor(
    public readonly derSignature: Uint8Array,
    public readonly sigHash: number,
    public readonly anyoneCanPay: boolean
  ) {}

  public static calcSigHashValue(hashType: any, anyoneCanPay: boolean): number {
    let sigHash = hashType.value;
    if (anyoneCanPay) {
      sigHash |= 0x80;
    }
    return sigHash;
  }

  /**
   * Encodes the signature into the format used in transaction scripts.
   * @returns The encoded signature
   */
  public encodeToBitcoin(): Uint8Array {
    const result = new Uint8Array(this.derSignature.length + 1);
    result.set(this.derSignature, 0);
    result[this.derSignature.length] = this.sigHash;
    return result;
  }

  /**
   * Checks if this signature is a valid DER-encoded signature.
   */
  public isValid(): boolean {
    // Check minimum and maximum DER signature length
    return this.derSignature.length > 0 && this.derSignature.length <= 72;
  }
}
