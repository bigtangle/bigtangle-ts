import { MessageDigestSpi } from './MessageDigestSpi';
import { createHash } from 'crypto';

export class SHA256DigestSpi extends MessageDigestSpi {
    private hashBuffer: Uint8Array[] = [];
    
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
}
