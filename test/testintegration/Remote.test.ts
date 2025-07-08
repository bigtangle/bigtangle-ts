import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { Address } from '../../src/net/bigtangle/core/Address';
import { Block } from '../../src/net/bigtangle/core/Block';
import { BlockEvaluation } from '../../src/net/bigtangle/core/BlockEvaluation';
import { BlockType } from '../../src/net/bigtangle/core/BlockType';
import { Coin } from '../../src/net/bigtangle/core/Coin';
import { ECKey } from '../../src/net/bigtangle/core/ECKey';
import { KeyValue } from '../../src/net/bigtangle/core/KeyValue';
import { MemoInfo } from '../../src/net/bigtangle/core/MemoInfo';
import { MultiSign } from '../../src/net/bigtangle/core/MultiSign';
import { MultiSignAddress } from '../../src/net/bigtangle/core/MultiSignAddress';
import { MultiSignBy } from '../../src/net/bigtangle/core/MultiSignBy';
import { OrderRecord } from '../../src/net/bigtangle/core/OrderRecord';
import { Sha256Hash } from '../../src/net/bigtangle/core/Sha256Hash';
import { Token } from '../../src/net/bigtangle/core/Token';
import { TokenInfo } from '../../src/net/bigtangle/core/TokenInfo';
import { TokenKeyValues } from '../../src/net/bigtangle/core/TokenKeyValues';
import { Tokensums } from '../../src/net/bigtangle/core/Tokensums';
import { Transaction } from '../../src/net/bigtangle/core/Transaction';
import { TransactionInput } from '../../src/net/bigtangle/core/TransactionInput';
import { TransactionOutPoint } from '../../src/net/bigtangle/core/TransactionOutPoint';
import { TransactionOutput } from '../../src/net/bigtangle/core/TransactionOutput';
import { UTXO } from '../../src/net/bigtangle/core/UTXO';
import { UtilGeneseBlock } from '../../src/net/bigtangle/core/UtilGeneseBlock';
import { Utils } from '../../src/net/bigtangle/core/Utils';
import { TransactionSignature } from '../../src/net/bigtangle/crypto/TransactionSignature';
import { InsufficientMoneyException } from '../../src/net/bigtangle/exception/InsufficientMoneyException';
import { NetworkParameters } from '../../src/net/bigtangle/params/NetworkParameters';
import { ReqCmd } from '../../src/net/bigtangle/params/ReqCmd';
import { TestParams } from '../../src/net/bigtangle/params/TestParams';
import { GetBalancesResponse } from '../../src/net/bigtangle/response/GetBalancesResponse';
import { GetBlockEvaluationsResponse } from '../../src/net/bigtangle/response/GetBlockEvaluationsResponse';
import { GetTokensResponse } from '../../src/net/bigtangle/response/GetTokensResponse';
import { MultiSignByRequest } from '../../src/net/bigtangle/response/MultiSignByRequest';
import { MultiSignResponse } from '../../src/net/bigtangle/response/MultiSignResponse';
import { OrderdataResponse } from '../../src/net/bigtangle/response/OrderdataResponse';
import { PermissionedAddressesResponse } from '../../src/net/bigtangle/response/PermissionedAddressesResponse';
import { TokenIndexResponse } from '../../src/net/bigtangle/response/TokenIndexResponse';
import { ScriptBuilder } from '../../src/net/bigtangle/script/ScriptBuilder';
import { MonetaryFormat } from '../../src/net/bigtangle/utils/MonetaryFormat';
import { OkHttp3Util } from '../../src/net/bigtangle/utils/OkHttp3Util';
import { UUIDUtil } from '../../src/net/bigtangle/utils/UUIDUtil';
import { FreeStandingTransactionOutput } from '../../src/net/bigtangle/wallet/FreeStandingTransactionOutput';
import { Wallet } from '../../src/net/bigtangle/wallet/Wallet';


export abstract class RemoteTest {


    public contextRoot = "http://localhost:8088/";

    /*
     * default wallet which has key testpriv and yuanTokenPriv
     */
    public wallet!: Wallet;

    protected readonly aesKey: any = null;


    public static testPub = "02721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975";
    public static testPriv = "ec1d240521f7f254c52aea69fca3f28d754d1b89f310f42b0fb094d16814317f";
    public static yuanTokenPub = "02a717921ede2c066a4da05b9cdce203f1002b7e2abeee7546194498ef2fa9b13a";
    public static yuanTokenPriv = "8db6bd17fa4a827619e165bfd4b0f551705ef2d549a799e7f07115e5c3abad55";


    networkParameters: NetworkParameters = TestParams.get();

    public async checkTokenAssertTrue(tokenid: string, domainname: string) {
        const requestParam0 = new Map<string, any>();
        requestParam0.set("tokenid", tokenid);
        const resp = await OkHttp3Util.postStringSingle(this.contextRoot + ReqCmd.getTokenById,
            JSON.stringify(Object.fromEntries(requestParam0)));

        const getTokensResponse = GetTokensResponse.fromJson(JSON.parse(resp.toString()));
        const token_ = getTokensResponse.getTokens()[0];
        expect(token_.getDomainName() === (domainname)).toBeTruthy();
    }

    public async setUp() {

        this.wallet = await Wallet.fromKeys(this.networkParameters, ECKey.fromPrivate(Buffer.from(RemoteTest.testPriv, 'hex')), this.contextRoot);

    }




    protected async payTestTokenTo(beneficiary: ECKey, testKey: ECKey, amount: bigint, addedBlocks: Block[] = []) {
        await this.payTestTokenToAmount(beneficiary, testKey, amount, addedBlocks);
    }

    protected async payBigTo(beneficiary: ECKey, amount: bigint, addedBlocks: Block[]): Promise<Block> {
        const giveMoneyResult = new Map<string, bigint>();

        giveMoneyResult.set(beneficiary.toAddress(this.networkParameters).toString(), amount);

        return this.payList(addedBlocks, giveMoneyResult, NetworkParameters.BIGTANGLE_TOKENID);
    }

