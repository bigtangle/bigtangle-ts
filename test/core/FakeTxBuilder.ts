import { Buffer } from 'buffer';
import { NetworkParameters } from '../../src/net/bigtangle/params/NetworkParameters';
import { Transaction } from '../../src/net/bigtangle/core/Transaction';
import { Coin } from '../../src/net/bigtangle/core/Coin';
import { ECKey } from '../../src/net/bigtangle/core/ECKey';
import { Address } from '../../src/net/bigtangle/core/Address';
import { TransactionOutput } from '../../src/net/bigtangle/core/TransactionOutput';
import { Sha256Hash } from '../../src/net/bigtangle/core/Sha256Hash';
import { TransactionOutPoint } from '../../src/net/bigtangle/core/TransactionOutPoint';
import { TransactionInput } from '../../src/net/bigtangle/core/TransactionInput';
import { ScriptBuilder } from '../../src/net/bigtangle/script/ScriptBuilder';
import { TransactionSignature } from '../../src/net/bigtangle/crypto/TransactionSignature';
import { Block } from '../../src/net/bigtangle/core/Block';
import { UtilsTest } from './UtilsTest';
import { MainNetParams as MainNetParamsClass } from '../../src/net/bigtangle/params/MainNetParams';
import { Constants } from '../../src/net/bigtangle/core/Constants';
import bigInt from 'big-integer';

export class FakeTxBuilder {
    /** Create a fake transaction, without change. */
    public static createFakeTxSimple(params: NetworkParameters): Transaction {
        return FakeTxBuilder.createFakeTxWithoutChangeAddress(
            params,
            Coin.COIN,
            ECKey.fromPrivate(bigInt('1')).toAddress(params),
        );
    }

    /** Create a fake transaction, without change. */
    public static createFakeTxWithoutChange(
        params: NetworkParameters,
        output: TransactionOutput,
    ): Transaction {
        const prevTx = FakeTxBuilder.createFakeTx(
            params,
            Coin.COIN,
            ECKey.fromPrivate(bigInt('1')).toAddress(params),
        );
        const tx = new Transaction(params);
        tx.addOutput(output);
        const input1 = new TransactionInput(params, tx, Buffer.from([]), prevTx.getOutput(0).getOutPointFor(Sha256Hash.wrap(Buffer.from(params.getGenesisPub(), 'hex'))));
        tx.addInput(input1);
        return tx;
    }

    /** Create a fake coinbase transaction. */
    public static createFakeCoinbaseTx(params: NetworkParameters): Transaction {
        const outpoint = new TransactionOutPoint(
            params,
            -1,
            Sha256Hash.ZERO_HASH,
            Sha256Hash.ZERO_HASH,
        );
        const input = new TransactionInput(params, null, Buffer.from([]), outpoint);
        const tx = new Transaction(params);
        tx.addInput(input);
        const outputToMe = TransactionOutput.fromAddress(
            params,
            tx,
            Coin.COIN.multiply(50),
            ECKey.fromPrivate(bigInt('1')).toAddress(params),
        );
        tx.addOutput(outputToMe);

        if (!tx.isCoinBase()) {
            throw new Error('Created transaction is not a coinbase transaction');
        }
        return tx;
    }

    /**
     * Create a fake TX of sufficient realism to exercise the unit tests. Two
     * outputs, one to us, one to somewhere else to simulate change. There is
     * one random input.
     */
    public static createFakeTxWithChangeAddress(
        params: NetworkParameters,
        value: Coin,
        to: Address,
        changeOutput: Address,
    ): Transaction {
        const t = new Transaction(params);
        const outputToMe = TransactionOutput.fromAddress(params, t, value, to);
        t.addOutput(outputToMe);
        const change = TransactionOutput.fromAddress(
            params,
            t,
            Coin.valueOf(
                BigInt(bigInt(Coin.COIN.getValue()).multiply(1).add(11).toString()),
                Constants.BIGTANGLE_TOKENID,
            ),
            changeOutput,
        );
        t.addOutput(change);
        // Make a previous tx simply to send us sufficient coins. This prev tx
        // is not really valid but it doesn't
        // matter for our purposes.
        const prevTx = new Transaction(params);
        const prevOut = TransactionOutput.fromAddress(params, prevTx, value, to);
        prevTx.addOutput(prevOut);
        // Connect it.
        const input = new TransactionInput(params, t, Buffer.from([]), prevOut.getOutPointFor(Sha256Hash.wrap(Buffer.from(params.getGenesisPub(), 'hex'))));
        t.addInput(input);
        input.setScriptSig(ScriptBuilder.createInputScript(TransactionSignature.dummy()));
        // Fake signature.
        // Serialize/deserialize to ensure internal state is stripped, as if it
        // had been read from the wire.
        return FakeTxBuilder.roundTripTransaction(params, t);
    }

