import { AbstractResponse } from './AbstractResponse';
import { PayMultiSign } from '../core/PayMultiSign';
import { JsonProperty } from "jackson-js";

export class PayMultiSignDetailsResponse extends AbstractResponse {
    @JsonProperty() private payMultiSign: PayMultiSign | null = null;

    public static create(payMultiSign: PayMultiSign): PayMultiSignDetailsResponse {
        const res = new PayMultiSignDetailsResponse();
        res.payMultiSign = payMultiSign;
        return res;
    }

    public getPayMultiSign(): PayMultiSign | null {
        return this.payMultiSign;
    }

    public setPayMultiSign(payMultiSign: PayMultiSign | null): void {
        this.payMultiSign = payMultiSign;
    }
}
