export class ScriptBuilder {
    static createInputScript(signature: Uint8Array, pubkey: Uint8Array): Uint8Array {
        // Create a standard P2PKH input script: [signature] [pubkey]
        const script = new Uint8Array(signature.length + pubkey.length + 2);
        script[0] = signature.length;
        script.set(signature, 1);
        script[1 + signature.length] = pubkey.length;
        script.set(pubkey, 2 + signature.length);
        return script;
    }
}
