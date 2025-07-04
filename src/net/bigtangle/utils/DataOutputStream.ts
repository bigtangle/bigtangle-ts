import { UnsafeByteArrayOutputStream } from "../core/UnsafeByteArrayOutputStream";

export class DataOutputStream {
    private buffer: number[] = [];
    private out: UnsafeByteArrayOutputStream | null = null;

    constructor(out?: UnsafeByteArrayOutputStream) {
        if (out) {
            this.out = out;
        }
    }

    public writeByte(byte: number): void {
        if (this.out) {
            this.out.write(byte);
        } else {
            this.buffer.push(byte);
        }
    }

    writeBytes(data: Uint8Array): void {
        for (let i = 0; i < data.length; i++) {
            this.writeByte(data[i]);
        }
    }

    write(data: Uint8Array): void {
        this.writeBytes(data);
    }

    writeBoolean(val: boolean): void {
        this.writeByte(val ? 1 : 0);
    }

    writeInt(val: number): void {
        this.writeByte((val >>> 24) & 0xFF);
        this.writeByte((val >>> 16) & 0xFF);
        this.writeByte((val >>> 8) & 0xFF);
        this.writeByte(val & 0xFF);
    }

    writeUInt32LE(val: number): void {
        this.writeByte(val & 0xFF);
        this.writeByte((val >>> 8) & 0xFF);
        this.writeByte((val >>> 16) & 0xFF);
        this.writeByte((val >>> 24) & 0xFF);
    }

    writeLong(val: number): void {
        this.writeInt(Math.floor(val / 0x100000000));
        this.writeInt(val & 0xFFFFFFFF);
    }

    writeNBytesString(s: string | null | undefined): void {
        if (s === null || s === undefined) {
            this.writeBoolean(false);
        } else {
            this.writeBoolean(true);
            const encoder = new TextEncoder();
            const bytes = encoder.encode(s);
            this.writeInt(bytes.length);
            this.writeBytes(bytes);
        }
    }

    close(): void {
        // No-op since we're just buffering in memory
    }

    toByteArray(): Buffer {
        return Buffer.from(new Uint8Array(this.buffer));
    }
}
