export class DataOutputStream {
    private buffer: number[] = [];

    writeByte(byte: number): void {
        this.buffer.push(byte);
    }

    writeBytes(data: Uint8Array): void {
        for (let i = 0; i < data.length; i++) {
            this.buffer.push(data[i]);
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

    writeNBytesString(s: string): void {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(s);
        this.writeInt(bytes.length);
        this.writeBytes(bytes);
    }

    close(): void {
        // No-op since we're just buffering in memory
    }

    toByteArray(): Buffer {
        return Buffer.from(new Uint8Array(this.buffer));
    }
}
