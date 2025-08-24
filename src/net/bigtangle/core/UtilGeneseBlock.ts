import { Block } from './Block';
import { Transaction } from './Transaction';
import { TransactionOutput } from './TransactionOutput';
import { NetworkParameters } from '../params/NetworkParameters';
import { Sha256Hash } from './Sha256Hash';
import { BlockType } from './BlockType';
import { Coin } from './Coin';
 
import { ECKey } from './ECKey';
import { Utils } from './Utils';
import { Script } from '../script/Script';
import { ScriptBuilder } from '../script/ScriptBuilder';
import { TransactionInput } from './TransactionInput';
import { RewardInfo } from './RewardInfo';
 

export class UtilGeneseBlock {

    public static createGenesis(params: NetworkParameters): Block {
        const genesisBlock: Block = Block.setBlock7(
            params,
            Sha256Hash.ZERO_HASH,
            Sha256Hash.ZERO_HASH,
            BlockType.BLOCKTYPE_INITIAL,
            0,
            0,
            Utils.encodeCompactBits(params.getMaxTarget())
        );

        // Set the correct time as expected by the test
        genesisBlock.setTime(1532896109);
        genesisBlock.setDifficultyTarget(Utils.encodeCompactBits(params.getMaxTarget()));

        const coinbase: Transaction = new Transaction(params);
        const inputBuilder: ScriptBuilder = new ScriptBuilder();
        coinbase.addInput(TransactionInput.fromScriptBytes(params, coinbase, inputBuilder.build().getProgram()));

        const rewardInfo: RewardInfo = new RewardInfo(
            Sha256Hash.ZERO_HASH,
            Utils.encodeCompactBits(params.getMaxTarget()),
            new Set<Sha256Hash>(),
            0
        );

        coinbase.setData(rewardInfo.toByteArray());


        this.add(params, NetworkParameters.BigtangleCoinTotal, params.getGenesisPub(), coinbase);

        genesisBlock.addTransaction(coinbase);
        genesisBlock.setNonce(0);
        genesisBlock.setHeight(0);
        return genesisBlock;
    }

    public static add(params: NetworkParameters, amount: bigint, account: string, coinbase: Transaction): void {
        // amount, many public keys
        const list: string[] = account.split(",");
        const base: Coin = new Coin(amount, NetworkParameters.getBIGTANGLE_TOKENID());
        const keys: ECKey[] = [];
        for (const s of list) {
            keys.push(ECKey.fromPublicOnly(Utils.HEX.decode(s.trim())));
        }
        if (keys.length <= 1) {
            coinbase.addOutput(new TransactionOutput(params, coinbase, base,
                ScriptBuilder.createOutputScript(ECKey.fromPublicOnly(keys[0].getPubKey())).getProgram()));
        } else {
            const scriptPubKey: Script = ScriptBuilder.createMultiSigOutputScript(keys.length - 1, keys);
            coinbase.addOutput(new TransactionOutput(params, coinbase, base, scriptPubKey.getProgram()));
        }
    }
}