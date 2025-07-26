import { Sha256Hash } from './Sha256Hash';
import { DataInputStream } from '../utils/DataInputStream';
import { UnsafeByteArrayOutputStream } from './UnsafeByteArrayOutputStream';

export class OrderCancelInfo {
    private blockHash: Sha256Hash | null = null;

    constructor(initialBlockHash?: Sha256Hash) {
        if (initialBlockHash) {
            this.blockHash = initialBlockHash;
        }
    }

    public getBlockHash(): Sha256Hash | null {
        return this.blockHash;
    }

    public setBlockHash(blockHash: Sha256Hash | null): void {
        this.blockHash = blockHash;
    }

    public toByteArray(): Uint8Array {
        const baos = new UnsafeByteArrayOutputStream();
        try {
            const bytes = this.blockHash === null ? Sha256Hash.ZERO_HASH.getBytes() : this.blockHash.getBytes();
            baos.writeBytes(bytes, 0, bytes.length);
            baos.close();
        } catch (e: any) {
            throw new Error(e);
        }
        return baos.toByteArray();
    }
    
    public parseDIS(dis: DataInputStream): OrderCancelInfo {
        const buf = dis.readBytes(Sha256Hash.LENGTH);
        this.blockHash = Sha256Hash.wrap(buf);
        return this;
    }

    public parse(buf: Uint8Array): OrderCancelInfo {
        const bain = new DataInputStream(Buffer.from(buf));
        try {
            this.parseDIS(bain);
            bain.close();
        } catch (e: any) {
            throw new Error(e);
        }
        return this;
    }

    public parseChecked(buf: Uint8Array): OrderCancelInfo {
        try {
            return this.parse(buf);
        } catch (e: any) {
            throw new Error(e);
        }
    }
}
