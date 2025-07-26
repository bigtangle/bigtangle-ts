"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MainNetParams_1 = require("./src/net/bigtangle/params/MainNetParams");
const UtilGeneseBlock_1 = require("./src/net/bigtangle/core/UtilGeneseBlock");
const buffer_1 = require("buffer");
const PARAMS = MainNetParams_1.MainNetParams.get();
const block = UtilGeneseBlock_1.UtilGeneseBlock.createGenesis(PARAMS);
const blockBytes = buffer_1.Buffer.from(block.bitcoinSerialize());
console.log('Block bytes length:', blockBytes.length);
console.log('First 200 bytes:', blockBytes.slice(0, 200).toString('hex'));
// Let's examine the transaction part specifically
const transactionOffset = 168; // Header size
console.log('Transaction offset:', transactionOffset);
console.log('Transaction bytes:', blockBytes.slice(transactionOffset, transactionOffset + 100).toString('hex'));
