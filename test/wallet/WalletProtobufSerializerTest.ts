import { Buffer } from 'buffer';
import { Wallet } from '../../src/net/bigtangle/wallet/Wallet';
import { MainNetParams } from '../../src/net/bigtangle/params/MainNetParams';
import { ECKey } from '../../src/net/bigtangle/core/ECKey';
import { Address } from '../../src/net/bigtangle/core/Address';
import { WalletProtobufSerializer } from '../../src/net/bigtangle/wallet/WalletProtobufSerializer';
import { UnreadableWalletException } from '../../src/net/bigtangle/wallet/UnreadableWalletException';
import bigInt from 'big-integer';

describe('WalletProtobufSerializerTest', () => {
    const PARAMS = MainNetParams.get();
    let myKey: ECKey;
    let myWatchedKey: ECKey;
    let myAddress: Address;
    let myWallet: Wallet;

    beforeEach(() => {
        // Use ECKey.fromPrivate with a dummy BigInteger (e.g., new BigInteger('1'))
        const priv1 = bigInt('1');
        const priv2 = bigInt('2');
        myWatchedKey = ECKey.fromPrivate(priv1);
        myKey = ECKey.fromPrivate(priv2);
        myKey.setCreationTimeSeconds(123456789);
        myWallet = Wallet.fromKeys(PARAMS, [myWatchedKey, myKey]);
        myWallet.importKey(myKey);
    });

    async function roundTrip(wallet: Wallet): Promise<Wallet> {
        // Mock output/input for serializer
        let data = '';
        const output = { write: (buf: Buffer) => { data = buf.toString(); } };
        await new WalletProtobufSerializer().writeWallet(wallet, output);
        const input = { read: () => data };
        return new WalletProtobufSerializer().readWallet(input, false, []);
    }

    test('empty', async () => {
        const wallet1 = await roundTrip(myWallet);
        const key1 = wallet1.findKeyFromPubHash(myKey.getPubKeyHash());
        expect(key1).not.toBeNull();
        expect(Buffer.compare(myKey.getPubKey(), key1!.getPubKey())).toBe(0);
        expect(Buffer.compare(myKey.getPrivKeyBytes(), key1!.getPrivKeyBytes())).toBe(0);
        expect(key1!.getCreationTimeSeconds()).toBe(myKey.getCreationTimeSeconds());
    });

    test('testKeys', async () => {
        for (let i = 0; i < 20; i++) {
            myKey = ECKey.fromPrivate(bigInt((i + 10).toString()));
            myWallet = Wallet.fromKeys(PARAMS, [myKey]);
            const wallet1 = await roundTrip(myWallet);
            const key1 = wallet1.findKeyFromPubHash(myKey.getPubKeyHash());
            expect(key1).not.toBeNull();
            expect(Buffer.compare(myKey.getPubKey(), key1!.getPubKey())).toBe(0);
            expect(Buffer.compare(myKey.getPrivKeyBytes(), key1!.getPrivKeyBytes())).toBe(0);
        }
    });

    test('testRoundTripNormalWallet', async () => {
        const wallet1 = await roundTrip(myWallet);
        const key1 = wallet1.findKeyFromPubHash(myKey.getPubKeyHash());
        expect(key1).not.toBeNull();
        expect(Buffer.compare(myKey.getPubKey(), key1!.getPubKey())).toBe(0);
        expect(Buffer.compare(myKey.getPrivKeyBytes(), key1!.getPrivKeyBytes())).toBe(0);
        expect(key1!.getCreationTimeSeconds()).toBe(myKey.getCreationTimeSeconds());
    });

    test('versions', async () => {
        await expect(async () => {
            const proto = await new WalletProtobufSerializer().walletToProto(myWallet);
            proto.version = 2; // setVersion does not exist, set property directly
            // Mock output/input for serializer
            let data = JSON.stringify(proto);
            const input = { read: () => data };
            new WalletProtobufSerializer().readWallet(input, false, []);
        }).rejects.toThrow(UnreadableWalletException.FutureVersion);
    });
});
