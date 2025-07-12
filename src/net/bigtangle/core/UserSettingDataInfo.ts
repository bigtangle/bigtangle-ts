import { DataClass } from './DataClass';
import { UserSettingData } from './UserSettingData';
import { DataInputStream } from '../utils/DataInputStream';
import { DataOutputStream } from '../utils/DataOutputStream';
import { UnsafeByteArrayOutputStream } from './UnsafeByteArrayOutputStream';
import { JsonProperty, JsonClassType } from "jackson-js";

export class UserSettingDataInfo extends DataClass {
    @JsonProperty()
    @JsonClassType({type: () => [Array, [UserSettingData]]})
    private userSettingDatas: UserSettingData[] = [];

    public toByteArray(): Uint8Array {
        const baos = new UnsafeByteArrayOutputStream();
        const dos = new DataOutputStream();
        try {
            dos.write(Buffer.from(super.toByteArray()));
            dos.writeInt(this.userSettingDatas.length);
            for (const c of this.userSettingDatas) {
                dos.write(Buffer.from(c.toByteArray()));
            }
            dos.close();
        } catch (e: any) {
            throw new Error(e);
        }
        return baos.toByteArray();
    }

    public parseDIS(dis: DataInputStream): this {
        super.parseDIS(dis);
        this.userSettingDatas = [];
        const size = dis.readInt();
        for (let i = 0; i < size; i++) {
            this.userSettingDatas.push(new UserSettingData().parseDIS(dis));
        }
        return this;
    }

    public parse(buf: Uint8Array): UserSettingDataInfo {
        const bain = new DataInputStream(Buffer.from(buf));
        try {
            this.parseDIS(bain);
            bain.close();
        } catch (e: any) {
            throw new Error(e);
        }
        return this;
    }

    public getUserSettingDatas(): UserSettingData[] {
        return this.userSettingDatas;
    }

    public setUserSettingDatas(userSettingDatas: UserSettingData[]): void {
        this.userSettingDatas = userSettingDatas;
    }
}
