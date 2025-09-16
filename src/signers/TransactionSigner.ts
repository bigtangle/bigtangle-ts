import { KeyBag } from "../net/bigtangle/wallet/KeyBag";
import { Transaction } from "../net/bigtangle/core/Transaction";

export interface ProposedTransaction {
    getTransaction(): Transaction;
}

export interface TransactionSigner {
    signInputs(proposal: ProposedTransaction, keyBag: KeyBag): Promise<boolean>;
    isReady(): boolean;
    serialize(): Uint8Array;
    deserialize(data: Uint8Array): void;
}