    private async payList(addedBlocks: Block[], giveMoneyResult: Map<string, bigint>, tokenid: Uint8Array): Promise<Block> {
        const b = await this.wallet.payMoneyToECKeyList(null, giveMoneyResult, tokenid, "payList");
        // log.debug("block " + (b == null ? "block is null" : b.toString()));
        if (addedBlocks !== null) {
            addedBlocks.push(b);
        }

        return b;
    }

    protected async payTestTokenToAmount(beneficiary: ECKey, testKey: ECKey, amount: bigint, addedBlocks: Block[]) {
        await this.payBigTo(testKey, Coin.FEE_DEFAULT.getValue(), addedBlocks);

        const giveMoneyTestToken = new Map<string, bigint>();

        giveMoneyTestToken.set(beneficiary.toAddress(this.networkParameters).toString(), amount);
        const w =   Wallet.fromKeysURL(this.networkParameters, [testKey], this.contextRoot);

        const b = await w.payToList(null, giveMoneyTestToken, testKey.getPubKey(), "");
        // log.debug("block " + (b == null ? "block is null" : b.toString()));

        addedBlocks.push(b);

        // Open sell order for test tokens
    }

    protected async makeTestToken(testKey: ECKey, addedBlocks: Block[]): Promise<Block> {
        const block = await this.makeTestTokenWithAmount(testKey, BigInt(77777), addedBlocks, 0);
        return block;
    }

    protected async makeTestTokenWithSpare(testKey: ECKey, addedBlocks: Block[]): Promise<Block> {

        const block = await this.makeTestTokenWithAmount(testKey, BigInt(77777), addedBlocks, 0);

        return block;
    }

    protected async payBigToAmount(beneficiary: ECKey, addedBlocks: Block[]) {

        const giveMoneyResult = new Map<string, bigint>();

        giveMoneyResult.set(beneficiary.toAddress(this.networkParameters).toString(), BigInt(500000000));
        giveMoneyResult.set(beneficiary.toAddress(this.networkParameters).toString(), BigInt(400000000));
        giveMoneyResult.set(beneficiary.toAddress(this.networkParameters).toString(), BigInt(300000000));
        giveMoneyResult.set(beneficiary.toAddress(this.networkParameters).toString(), BigInt(200000000));
        giveMoneyResult.set(beneficiary.toAddress(this.networkParameters).toString(), BigInt(100000000));
        await this.payList(addedBlocks, giveMoneyResult, NetworkParameters.BIGTANGLE_TOKENID);

    }

    protected async resetAndMakeTestToken(testKey: ECKey, amount: bigint, addedBlocks: Block[]): Promise<Block> {
        return this.makeTestTokenWithAmount(testKey, amount, addedBlocks, 0);
    }

    protected async makeTestTokenWithAmount(testKey: ECKey, amount: bigint, addedBlocks: Block[], decimal: number): Promise<Block> {

        // Make the "test" token
        let block: Block | null = null;
        const tokenInfo = new TokenInfo();

        const coinbase = new Coin(amount, testKey.getPubKey());
        // BigInteger amount = coinbase.getValue();
        const tokens = Token.buildSimpleTokenInfo(true, Sha256Hash.ZERO_HASH.toString(), testKey.getPublicKeyAsHex(), testKey.getPublicKeyAsHex(),
            "", 1, 0, amount, true, decimal, UtilGeneseBlock.createGenesis(this.networkParameters).getHashAsString());

        tokenInfo.setToken(tokens);
        tokenInfo.getMultiSignAddresses()
            .push(new MultiSignAddress(tokens.getTokenid(), "", testKey.getPublicKeyAsHex()));

        block = await this.saveTokenUnitTest(tokenInfo, coinbase, testKey, null, [], true);
        addedBlocks.push(block);


        return block;
    }


    async makeBuyOrder(beneficiary: ECKey, tokenId: string, buyPrice: number, buyAmount: number, basetoken: string,
        addedBlocks: Block[]): Promise<Block> {
        let w = await Wallet.fromKeys(this.networkParameters, beneficiary, this.contextRoot);
        w.setServerURL(this.contextRoot);
        await this.payBigTo(beneficiary, Coin.FEE_DEFAULT.getValue(), addedBlocks);
        const block = await w.buyOrder(null, tokenId, BigInt(buyPrice), BigInt(buyAmount), null, null, basetoken, true);
        addedBlocks.push(block);

        return block;
    }

    protected async assertHasAvailableToken(testKey: ECKey, tokenId_: string, amount: number) {
        // Asserts that the given ECKey possesses the given amount of tokens
        const balance = await this.getBalanceByKey(false, testKey);
        const hashMap = new Map<string, number>();
        for (const o of balance) {
            const tokenId = Utils.toHexString(o.getValue().getTokenid());
            if (!hashMap.has(tokenId))
                hashMap.set(tokenId, 0);
            hashMap.set(tokenId, hashMap.get(tokenId)! + Number(o.getValue().getValue()));
        }

        expect(amount === 0 ? null : amount).toBe(hashMap.get(tokenId_));
    }

    protected getRandomSha256Hash(): Sha256Hash {
        const rawHashBytes = new Uint8Array(32);
        crypto.getRandomValues(rawHashBytes);
        const sha256Hash = Sha256Hash.wrap(Buffer.from(rawHashBytes));
        return sha256Hash;
    }


    public async adjustSolve(block: Block): Promise<Block> {
        // save block
        const resp = await OkHttp3Util.post(this.contextRoot + ReqCmd.adjustHeight, block.bitcoinSerialize());

        const result = JSON.parse(resp.toString()) as Map<string, any>;
        const dataHex = result.get("dataHex") as string;

        const adjust = this.networkParameters.getDefaultSerializer().makeBlock(Buffer.from(dataHex, 'hex'));
        adjust.solve();
        return adjust;
    }

