import { AbstractResponse } from './AbstractResponse';
import { MultiSignAddress } from '../core/MultiSignAddress';
import { JsonProperty } from "jackson-js";

export class PermissionedAddressesResponse extends AbstractResponse {
    @JsonProperty() private multiSignAddresses: MultiSignAddress[] | null = null;
    @JsonProperty() private domainName: string | null = null;
    @JsonProperty() private isRootPermissioned: boolean = false;

    public static create(domainName: string, isRootPermissioned: boolean, multiSignAddresses: MultiSignAddress[]): PermissionedAddressesResponse {
        const res = new PermissionedAddressesResponse();
        res.domainName = domainName;
        res.isRootPermissioned = isRootPermissioned;
        res.multiSignAddresses = multiSignAddresses;
        return res;
    }

    public getMultiSignAddresses(): MultiSignAddress[] | null {
        return this.multiSignAddresses;
    }

    public setMultiSignAddresses(multiSignAddresses: MultiSignAddress[] | null): void {
        this.multiSignAddresses = multiSignAddresses;
    }

    public getIsRootPermissioned(): boolean {
        return this.isRootPermissioned;
    }

    public setRootPermissioned(isRootPermissioned: boolean): void {
        this.isRootPermissioned = isRootPermissioned;
    }

    public getDomainName(): string | null {
        return this.domainName;
    }

    public setDomainName(domainName: string | null): void {
        this.domainName = domainName;
    }
}
