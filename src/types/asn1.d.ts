declare module 'asn1.js' {
    // Main define function
    export function define(name: string, schemaBuilder: (this: SchemaBuilder) => void): any;

    // Schema builder interface
    interface SchemaBuilder {
        seq(): SchemaBuilder;
        obj(...keys: KeyDefinition[]): SchemaBuilder;
        key(name: string): KeyTypeSelector;
        int(): void;
        octstr(): void;
        enum(values: Record<number, string>): void;
        gentime(): void;
        seqof(schema: any): void;
    }

    // Key type selector interface
    interface KeyTypeSelector {
        int(): void;
        octstr(): void;
        enum(values: Record<number, string>): void;
        gentime(): void;
        seqof(schema: any): void;
    }
}
