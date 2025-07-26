import { MainNetParams } from './src/net/bigtangle/params/MainNetParams';
import { UtilGeneseBlock } from './src/net/bigtangle/core/UtilGeneseBlock';
import { Buffer } from 'buffer';

const PARAMS = MainNetParams.get();
const block = UtilGeneseBlock.createGenesis(PARAMS);
const blockBytes = Buffer.from(block.bitcoinSerialize());

console.log('Block bytes length:', blockBytes.length);
console.log('First 200 bytes:', blockBytes.slice(0, 200).toString('hex'));

// Let's examine the transaction part specifically
const transactionOffset = 168; // Header size
console.log('Transaction offset:', transactionOffset);
console.log('Transaction bytes:', blockBytes.slice(transactionOffset, transactionOffset + 100).toString('hex'));