    /**
     * Create a fake TX for unit tests, for use with unit tests that need
     * greater control. One outputs, 2 random inputs, split randomly to create
     * randomness.
     */
    public static createFakeTxWithoutChangeAddress(
        params: NetworkParameters,
        value: Coin,
        to: Address,
    ): Transaction {
        const t = new Transaction(params);
        const outputToMe = TransactionOutput.fromAddress(params, t, value, to);
        t.addOutput(outputToMe);

        // Make a random split in the output value so we get a distinct hash
        // when we call this multiple times with same args
        let split = bigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        if (split.isNegative()) {
            split = split.multiply(-1);
        }
        if (split.isZero()) {
            split = bigInt(15);
        }
        while (split.greater(value.getValue())) {
            split = split.divide(2);
        }

        // Make a previous tx simply to send us sufficient coins. This prev tx
        // is not really valid but it doesn't
        // matter for our purposes.
        const prevTx1 = new Transaction(params);
        const prevOut1 = TransactionOutput.fromAddress(
            params,
            prevTx1,
            Coin.valueOf(BigInt(split.toString()), Constants.BIGTANGLE_TOKENID),
            to,
        );
        prevTx1.addOutput(prevOut1);
        // Connect it.
        const input1 = new TransactionInput(params, t, Buffer.from([]), prevOut1.getOutPointFor(Sha256Hash.wrap(Buffer.from(params.getGenesisPub(), 'hex'))));
        t.addInput(input1);
        input1.setScriptSig(ScriptBuilder.createInputScript(TransactionSignature.dummy()));
        // Fake signature.

        // Do it again
        const prevTx2 = new Transaction(params);
        const prevOut2 = TransactionOutput.fromAddress(
            params,
            prevTx2,
            Coin.valueOf(
                BigInt(bigInt(value.getValue()).subtract(split).toString()),
                Constants.BIGTANGLE_TOKENID,
            ),
            to,
        );
        prevTx2.addOutput(prevOut2);
        const input2 = new TransactionInput(params, t, Buffer.from([]), prevOut2.getOutPointFor(Sha256Hash.wrap(Buffer.from(params.getGenesisPub(), 'hex'))));
        t.addInput(input2);
        input2.setScriptSig(ScriptBuilder.createInputScript(TransactionSignature.dummy()));

        // Serialize/deserialize to ensure internal state is stripped, as if it
        // had been read from the wire.
        return FakeTxBuilder.roundTripTransaction(params, t);
    }

    /**
     * Create a fake TX of sufficient realism to exercise the unit tests. Two
     * outputs, one to us, one to somewhere else to simulate change. There is
     * one random input.
     */
    public static createFakeTx(
        params: NetworkParameters,
        value: Coin,
        to: Address,
    ): Transaction {
        return FakeTxBuilder.createFakeTxWithChangeAddress(
            params,
            value,
            to,
            ECKey.fromPrivate(bigInt('1')).toAddress(params),
        );
    }

    /**
     * Create a fake TX of sufficient realism to exercise the unit tests. Two
     * outputs, one to us, one to somewhere else to simulate change. There is
     * one random input.
     */
    public static createFakeTxECKey(
        params: NetworkParameters,
        value: Coin,
        to: ECKey,
    ): Transaction {
        const t = new Transaction(params);
        const outputToMe = TransactionOutput.fromECKey(params, t, value, to);
        t.addOutput(outputToMe);
        const change = TransactionOutput.fromAddress(
            params,
            t,
            Coin.valueOf(
                BigInt(bigInt(Coin.COIN.getValue()).multiply(1).add(11).toString()),
                Constants.BIGTANGLE_TOKENID,
            ),
            ECKey.fromPrivate(bigInt('2')).toAddress(params),
        );
        t.addOutput(change);
        // Make a previous tx simply to send us sufficient coins. This prev tx
        // is not really valid but it doesn't
        // matter for our purposes.
        const prevTx = new Transaction(params);
        const prevOut = TransactionOutput.fromECKey(params, prevTx, value, to);
        prevTx.addOutput(prevOut);
        // Connect it.
        const input = new TransactionInput(params, t, Buffer.from([]), prevOut.getOutPointFor(Sha256Hash.wrap(Buffer.from(params.getGenesisPub(), 'hex'))));
        t.addInput(input);
        // Serialize/deserialize to ensure internal state is stripped, as if it
        // had been read from the wire.
        return FakeTxBuilder.roundTripTransaction(params, t);
    }

