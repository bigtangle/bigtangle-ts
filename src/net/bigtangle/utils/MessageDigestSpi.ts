/**
 * Service Provider Interface for message digest algorithms
 * Similar to Java's MessageDigestSpi
 */
export abstract class MessageDigestSpi {
    public engineDigest(): number[];
    public engineDigest(buf: number[], offset: number, len: number): number;
    public engineDigest(buf?: number[], offset?: number, len?: number): number[] | number {
        throw new Error("Must be implemented by subclass");
    }
    
    public engineGetDigestLength(): number {
        throw new Error("Must be implemented by subclass");
    }
    
    public engineReset(): void {
        throw new Error("Must be implemented by subclass");
    }
    
    public engineUpdate(input: number): void;
    public engineUpdate(input: number[], offset: number, len: number): void;
    public engineUpdate(input: Uint8Array): void;
    public engineUpdate(input: number | number[] | Uint8Array, offset?: number, len?: number): void {
        throw new Error("Must be implemented by subclass");
    }
}