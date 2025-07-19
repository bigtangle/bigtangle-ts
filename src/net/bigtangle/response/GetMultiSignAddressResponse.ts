import { AbstractResponse } from './AbstractResponse';
import { MultiSignAddress } from '../core/MultiSignAddress';
import { JsonProperty } from "jackson-js";

export class GetMultiSignAddressResponse extends AbstractResponse {
    @JsonProperty() private list: MultiSignAddress[] | null = null;

    public static create(list: MultiSignAddress[]): GetMultiSignAddressResponse {
        const res = new GetMultiSignAddressResponse();
        res.list = list;
        return res;
    }

    public getList(): MultiSignAddress[] | null {
        return this.list;
    }

    public setList(list: MultiSignAddress[] | null): void {
        this.list = list;
    }
}
