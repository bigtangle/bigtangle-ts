/*
 * Copyright 2011 Google Inc.
 * Copyright 2014 Andreas Schildbach
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Block } from '../core/Block';
import { BlockType } from '../core/BlockType';
import { Coin } from '../core/Coin';
import { ECKey } from '../core/ECKey';
import { RewardInfo } from '../core/RewardInfo';
import { Sha256Hash } from '../core/Sha256Hash';
import { Transaction } from '../core/Transaction';
import { TransactionInput } from '../core/TransactionInput';
import { TransactionOutput } from '../core/TransactionOutput';
import { Utils } from './Utils';
import { NetworkParameters } from '../params/NetworkParameters';
import { Script } from '../script/Script';
import { ScriptBuilder } from '../script/ScriptBuilder';
import bigInt, { BigInteger } from 'big-integer';

/**
 * A collection of various utility methods that are helpful for working with the
 * Bitcoin protocol. To enable debug logging from the library, run with
 * -Dbitcoinj.logging=true on your command line.
 */
export class UtilGeneseBlock {
    public static add(params: NetworkParameters, amount: BigInteger, account: string, coinbase: Transaction) {
    // amount, many public keys
    const list = account.split(',');
    // Convert BigInteger to bigint
    const amountBigInt = BigInt(amount.toString());
    const base = new Coin(amountBigInt, Buffer.from(NetworkParameters.BIGTANGLE_TOKENID_STRING));
    const keys: ECKey[] = [];
    for (const s of list) {
      keys.push(ECKey.fromPublic(Buffer.from(s.trim(), 'hex')));
    }
    if (keys.length <= 1) {
      coinbase.addOutput(
        new TransactionOutput(
          params,
          coinbase,
          base,
          Buffer.from(
            ScriptBuilder.createOutputScript(ECKey.fromPublic(Buffer.from(keys[0].getPubKey()))).getProgram(),
          ),
        ),
      );
    } else {
      const scriptPubKey: Script = ScriptBuilder.createMultiSigOutputScript(keys.length - 1, keys);
      coinbase.addOutput(new TransactionOutput(params, coinbase, base, Buffer.from(scriptPubKey.getProgram())));
    }
  }

    public static createGenesis(params: NetworkParameters): Block {
        // Use the Block factory method to create a genesis block
        // Convert bigint to BigInteger
        const maxTargetBigInt = bigInt(params.getMaxTarget().toString());
        const maxTargetRewardBigInt = bigInt(params.getMaxTargetReward().toString());
        
        // Now convert to compact bits
        const maxTarget = Number(Utils.encodeCompactBits(maxTargetBigInt));
        const maxTargetReward = Number(Utils.encodeCompactBits(maxTargetRewardBigInt));
        
        const genesisBlock = Block.fromGenesis(
            params,
            Sha256Hash.ZERO_HASH,
            Sha256Hash.ZERO_HASH,
            BlockType.BLOCKTYPE_INITIAL,
            1532896109,
            0,
            maxTarget
        );
        
        genesisBlock.setDifficultyTarget(maxTarget);
        const coinbase = new Transaction(params);
        const inputBuilder = new ScriptBuilder();
        coinbase.addInput(new TransactionInput(params, coinbase, Buffer.from(inputBuilder.build().getProgram())));
        
        const rewardInfo = new RewardInfo(
            Sha256Hash.ZERO_HASH,
            maxTargetReward,
            new Set<Sha256Hash>(),
            0  // Use number instead of BigInteger
        );

        coinbase.setData(Buffer.from(rewardInfo.toByteArray()));
        this.add(params, bigInt(NetworkParameters.BigtangleCoinTotal.toString()), params.genesisPub, coinbase);
        genesisBlock.addTransaction(coinbase);
        genesisBlock.setNonce(0); // Use number instead of BigInteger
        genesisBlock.setHeight(0);
        return genesisBlock;
    } 
     
}
