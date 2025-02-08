/**
 * @file walletController.js
 * @description Controller for handling wallet operations.
 * @author Jeya kumar
 * @version 1.0.0
 * @date 2025-02-06
 */
const bip39 = require("bip39");
const BIP32Factory = require("bip32").BIP32Factory;
const bitcoin = require("bitcoinjs-lib");
const axios = require("axios");
const walletUtils = require('../utils/walletUtils');
const config = require("../config/config");
const { ECPairFactory } =  require('ecpair');
const ecc = require('tiny-secp256k1');
const { validate } = require('bitcoin-address-validation');
const { validationResult } = require('express-validator');

const ECPair = ECPairFactory(ecc);
const bip32 = BIP32Factory(ecc);
bitcoin.initEccLib(ecc);

/** This function is used to create wallet. */
exports.createWallet = async function (req, res) {
  const mnemonicKey = walletUtils.generateMnemonic();
  const address = walletUtils.getAddress(mnemonicKey, walletUtils.getNetwork(), walletUtils.getDerivationPath());
  res.status(200).json({
    status:true,
    message:"Wallet created successfully!",
    addressInfo: {
      address: address,
      mnemonic: mnemonicKey,
    },
  });
};
/** This function is used to get wallet balance. */
exports.getBalance = async function (req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status:true,
      message:"400 Bad request",
      errors: errors.array(),
    });
  }
  const { address } = req.query;
  const result = await walletUtils.getUnspents(address);
  res.status(result.status ? 200 : 500).json(result);
};

/** This function is used to get transaction history. */
exports.getTransactionHistory = async function (req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status:true,
      message:"400 Bad request",
      errors: errors.array(),
    });
  }
  const { address } = req.query;
    axios.get(`${config.blockBookUrl}api/v2/address/${address}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Accept": "application/json",
    }
  }).then((result) => {
    res.status(200).json({
      status:true,
      message:"History retrived successfully!",
      unspents: result.data,
    });
  }).catch((error) => {
    res.status(500).json({
      status:true,
      message:"Something went wrong",
      unspents: [],
    });
  });
};

/** This function is used to create transaction. */
exports.createTransaction = async function (req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status:true,
      message:"400 Bad request",
      errors: errors.array(),
    });
  }
  const { mnemonic, toAddress, amount } = req.body;
  const fromAddress = walletUtils.getAddress(mnemonic, walletUtils.getNetwork(), walletUtils.getDerivationPath());
  const psbt = new bitcoin.Psbt({ network: walletUtils.getNetwork() })
  const unspentResult = await walletUtils.getUnspents(fromAddress);
  if (unspentResult.unspents.length === 0) {
    return res.status(200).json({
      status:false,
      message:"insufficient funds",
    });
  }
  let requiredAmount = Number(amount) * 10**8 + 5 * 114;
  let finalInputs = [];
  let finalOutputs = [];
  while (true) {
    const inputs = [];
    const preparedInputs = await walletUtils.getInputs(unspentResult.unspents, requiredAmount);
    if (preparedInputs.sumAmount < requiredAmount) {
      return res.status(200).json({
        status:false,
        message:"insufficient funds!",
      });
    }
    let inputAmount = 0;
    for (let i = 0; i < preparedInputs.inputs.length; i++) {
      const element = preparedInputs.inputs[i];
      inputs.push({
        hash: element.txid,
        index: element.vout,
        witnessUtxo: {
          script: bitcoin.address.toOutputScript(fromAddress, walletUtils.getNetwork()),
          value: Number(element.value),
        },
        sequence: 0xfffffffd
      })
      inputAmount += Number(element.value);
    }
    const outputs = [{
      address: toAddress,
      value: Math.round(Number(amount) * 10**8),
    }]
    let outputAmount = Math.round(Number(amount) * 10**8);
    let transactionFee = 5 * walletUtils.calculateVirtualSize(inputs, outputs, walletUtils.getNetwork(), walletUtils.getChildNode(mnemonic));
    let changeAmount = inputAmount - outputAmount - transactionFee;
    if (inputAmount - outputAmount < transactionFee) {
      requiredAmount += transactionFee;
    } else if (changeAmount === 0 || changeAmount < 0.00001 * 10 ** 8) {
      finalInputs = inputs;
      finalOutputs = outputs;
      break;
    } else {
      let dummyOutputs = [...outputs];
      dummyOutputs.push({
        address: fromAddress,
        value: Math.round(changeAmount),
      })
      transactionFee = 5 * walletUtils.calculateVirtualSize(inputs, dummyOutputs, walletUtils.getNetwork(), walletUtils.getChildNode(mnemonic));
      changeAmount = inputAmount - outputAmount - transactionFee;
      if ((inputAmount - outputAmount) > transactionFee) {
        finalInputs = inputs;
        finalOutputs = [...outputs];
        if (changeAmount >= 0.00001 * 10 ** 8) {
          finalOutputs.push({
            address: fromAddress,
            value: Math.round(changeAmount),
          })
        }
        break;
      } else {
        requiredAmount += transactionFee;
      }
    }
  }
  psbt.addInputs(finalInputs);
  psbt.addOutputs(finalOutputs);
  const childNode = walletUtils.getChildNode(mnemonic);
  const keyPair = ECPair.fromWIF(childNode.toWIF().toString('hex'), walletUtils.getNetwork());
  for (let index = 0; index < finalInputs.length; index++) {
    const childNode = walletUtils.getChildNode(mnemonic);
    psbt.signInput(index, {
      publicKey: Buffer.from(childNode.publicKey),
      sign: (hash) => {
        const signature = keyPair.sign(hash);
        return Buffer.from(signature); 
      },
    });
  }
  psbt.finalizeAllInputs();
  const hex = psbt.extractTransaction(true).toHex();
  const txResult = await walletUtils.sendTransaction(hex);
  res.status(200).json({
    status:true,
    message: txResult.message,
    txId: txResult.txId,
  });
};