    /**
     * Transaction[0] is a feeder transaction, supplying BTA to Transaction[1]
     */
    public static createFakeTxFrom(
        params: NetworkParameters,
        value: Coin,
        to: Address,
        from: Address,
    ): Transaction[] {
        // Create fake TXes of sufficient realism to exercise the unit tests.
        // This transaction send BTA from the
        // from address, to the to address with to one to somewhere else to
        // simulate change.
        const t = new Transaction(params);
        const outputToMe = TransactionOutput.fromAddress(params, t, value, to);
        t.addOutput(outputToMe);
        const change = TransactionOutput.fromAddress(
            params,
            t,
            Coin.valueOf(
                BigInt(bigInt(Coin.COIN.getValue()).multiply(1).add(11).toString()),
                Constants.BIGTANGLE_TOKENID,
            ),
            ECKey.fromPrivate(bigInt('2')).toAddress(params),
        );
        t.addOutput(change);
        // Make a feeder tx that sends to the from address specified. This
        // feeder tx is not really valid but it doesn't
        // matter for our purposes.
        const feederTx = new Transaction(params);
        const feederOut = TransactionOutput.fromAddress(params, feederTx, value, from);
        feederTx.addOutput(feederOut);

        // make a previous tx that sends from the feeder to the from address
        const prevTx = new Transaction(params);
        const prevOut = TransactionOutput.fromAddress(params, prevTx, value, to);
        prevTx.addOutput(prevOut);

        // Connect up the txes
        const feederInput = new TransactionInput(params, prevTx, Buffer.from([]), feederOut.getOutPointFor(Sha256Hash.wrap(Buffer.from(params.getGenesisPub(), 'hex'))));
        prevTx.addInput(feederInput);
        const mainInput = new TransactionInput(params, t, Buffer.from([]), prevOut.getOutPointFor(Sha256Hash.wrap(Buffer.from(params.getGenesisPub(), 'hex'))));
        t.addInput(mainInput);

        // roundtrip the tx so that they are just like they would be from the
        // wire
        return [
            FakeTxBuilder.roundTripTransaction(params, prevTx),
            FakeTxBuilder.roundTripTransaction(params, t),
        ];
    }

    /**
     * Roundtrip a transaction so that it appears as if it has just come from
     * the wire
     */
    public static roundTripTransaction(
        params: NetworkParameters,
        tx: Transaction,
    ): Transaction {
        try {
            const bs = params.getDefaultSerializer();
            const bos = Buffer.from(tx.bitcoinSerialize());
            return bs.deserialize(bos) as Transaction;
        } catch (e: unknown) {
            if (e instanceof Error) {
                throw new Error(e.message); // Should not happen.
            }
            throw new Error(String(e));
        }
    }

    public static createFakeDoubleSpendTxns(
        params: NetworkParameters,
        to: Address,
    ): DoubleSpends {
        const doubleSpends = new DoubleSpends();
        const value = Coin.COIN;
        const someBadGuy = ECKey.fromPrivate(bigInt('3')).toAddress(params);

        doubleSpends.prevTx = new Transaction(params);
        const prevOut = TransactionOutput.fromAddress(
            params,
            doubleSpends.prevTx,
            value,
            someBadGuy,
        );
        doubleSpends.prevTx.addOutput(prevOut);

        doubleSpends.t1 = new Transaction(params);
        const o1 = TransactionOutput.fromAddress(params, doubleSpends.t1, value, to);
        doubleSpends.t1.addOutput(o1);
        const inputT1 = new TransactionInput(params, doubleSpends.t1, Buffer.from([]), prevOut.getOutPointFor(Sha256Hash.wrap(Buffer.from(params.getGenesisPub(), 'hex'))));
        doubleSpends.t1.addInput(inputT1);

        doubleSpends.t2 = new Transaction(params);
        const inputT2 = new TransactionInput(params, doubleSpends.t2, Buffer.from([]), prevOut.getOutPointFor(Sha256Hash.wrap(Buffer.from(params.getGenesisPub(), 'hex'))));
        doubleSpends.t2.addInput(inputT2);
        const o2 = TransactionOutput.fromAddress(
            params,
            doubleSpends.t2,
            value,
            someBadGuy,
        );
        doubleSpends.t2.addOutput(o2);

        try {
            doubleSpends.t1 = params
                .getDefaultSerializer()
                .makeTransaction(Buffer.from(doubleSpends.t1.bitcoinSerialize()));
            doubleSpends.t2 = params
                .getDefaultSerializer()
                .makeTransaction(Buffer.from(doubleSpends.t2.bitcoinSerialize()));
        } catch (e: unknown) {
            if (e instanceof Error) {
                throw new Error(e.message);
            }
            throw new Error(String(e));
        }
        return doubleSpends;
    }

    public static makeSolvedTestBlock(
        prev: Block,
        ...transactions: Transaction[]
    ): Block {
        const networkParams: NetworkParameters = MainNetParamsClass.get();
        const b = UtilsTest.createBlock(networkParams, prev, prev);
        // Coinbase tx already exists.
        for (const tx of transactions) {
            b.addTransaction(tx);
        }
        b.solve();
        return b;
    }

    public static makeSolvedTestBlockWithAddress(
        prev: Block,
        to: Address,
        ...transactions: Transaction[]
    ): Block {
        const networkParams: NetworkParameters = MainNetParamsClass.get();
        const b = UtilsTest.createBlock(networkParams, prev, prev);
        // Coinbase tx already exists.
        for (const tx of transactions) {
            b.addTransaction(tx);
        }
        b.solve();
        return b;
    }
}

export class DoubleSpends {
    public t1: Transaction | null = null;
    public t2: Transaction | null = null;
    public prevTx: Transaction | null = null;
}

export class BlockPair {
    public block: Block | null = null;
}
