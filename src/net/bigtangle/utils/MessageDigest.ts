import { MessageDigestSpi } from './MessageDigestSpi';
import { SHA256DigestSpi } from './SHA256DigestSpi';
import { MD5DigestSpi } from './SHA256DigestSpi';

/**
 * Main class for message digest operations
 * Similar to Java's MessageDigest
 */
export class MessageDigest {
    private spi: MessageDigestSpi;
    private algorithm: string;
    private provider: string;
    private isReset: boolean = true;
    
    protected constructor(spi: MessageDigestSpi, algorithm: string, provider: string = "default") {
        this.spi = spi;
        this.algorithm = algorithm;
        this.provider = provider;
    }
    
    /**
     * Returns a MessageDigest object that implements the specified digest algorithm
     */
    static getInstance(algorithm: string, provider?: string): MessageDigest {
        // Implementation would use a factory pattern to create appropriate SPI
        switch (algorithm.toLowerCase()) {
            case "sha-256":
                return new MessageDigest(new SHA256DigestSpi(), algorithm, provider);
            case "md5":
                return new MessageDigest(new MD5DigestSpi(), algorithm, provider);
            default:
                throw new Error(`No such algorithm: ${algorithm}`);
        }
    }
    
    /**
     * Returns the algorithm name
     */
    getAlgorithm(): string {
        return this.algorithm;
    }
    
    /**
     * Returns the provider name
     */
    getProvider(): string {
        return this.provider;
    }
    
    /**
     * Returns the digest length in bytes
     */
    getDigestLength(): number {
        return this.spi.engineGetDigestLength();
    }
    
    /**
     * Updates the digest using the specified byte
     */
    /**
     * Updates the digest using the specified array of bytes
     */
    update(input: number): void;
    update(input: number[]): void;
    update(input: Uint8Array): void;
    update(input: number[], offset: number, len: number): void;
    update(input: any, offset?: number, len?: number): void {
        if (typeof input === 'number') {
            this.spi.engineUpdate(input);
        } else if (input instanceof Uint8Array) {
            this.spi.engineUpdate(input);
        } else if (Array.isArray(input) && offset !== undefined && len !== undefined) {
            this.spi.engineUpdate(input, offset, len);
        } else if (Array.isArray(input)) {
            this.spi.engineUpdate(input, 0, input.length);
        }
        this.isReset = false;
    }
    
    /**
     * Completes the hash computation and returns the digest
     */
    digest(): number[];
    digest(buf: number[], offset: number, len: number): number;
    digest(buf?: number[], offset?: number, len?: number): number[] | number {
        if (buf && offset !== undefined && len !== undefined) {
            return this.spi.engineDigest(buf, offset, len);
        } else {
            return this.spi.engineDigest();
        }
    }
    
    /**
     * Resets the digest for further use
     */
    reset(): void {
        this.spi.engineReset();
        this.isReset = true;
    }
    
    /**
     * Returns a string representation of this message digest object
     */
    toString(): string {
        return `MessageDigest ${this.algorithm} from ${this.provider}`;
    }
    
    /**
     * Utility method to compute digest of a string
     */
    static digestString(algorithm: string, data: string, encoding: string = "utf-8"): number[] {
        const md = MessageDigest.getInstance(algorithm);
        const encoder = new TextEncoder();
        const dataBytes = encoder.encode(data);
        md.update(dataBytes);
        return md.digest();
    }
    
    /**
     * Utility method to compute hex string representation
     */
    static digestToHex(digest: number[]): string {
        return digest.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}