    protected async createTestTransaction(): Promise<Transaction> {

        const genesiskey = ECKey.fromPrivate(Buffer.from(RemoteTest.testPriv, 'hex'));
        const outputs = await this.getBalanceByKey(false, genesiskey);
        const output = this.getLargeUTXO(outputs);
        const spendableOutput = new FreeStandingTransactionOutput(this.networkParameters, output);
        const amount = Coin.valueOf(BigInt(2), NetworkParameters.BIGTANGLE_TOKENID);
        const tx = new Transaction(this.networkParameters);
        tx.addOutput(new TransactionOutput(this.networkParameters, tx, amount, genesiskey.getPubKey()));
        tx.addOutput(new TransactionOutput(this.networkParameters, tx,
            spendableOutput.getValue().subtract(amount).subtract(Coin.FEE_DEFAULT), genesiskey.getPubKey()));
        const input = tx.addInput(output.getBlockHash()!, spendableOutput);
        const sighash = tx.hashForSignature(0, spendableOutput.getScriptBytes(), Transaction.SigHash.ALL, false);

        const tsrecsig = await genesiskey.sign(sighash);
        const inputScript = ScriptBuilder.createInputScript(new TransactionSignature(tsrecsig, Transaction.SigHash.ALL, false));
        input.setScriptSig(inputScript);
        return tx;
    }

    protected getLargeUTXO(outputs: UTXO[]): UTXO {
        let a = outputs[0];
        for (const b of outputs) {
            if (b.getValue().isGreaterThan(a.getValue())) {
                a = b;
            }
        }
        return a;
    }

    protected async getBalance(withZero: boolean = false): Promise<UTXO[]> {
        return this.getBalanceByKeys(withZero, await this.wallet.keys());
    }

    // get balance for the walletKeys
    protected async getBalanceByKeys(withZero: boolean, keys: ECKey[]): Promise<UTXO[]> {
        const listUTXO = new Array<UTXO>();
        const keyStrHex000 = new Array<string>();

        for (const ecKey of keys) {
            // keyStrHex000.push(ecKey.toAddress(networkParameters).toString());
            keyStrHex000.push(Utils.toHexString(Buffer.from(ecKey.getPubKeyHash())));
        }
        const response = await OkHttp3Util.postStringSingle(this.contextRoot + ReqCmd.getBalances,
            JSON.stringify(keyStrHex000));

        const getBalancesResponse = GetBalancesResponse.fromJson(JSON.parse(response.toString()));

        if (getBalancesResponse.getOutputs() != null) {
            for (const utxo of getBalancesResponse.getOutputs()) {
                if (withZero) {
                    listUTXO.push(utxo);
                } else if (utxo.getValue().getValue() > 0) {
                    listUTXO.push(utxo);
                }
            }
        }
        return listUTXO;
    }

    protected async getBalanceByToken(tokenid: string, withZero: boolean, keys: ECKey[]): Promise<UTXO> {
        const ulist = await this.getBalanceByKeys(withZero, keys);

        for (const u of ulist) {
            if (tokenid === (u.getTokenId())) {
                return u;
            }
        }

        throw new Error("RuntimeException");
    }


    protected async getBalanceAccount(withZero: boolean, keys: ECKey[]): Promise<Coin[]> {
        let listCoin = new Array<Coin>();
        const keyStrHex000 = new Array<string>();

        for (const ecKey of keys) {
            keyStrHex000.push(Utils.toHexString(Buffer.from(ecKey.getPubKeyHash())));
        }
        const response = await OkHttp3Util.postStringSingle(this.contextRoot + ReqCmd.getAccountBalances,
            JSON.stringify(keyStrHex000));

        const getBalancesResponse = GetBalancesResponse.fromJson(JSON.parse(response.toString()));

        listCoin.push(...getBalancesResponse.getBalance()!);
        for (const coin of listCoin) {
            console.log("coin:" + coin.toString());
        }
        return listCoin;
    }

    // get balance for the walletKeys
    protected async getBalanceByAddress(address: string): Promise<UTXO[]> {
        const listUTXO = new Array<UTXO>();
        const keyStrHex000 = new Array<string>();

        keyStrHex000.push(Utils.toHexString(Address.fromBase58(this.networkParameters, address).getHash160()!));
        const response = await OkHttp3Util.postStringSingle(this.contextRoot + ReqCmd.getBalances,
            JSON.stringify(keyStrHex000));

        const getBalancesResponse = GetBalancesResponse.fromJson(JSON.parse(response.toString()));

        for (const utxo of getBalancesResponse.getOutputs()) {
            listUTXO.push(utxo);
        }

        return listUTXO;
    }

    protected async getBalanceByKey(withZero: boolean, ecKey: ECKey): Promise<UTXO[]> {
        const keys = new Array<ECKey>();
        keys.push(ecKey);
        return this.getBalanceByKeys(withZero, keys);
    }

    protected async testCreateTokenWithBlocks(outKey: ECKey, tokennameName: string, blocksAddedAll: Block[]): Promise<Block> {
        return this.testCreateTokenFull(outKey, tokennameName, UtilGeneseBlock.createGenesis(this.networkParameters).getHashAsString(),
            BigInt(77777), blocksAddedAll);
    }

    protected async testCreateToken(outKey: ECKey, tokennameName: string): Promise<Block> {
        return this.testCreateTokenFull(outKey, tokennameName, UtilGeneseBlock.createGenesis(this.networkParameters).getHashAsString(), BigInt(77777), []);
    }

    protected async testCreateTokenWithDomain(outKey: ECKey, tokennameName: string, domainpre: string, blocksAddedAll: Block[]): Promise<Block> {
        return this.testCreateTokenFull(outKey, tokennameName, domainpre, BigInt(77777), blocksAddedAll);
    }

