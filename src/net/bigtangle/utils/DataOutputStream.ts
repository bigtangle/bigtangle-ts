export class DataOutputStream {
    private buffer: number[] = [];

    writeByte(byte: number): void {
        this.buffer.push(byte);
    }

    write(data: Uint8Array): void {
        for (let i = 0; i < data.length; i++) {
            this.buffer.push(data[i]);
        }
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

    writeLong(val: number): void {
        this.writeInt(Math.floor(val / 0x100000000));
        this.writeInt(val & 0xFFFFFFFF);
    }

    toByteArray(): Uint8Array {
        return new Uint8Array(this.buffer);
    }
}
