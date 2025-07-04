import { DataInputStream } from '../utils/DataInputStream';
import { DataOutputStream } from '../utils/DataOutputStream';
import { UnsafeByteArrayOutputStream } from './UnsafeByteArrayOutputStream';
import { JsonProperty } from 'jackson-js';

/*
 * Block may contains data with the dataClassName and the class has a version number
 */
export abstract class DataClass {
    protected version: number = 1; // Change to protected to allow access in subclasses for Jackson-js

    constructor() {
    }

    public toByteArray(): Uint8Array {
        const baos = new UnsafeByteArrayOutputStream();
        const dos = new DataOutputStream(baos);
        try {
            dos.writeInt(this.version);
            dos.close();
        } catch (e: any) {
            throw new Error(e);
        }
        return baos.toByteArray();
    }

    protected parseDIS(dis: DataInputStream): DataClass {
        this.version = dis.readInt();
        return this;
    }

    @JsonProperty()
    public getVersion(): number {
        return this.version;
    }

    @JsonProperty()
    public setVersion(version: number): void {
        this.version = version;
    }

    public hashCode(): number {
        return this.version;
    }

    public equals(obj: any): boolean {
        if (this === obj) return true;
        if (obj == null || this.constructor !== obj.constructor) return false;
        const other = obj as DataClass;
        return this.version === other.version;
    }
}