    protected async testCreateTokenFull(outKey: ECKey, tokennameName: string, domainpre: string, amountgiven: bigint,
        blocksAddedAll: Block[]): Promise<Block> {
        // ECKey outKey = walletKeys.get(0);
        const pubKey = outKey.getPubKey();
        const tokenInfo = new TokenInfo();

        const tokenid = Utils.toHexString(pubKey);

        const basecoin = Coin.valueOf(amountgiven, pubKey);
        const amount = basecoin.getValue();

        const token = Token.buildSimpleTokenInfo(true, Sha256Hash.ZERO_HASH.toString(), tokenid, tokennameName, "", 1, 0, amount, true, 0,
            domainpre);

        tokenInfo.setToken(token);

        // add MultiSignAddress item
        tokenInfo.getMultiSignAddresses().push(new MultiSignAddress(token.getTokenid(), "", outKey.getPublicKeyAsHex()));

        const multiSignAddresses = tokenInfo.getMultiSignAddresses();
        const permissionedAddressesResponse = await this
            .getPrevTokenMultiSignAddressList(tokenInfo.getToken()!);
        if (permissionedAddressesResponse !== null && permissionedAddressesResponse.getMultiSignAddresses() !== null
            && permissionedAddressesResponse.getMultiSignAddresses().length > 0) {
            for (const multiSignAddress of permissionedAddressesResponse.getMultiSignAddresses()) {
                const pubKeyHex = multiSignAddress.getPubKeyHex();
                multiSignAddresses.push(new MultiSignAddress(tokenid, "", pubKeyHex!, 0));
            }
        }

        const b = await this.wallet.saveToken(tokenInfo, basecoin, outKey, null);
        if (blocksAddedAll !== null)
            blocksAddedAll.push(b);

        const re = await this.pullBlockDoMultiSign(tokenid, outKey, this.aesKey);
        if (blocksAddedAll !== null && re !== null)
            blocksAddedAll.push(re);
        return re!;
    }

    protected checkResponse(resp: Uint8Array, code: number = 0) {
        this.checkResponseWithCode(resp, code);
    }

    protected checkResponseWithCode(resp: Uint8Array, code: number) {

        const result2 = JSON.parse(resp.toString()) as Map<string, any>;
        const error = result2.get("errorcode") as number;
        expect(error === code).toBeTruthy();
    }

    protected async checkBalanceWithKey(coin: Coin, ecKey: ECKey) {
        const a = new Array<ECKey>();
        a.push(ecKey);
        await this.checkBalance(coin, a);
    }

    protected async checkBalance(coin: Coin, a: ECKey[]) {
        const ulist = await this.getBalanceByKeys(false, a);
        let myutxo: UTXO | null = null;
        for (const u of ulist) {
            if (coin.getTokenHex() === (u.getTokenId()) && coin.getValue() === (u.getValue().getValue())) {
                myutxo = u;
                break;
            }
        }
        expect(myutxo !== null).toBeTruthy();
        expect(myutxo!.getAddress() !== null && myutxo!.getAddress()!.length > 0).toBeTruthy();
        console.log(myutxo!.toString());
    }

    protected async checkBalanceSumWithKey(coin: Coin, a: ECKey) {
        const keys = new Array<ECKey>();
        keys.push(a);
        await this.checkBalanceSum(coin, keys);
    }

    protected async checkBalanceSum(coin: Coin, a: ECKey[]) {
        const ulist = await this.getBalanceByKeys(false, a);

        let sum = new Coin(BigInt(0), coin.getTokenid());
        for (const u of ulist) {
            if (coin.getTokenHex() === (u.getTokenId())) {
                sum = sum.add(u.getValue());

            }
        }
        if (coin.getValue() !== sum.getValue()) {
            console.log(" expected: " + coin + " got: " + sum);
        }
        expect(coin.getValue() === sum.getValue()).toBeTruthy();

    }

