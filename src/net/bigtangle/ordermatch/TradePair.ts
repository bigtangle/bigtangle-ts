export class TradePair implements Comparable<TradePair> {
    private orderToken: string;
    private orderBaseToken: string;
    private paar: string;

    constructor(orderToken: string, orderBaseToken: string) {
        this.orderToken = orderToken;
        this.orderBaseToken = orderBaseToken;
        this.paar = orderToken + orderBaseToken;
    }

    public hashCode(): number {
        const prime = 31;
        let result = 1;
        result = prime * result + (this.orderBaseToken == null ? 0 : this.stringHashCode(this.orderBaseToken));
        result = prime * result + (this.orderToken == null ? 0 : this.stringHashCode(this.orderToken));
        result = prime * result + (this.paar == null ? 0 : this.stringHashCode(this.paar));
        return result;
    }

    public equals(obj: any): boolean {
        if (this === obj) return true;
        if (obj == null || this.constructor !== obj.constructor) return false;
        const other = obj as TradePair;
        if (this.orderBaseToken == null) {
            if (other.orderBaseToken != null) return false;
        } else if (this.orderBaseToken !== other.orderBaseToken) return false;
        if (this.orderToken == null) {
            if (other.orderToken != null) return false;
        } else if (this.orderToken !== other.orderToken) return false;
        if (this.paar == null) {
            if (other.paar != null) return false;
        } else if (this.paar !== other.paar) return false;
        return true;
    }

    public getOrderToken(): string {
        return this.orderToken;
    }

    public setOrderToken(orderToken: string): void {
        this.orderToken = orderToken;
    }

    public getOrderBaseToken(): string {
        return this.orderBaseToken;
    }

    public setOrderBaseToken(orderBaseToken: string): void {
        this.orderBaseToken = orderBaseToken;
    }

    public getPaar(): string {
        return this.paar;
    }

    public setPaar(paar: string): void {
        this.paar = paar;
    }

    public compareTo(other: TradePair): number {
        return this.getPaar().localeCompare(other.getPaar());
    }

    private stringHashCode(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

    public toString(): string {
        return `TradePair [orderToken=${this.orderToken}, orderBaseToken=${this.orderBaseToken}]`;
    }
}

interface Comparable<T> {
    compareTo(other: T): number;
}