    // create a token with multi sign
    protected async testCreateMultiSigToken(keys: ECKey[], tokenInfo: TokenInfo) {
        const tokenid = await this.createFirstMultisignToken(keys, tokenInfo);


        const amount = BigInt("200000");
        const basecoin = new Coin(amount, Buffer.from(tokenid, 'hex'));

        const requestParam00 = new Map<string, string>();
        requestParam00.set("tokenid", tokenid);
        const resp2 = await OkHttp3Util.postStringSingle(this.contextRoot + ReqCmd.getTokenIndex,
            JSON.stringify(Object.fromEntries(requestParam00)));

        const tokenIndexResponse = TokenIndexResponse.fromJson(JSON.parse(resp2.toString()));
        const tokenindex_ = tokenIndexResponse.getTokenindex();


        const tokens = Token.buildSimpleTokenInfo(true, tokenIndexResponse.getBlockhash()!, tokenid, "test", "test", 3,
            tokenindex_!, amount, false, 0, UtilGeneseBlock.createGenesis(this.networkParameters).getHashAsString());
        const kv = new KeyValue();
        kv.setKey("testkey");
        kv.setValue("testvalue");
        tokens.addKeyvalue(kv);

        tokenInfo.setToken(tokens);

        const key1 = keys[1];
        tokenInfo.getMultiSignAddresses().push(new MultiSignAddress(tokenid, "", key1.getPublicKeyAsHex()));

        const key2 = keys[2];
        tokenInfo.getMultiSignAddresses().push(new MultiSignAddress(tokenid, "", key2.getPublicKeyAsHex()));

        const multiSignAddresses = tokenInfo.getMultiSignAddresses();
        const permissionedAddressesResponse = await this
            .getPrevTokenMultiSignAddressList(tokenInfo.getToken()!);
        if (permissionedAddressesResponse !== null && permissionedAddressesResponse.getMultiSignAddresses() !== null
            && permissionedAddressesResponse.getMultiSignAddresses().length > 0) {
            for (const multiSignAddress of permissionedAddressesResponse.getMultiSignAddresses()) {
                const pubKeyHex = multiSignAddress.getPubKeyHex();
                multiSignAddresses.push(new MultiSignAddress(tokenid, "", pubKeyHex!));
            }
        }

        const requestParam = new Map<string, string>();
        const data = await OkHttp3Util.postAndGetBlock(this.contextRoot + ReqCmd.getTip,
            JSON.stringify(Object.fromEntries(requestParam)));
        let block = this.networkParameters.getDefaultSerializer().makeBlock(data);
        block.setBlockType(BlockType.BLOCKTYPE_TOKEN_CREATION);
        block.addCoinbaseTransaction(keys[2].getPubKey(), basecoin, tokenInfo, new MemoInfo("coinbase"));
        block = await this.adjustSolve(block);

        console.log("block hash : " + block.getHashAsString());

        await OkHttp3Util.post(this.contextRoot + ReqCmd.signToken, block.bitcoinSerialize());

        const ecKeys = new Array<ECKey>();
        ecKeys.push(key1);
        ecKeys.push(key2);

        for (const ecKey of ecKeys) {
            const requestParam0 = new Map<string, any>();
            requestParam0.set("address", ecKey.toAddress(this.networkParameters).toBase58());
            const resp = await OkHttp3Util.postStringSingle(this.contextRoot + ReqCmd.getTokenSignByAddress,
                JSON.stringify(Object.fromEntries(requestParam0)));
            console.log(resp);

            const multiSignResponse = MultiSignResponse.fromJson(JSON.parse(resp.toString()));

            if (multiSignResponse.getMultiSigns() === null || multiSignResponse.getMultiSigns().length == 0)
                continue;

            const blockhashHex = multiSignResponse.getMultiSigns()[tokenindex_ as number].getBlockhashHex();
            const payloadBytes = Buffer.from(blockhashHex!, 'hex');

            const block0 = this.networkParameters.getDefaultSerializer().makeBlock(payloadBytes);
            const transaction = block0.getTransactions()![0];

            let multiSignBies: MultiSignBy[] | null = null;
            if (transaction.getDataSignature() === null) {
                multiSignBies = new Array<MultiSignBy>();
            } else {
                const multiSignByRequest = MultiSignByRequest.fromJson(JSON.parse(transaction.getDataSignature()!.toString()));
                multiSignBies = multiSignByRequest.getMultiSignBies();
            }
            const sighash = transaction.getHash();
            const party1Signature = await ecKey.sign(sighash!);
            const buf1 = party1Signature.encodeToDER();

            const multiSignBy0 = new MultiSignBy();
            multiSignBy0.setTokenid(tokenid);
            multiSignBy0.setTokenindex(tokenindex_!);
            multiSignBy0.setAddress(ecKey.toAddress(this.networkParameters).toBase58());
            multiSignBy0.setPublickey(Utils.toHexString(ecKey.getPubKey()));
            multiSignBy0.setSignature(Utils.toHexString(buf1));
            multiSignBies!.push(multiSignBy0);
            const newMultiSignByRequest = MultiSignByRequest.create(multiSignBies!);
            transaction.setDataSignature(Buffer.from(JSON.stringify(newMultiSignByRequest.toJson())));
            this.checkResponse(await OkHttp3Util.post(this.contextRoot + ReqCmd.signToken, block0.bitcoinSerialize()));

        }

        await this.checkBalance(basecoin, key1);
    }

    private async createFirstMultisignToken(keys: ECKey[], tokenInfo: TokenInfo): Promise<string> {
        const tokenid = keys[1].getPublicKeyAsHex();

        const basecoin = new MonetaryFormat().parse("678900000");

        const requestParam00 = new Map<string, string>();
        requestParam00.set("tokenid", tokenid);
        const resp2 = await OkHttp3Util.postStringSingle(this.contextRoot + ReqCmd.getTokenIndex,
            JSON.stringify(Object.fromEntries(requestParam00)));

        const tokenIndexResponse = TokenIndexResponse.fromJson(JSON.parse(resp2.toString()));
        const tokenindex_ = tokenIndexResponse.getTokenindex();
        const prevblockhash = tokenIndexResponse.getBlockhash();

        const tokens = Token.buildSimpleTokenInfo(true, prevblockhash!, tokenid, "test", "test", 3, tokenindex_!,
            basecoin.getValue(), false, 0, UtilGeneseBlock.createGenesis(this.networkParameters).getHashAsString());
        tokenInfo.setToken(tokens);

        const key1 = keys[1];
        tokenInfo.getMultiSignAddresses().push(new MultiSignAddress(tokenid, "", key1.getPublicKeyAsHex()));

        const key2 = keys[2];
        tokenInfo.getMultiSignAddresses().push(new MultiSignAddress(tokenid, "", key2.getPublicKeyAsHex()));

        const multiSignAddresses = tokenInfo.getMultiSignAddresses();
        const permissionedAddressesResponse = await this
            .getPrevTokenMultiSignAddressList(tokenInfo.getToken()!);
        if (permissionedAddressesResponse !== null && permissionedAddressesResponse.getMultiSignAddresses() !== null
            && permissionedAddressesResponse.getMultiSignAddresses().length > 0) {
            for (const multiSignAddress of permissionedAddressesResponse.getMultiSignAddresses()) {
                const pubKeyHex = multiSignAddress.getPubKeyHex();
                multiSignAddresses.push(new MultiSignAddress(tokenid, "", pubKeyHex!));
            }
        }

        await this.wallet.saveToken(tokenInfo, basecoin, keys[1], null);
        return tokenid;
    }

    public async saveTokenUnitTest(tokenInfo: TokenInfo, basecoin: Coin, outKey: ECKey, aesKey: any,
        addedBlocks: Block[], feepay: boolean, overrideHash1?: Block, overrideHash2?: Block): Promise<Block> {
        if (feepay)
            await this.payBigTo(outKey, Coin.FEE_DEFAULT.getValue(), addedBlocks);
        const block = await this.makeTokenUnitTestFull(tokenInfo, basecoin, outKey, aesKey, overrideHash1!, overrideHash2!);
        await OkHttp3Util.post(this.contextRoot + ReqCmd.signToken, block.bitcoinSerialize());

        const permissionedAddressesResponse = await this
            .getPrevTokenMultiSignAddressList(tokenInfo.getToken()!);
        const multiSignAddress = permissionedAddressesResponse.getMultiSignAddresses()[0];

        await this.pullBlockDoMultiSign(tokenInfo.getToken()!.getTokenid()!, outKey, aesKey);
        const genesiskey = ECKey.fromPrivate(Buffer.from(RemoteTest.testPriv, 'hex'));
        await this.pullBlockDoMultiSign(tokenInfo.getToken()!.getTokenid()!, genesiskey, null);

        return block;
    }

    public async createTokenWithMemo(key: ECKey, tokename: string, decimals: number, domainname: string, description: string,
        amount: bigint, increment: boolean, tokenKeyValues: TokenKeyValues, tokentype: number, tokenid: string,
        w: Wallet, pubkeyTo: Uint8Array, memoInfo: MemoInfo): Promise<Block> {

        const token = Token.buildSimpleTokenInfo(true, Sha256Hash.ZERO_HASH.toString(), tokenid, tokename, description, 1, 0,
            amount, !increment, decimals, "");
        token.setTokenKeyValues(tokenKeyValues);
        token.setTokentype(tokentype);
        const addresses = new Array<MultiSignAddress>();
        addresses.push(new MultiSignAddress(tokenid, "", key.getPublicKeyAsHex()));
        return w.createToken(key, domainname, increment, token, addresses, pubkeyTo, memoInfo);

    }

    // for unit tests
    public async saveTokenUnitTestWithBlocks(tokenInfo: TokenInfo, basecoin: Coin, outKey: ECKey, aesKey: any,
        addedBlocks: Block[]): Promise<Block> {

        tokenInfo.getToken()!.setTokenname(UUIDUtil.randomUUID());
        return this.saveTokenUnitTest(tokenInfo, basecoin, outKey, aesKey, addedBlocks, true);
    }

    public async saveTokenUnitTestWithTokenname(tokenInfo: TokenInfo, basecoin: Coin, outKey: ECKey, aesKey: any, addedBlocks: Block[] = [], feepay: boolean = true): Promise<Block> {
        return this.saveTokenUnitTest(tokenInfo, basecoin, outKey, aesKey, addedBlocks, feepay);
    }

    public async makeTokenUnitTest(tokenInfo: TokenInfo, basecoin: Coin, outKey: ECKey, aesKey: any): Promise<Block> {
        return this.makeTokenUnitTestFull(tokenInfo, basecoin, outKey, aesKey, null!, null!);
    }

    public async makeTokenUnitTestFull(tokenInfo: TokenInfo, basecoin: Coin, outKey: ECKey, aesKey: any,
        overrideHash1: Block, overrideHash2: Block): Promise<Block> {

        const tokenid = tokenInfo.getToken()!.getTokenid();
        const multiSignAddresses = tokenInfo.getMultiSignAddresses();
        const permissionedAddressesResponse = await this
            .getPrevTokenMultiSignAddressList(tokenInfo.getToken()!);
        if (permissionedAddressesResponse !== null && permissionedAddressesResponse.getMultiSignAddresses() !== null
            && permissionedAddressesResponse.getMultiSignAddresses().length > 0) {
            if (tokenInfo.getToken()!.getDomainName() === null || tokenInfo.getToken()!.getDomainName() === '') {
                tokenInfo.getToken()!.setDomainName(permissionedAddressesResponse.getDomainName()!);
            }
            for (const multiSignAddress of permissionedAddressesResponse.getMultiSignAddresses()) {
                const pubKeyHex = multiSignAddress.getPubKeyHex();
                multiSignAddresses.push(new MultiSignAddress(tokenid!, "", pubKeyHex!, 0));
            }
        }

        const requestParam = new Map<string, string>();
        const data = await OkHttp3Util.postAndGetBlock(this.contextRoot + ReqCmd.getTip,
            JSON.stringify(Object.fromEntries(requestParam)));
        let block = this.networkParameters.getDefaultSerializer().makeBlock(data);
        block.setBlockType(BlockType.BLOCKTYPE_TOKEN_CREATION);

        if (overrideHash1 !== null && overrideHash2 !== null) {
            block.setPrevBlockHash(overrideHash1.getHash());

            block.setPrevBranchBlockHash(overrideHash2.getHash());

            block.setHeight(Math.max(overrideHash2.getHeight()!, overrideHash1.getHeight()!) + 1);
        }

        block.addCoinbaseTransaction(outKey.getPubKey(), basecoin, tokenInfo, new MemoInfo("coinbase"));

        const transaction = block.getTransactions()![0];

        const sighash = transaction.getHash();

        const multiSignBies = new Array<MultiSignBy>();

        const party1Signature = await outKey.sign(sighash!);
        const buf1 = party1Signature.encodeToDER();
        let multiSignBy0 = new MultiSignBy();
        multiSignBy0.setTokenid(tokenInfo.getToken()!.getTokenid()!.trim());
        multiSignBy0.setTokenindex(0);
        multiSignBy0.setAddress(outKey.toAddress(this.networkParameters).toBase58());
        multiSignBy0.setPublickey(Utils.toHexString(outKey.getPubKey()));
        multiSignBy0.setSignature(Utils.toHexString(buf1));
        multiSignBies.push(multiSignBy0);

        const genesiskey = ECKey.fromPrivate(Buffer.from(RemoteTest.testPriv, 'hex'));
        const party2Signature = await genesiskey.sign(sighash!);
        const buf2 = party2Signature.encodeToDER();
        multiSignBy0 = new MultiSignBy();
        multiSignBy0.setTokenid(tokenInfo.getToken()!.getTokenid()!.trim());
        multiSignBy0.setTokenindex(0);
        multiSignBy0.setAddress(genesiskey.toAddress(this.networkParameters).toBase58());
        multiSignBy0.setPublickey(Utils.toHexString(genesiskey.getPubKey()));
        multiSignBy0.setSignature(Utils.toHexString(buf2));
        multiSignBies.push(multiSignBy0);

        const multiSignByRequest = MultiSignByRequest.create(multiSignBies);
        transaction.setDataSignature(Buffer.from(JSON.stringify(multiSignByRequest.toJson())));

        // add fee
        const w = await Wallet.fromKeys(this.networkParameters, outKey, this.contextRoot);
        block.addTransaction(await w.feeTransaction(aesKey));
        // save block
        const adjustedBlock = await this.adjustSolve(block);
        //

        return adjustedBlock;
    }

    public async createToken(key: ECKey, tokename: string, decimals: number, domainname: string, description: string,
        amount: bigint, increment: boolean, tokenKeyValues: TokenKeyValues, tokentype: number, tokenid: string,
        w: Wallet): Promise<Block> {
        w.importKey(key);
        const token = Token.buildSimpleTokenInfo(true, Sha256Hash.ZERO_HASH.toString(), tokenid, tokename, description, 1, 0,
            amount, !increment, decimals, "");
        token.setTokenKeyValues(tokenKeyValues);
        token.setTokentype(tokentype);
        const addresses = new Array<MultiSignAddress>();
        addresses.push(new MultiSignAddress(tokenid, "", key.getPublicKeyAsHex()));
        return w.createToken(key, domainname, increment, token, addresses);

    }

    public async getServerCalTokenIndex(tokenid: string): Promise<TokenIndexResponse> {
        const requestParam = new Map<string, string>();
        requestParam.set("tokenid", tokenid);
        const resp = await OkHttp3Util.postStringSingle(this.contextRoot + ReqCmd.getTokenIndex,
            JSON.stringify(Object.fromEntries(requestParam)));
        const tokenIndexResponse = TokenIndexResponse.fromJson(JSON.parse(resp.toString()));
        return tokenIndexResponse;
    }

    public async pullBlockDoMultiSign(tokenid: string, outKey: ECKey, aesKey: any): Promise<Block | null> {
        const requestParam = new Map<string, any>();

        const address = outKey.toAddress(this.networkParameters).toBase58();
        requestParam.set("address", address);
        requestParam.set("tokenid", tokenid);

        const resp = await OkHttp3Util.postStringSingle(this.contextRoot + ReqCmd.getTokenSignByAddress,
            JSON.stringify(Object.fromEntries(requestParam)));

        const multiSignResponse = MultiSignResponse.fromJson(JSON.parse(resp.toString()));
        if (multiSignResponse.getMultiSigns() === null || multiSignResponse.getMultiSigns().length == 0)
            return null;
        const multiSign = multiSignResponse.getMultiSigns()[0];

        const payloadBytes = Buffer.from(multiSign.getBlockhashHex() as string, 'hex');
        const block0 = this.networkParameters.getDefaultSerializer().makeBlock(payloadBytes);
        const transaction = block0.getTransactions()![0];

        let multiSignBies: MultiSignBy[] | null = null;
        if (transaction.getDataSignature() === null) {
            multiSignBies = new Array<MultiSignBy>();
        } else {
            const multiSignByRequest = MultiSignByRequest.fromJson(JSON.parse(transaction.getDataSignature()!.toString()));
            multiSignBies = multiSignByRequest.getMultiSignBies();
        }
        const sighash = transaction.getHash();
        const party1Signature = await outKey.sign(sighash!);
        const buf1 = party1Signature.encodeToDER();

        const multiSignBy0 = new MultiSignBy();

        multiSignBy0.setTokenid(multiSign.getTokenid()!);
        multiSignBy0.setTokenindex(multiSign.getTokenindex()!);
        multiSignBy0.setAddress(outKey.toAddress(this.networkParameters).toBase58());
        multiSignBy0.setPublickey(Utils.toHexString(outKey.getPubKey()));
        multiSignBy0.setSignature(Utils.toHexString(buf1));
        multiSignBies!.push(multiSignBy0);
        const multiSignByRequest = MultiSignByRequest.create(multiSignBies!);
        transaction.setDataSignature(Buffer.from(JSON.stringify(multiSignByRequest.toJson())));
        await OkHttp3Util.post(this.contextRoot + ReqCmd.signToken, block0.bitcoinSerialize());
        return block0;
    }

    public async getPrevTokenMultiSignAddressList(token: Token): Promise<PermissionedAddressesResponse> {
        const requestParam = new Map<string, string>();
        requestParam.set("domainNameBlockHash", token.getDomainNameBlockHash()!);
        const resp = await OkHttp3Util.postStringSingle(this.contextRoot + ReqCmd.getTokenPermissionedAddresses,
            JSON.stringify(Object.fromEntries(requestParam)));
        const permissionedAddressesResponse = PermissionedAddressesResponse.fromJson(JSON.parse(resp.toString()));
        return permissionedAddressesResponse;
    }

    public async send() {

        const requestParam = new Map<string, string>();
        const data = await OkHttp3Util.postAndGetBlock(this.contextRoot + ReqCmd.getTip,
            JSON.stringify(Object.fromEntries(requestParam)));

        const rollingBlock = this.networkParameters.getDefaultSerializer().makeBlock(data);
        rollingBlock.solve();

        await OkHttp3Util.post(this.contextRoot + ReqCmd.saveBlock, rollingBlock.bitcoinSerialize());

    }

    private async getBlockInfos(): Promise<any[]> {

        const lastestAmount = "200";
        const requestParam = new Map<string, any>();

        requestParam.set("lastestAmount", lastestAmount);
        const response = await OkHttp3Util.postStringSingle(this.contextRoot + "/" + ReqCmd.findBlockEvaluation,
            JSON.stringify(Object.fromEntries(requestParam)));
        const getBlockEvaluationsResponse = GetBlockEvaluationsResponse.fromJson(JSON.parse(response.toString()));
        return getBlockEvaluationsResponse.getEvaluations()!;
    }

    public balance(a: Tokensums) {

        const totalMapValue = new Map<string, bigint>();

        for (const utxo of a.getUtxos()!) {
            const address = utxo.getAddress();
            if (!address) continue; // Skip if address is null
            
            const amount = utxo.getValue().getValue();
            const currentAmount = totalMapValue.get(address) || BigInt(0);
            totalMapValue.set(address, currentAmount + amount);
        }
        console.log(totalMapValue.toString());
    }


    public async sell(blocksAddedAll: Block[]) {

        const keyStrHex000 = new Array<string>();

        for (const ecKey of await this.wallet.keys(null)) {
            keyStrHex000.push(Utils.toHexString(ecKey.getPubKeyHash()));
        }

        const response = await OkHttp3Util.postStringSingle(this.contextRoot + ReqCmd.getBalances,
            JSON.stringify(keyStrHex000));

        const getBalancesResponse = GetBalancesResponse.fromJson(JSON.parse(response.toString()));
        const utxos = getBalancesResponse.getOutputs();
        utxos.sort(() => Math.random() - 0.5);
        // long q = 8;
        for (const utxo of utxos) {
            if (NetworkParameters.BIGTANGLE_TOKENID_STRING !== (utxo.getTokenId())
                && utxo.getValue().isGreaterThan(Coin.ZERO)) {
                this.wallet.setServerURL(this.contextRoot);
                try {
                    const sellOrder = await this.wallet.sellOrder(null, utxo.getTokenId()!, BigInt(100), BigInt(1000), null, null,
                        NetworkParameters.BIGTANGLE_TOKENID_STRING, true);
                    blocksAddedAll.push(sellOrder);

                } catch (e) {
                    if (e instanceof InsufficientMoneyException) {
                        // ignore: handle exception
                    } else {
                        console.error(e);
                    }
                }
                // break;
            }

        }
    }

    public async payMoneyToWallet1(blocksAddedAll: Block[]) {

        const giveMoneyResult = new Map<string, bigint>();

        for (let i = 0; i < 10; i++) {
            giveMoneyResult.set(ECKey.createNewKey().toAddress(this.networkParameters).toString(),
                BigInt(3333000000) / BigInt(Math.pow(2, 1)));
        }

        const b = await this.wallet.payMoneyToECKeyList(null, giveMoneyResult, new MemoInfo("payMoneyToWallet1"));
        blocksAddedAll.push(b);
        // makeRewardBlock(blocksAddedAll);
    }

    public async buyAll(blocksAddedAll: Block[]) {

        const requestParam = new Map<string, any>();
        const response0 = await OkHttp3Util.postStringSingle(this.contextRoot + ReqCmd.getOrders,
            JSON.stringify(Object.fromEntries(requestParam)));

        const orderdataResponse = OrderdataResponse.fromJson(JSON.parse(response0.toString()));

        for (const orderRecord of orderdataResponse.getAllOrdersSorted()!) {
            try {
                await this.buy(orderRecord, blocksAddedAll);
            } catch (e) {
                if (e instanceof InsufficientMoneyException) {
                    await new Promise(resolve => setTimeout(resolve, 4000));
                } else {
                    console.log("", e);
                }
            }
        }
    }

    public async buy(orderRecord: OrderRecord, blocksAddedAll: Block[]) {

        if (NetworkParameters.BIGTANGLE_TOKENID_STRING !== (orderRecord.getOfferTokenid())) {
            // sell order and make buy
            const price = orderRecord.getTargetValue()! / orderRecord.getOfferValue()!;

            const buyOrder = await this.wallet.buyOrder(null, orderRecord.getOfferTokenid()!, price, orderRecord.getOfferValue()!,
                null, null, NetworkParameters.BIGTANGLE_TOKENID_STRING, false);
            blocksAddedAll.push(buyOrder);
            // makeOrderExecutionAndReward(blocksAddedAll);

        }

    }



    public createUserkey(): ECKey[] {
        const userkeys = new Array<ECKey>();
        const s = ["0927cf94d82b0a0f1c8f06f127844034820aecd0adbaaf67c962d3eb6b0a6ea8",
            "a2ba304ed68e2835ba3282e10380e31c8fe605fc232b88e497846654193ba38a",
            "b96358b80bbf822fea87f2a5eea33dcffbf15e7f1c9691b3cd643cbb24ea6821",
            "256f4faea34cbec71ae22d6f6b4ea80bddd5d7ef7c70530be78506b83bed7aea",
            "6d2538a814150fb28d086dec83a1389d1f4f5583d996883c1cd0972c21d773c1",
            "8ee39e7c10e31d7cfcf31d99d469b107e78120d84cff23aa38224504413e6b52",

            "0d59be5cafdf76f40be223c818d7ed61c9c374a973f6356c4a87cc13d610a2e2",
            "f42955011b4848fd6d26f898f937176a8549f3641000845223cef81078c8b92b",
            "2212ea2b6bb6479021f994632fa66f891b5953e04db0f5316347de2a45e1d6c2",
            "0b3451d9dd2d411a177ca3131e0e90c3f028c1534ca886f13af52ac442edd6fa"

        ];
        for (const priv of s) {
            const key = ECKey.fromPrivateString(priv);
            userkeys.push(key);
        }
        return userkeys;
    }


    /**
     * Selects two blocks to approve via MCMC for the given prototype block such
     * that the two approved blocks are not conflicting with the prototype block
     * itself
     *
     * @param prototype Existing solid block that is considered when walking
     * @return
     * @throws VerificationException if the given prototype is not compatible with
     *                               the current milestone
     */

}
