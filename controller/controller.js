const bip39 = require("bip39");
const BIP32Factory = require("bip32").BIP32Factory;
// const ecc = require("@bitcoinerlab/secp256k1");
const bitcoin = require("bitcoinjs-lib");
const axios = require("axios");
const commonUtils = require('../utils/commonUtils');
const config = require("../config/config");
const { ECPairFactory } =  require('ecpair');
const ecc = require('tiny-secp256k1');
const { validate } = require('bitcoin-address-validation');

const ECPair = ECPairFactory(ecc);
const bip32 = BIP32Factory(ecc);
bitcoin.initEccLib(ecc);

// This function is used to creating wallet
exports.createWallet = async function (req, res) {
  const mnemonicKey = commonUtils.generateMnemonic();
  const address = getAddress(mnemonicKey, commonUtils.getNetwork(), commonUtils.getDerivationPath());
  res.status(200).json({
    status:true,
    message:"Wallet created successfully!",
    addressInfo: {
      address: address.address,
      mnemonic: mnemonicKey,
    },
  });
};
// This function is used to get wallet balance
exports.getBalance = async function (req, res) {
  const { address } = req.query;
  const result = await commonUtils.getUnspents(address);
  res.status(result.status ? 200 : 500).json(result);
};

// This function is used to get transaction history.
exports.getTransactionHistory = async function (req, res) {
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

// This function is used to create transaction.
exports.createTransaction = async function (req, res) {
  const { mnemonic, toAddress, amount } = req.body;
  const fromAddress = commonUtils.getAddress(mnemonic, commonUtils.getNetwork(), commonUtils.getDerivationPath());
  const psbt = new bitcoin.Psbt({ network: commonUtils.getNetwork() })
  const unspentResult = await commonUtils.getUnspents(fromAddress);
  const inputs = [];
  const preparedInputs = await commonUtils.getInputs(unspentResult.unspents, Number(amount) * 10**8);
  for (let i = 0; i < preparedInputs.inputs.length; i++) {
    const element = preparedInputs.inputs[i];
    inputs.push({
      hash: element.txid,
      index: element.vout,
      witnessUtxo: {
        script: bitcoin.address.toOutputScript(fromAddress, commonUtils.getNetwork()),
        value: Number(element.value),
      },
      sequence: 0xfffffffd
    })
  }
  const outputs = [{
    address: toAddress,
    value: Math.round(Number(amount) * 10**8),
  }]
  const transactionSize = commonUtils.calculateTransactionSize(inputs, outputs);
  let changeAmount = preparedInputs.sumAmount - Number(amount) * 10 ** 8;
  if (unspentResult.unspents.length === 0 || Number(amount) * 10 ** 8 + transactionSize * 5 > preparedInputs.sumAmount) {
    return res.status(200).json({
      status:false,
      message:"insufficient funds",
    });
  }
  if ( changeAmount - transactionSize * 5 > 0 && changeAmount - transactionSize * 5 >= 0.00001 * 10 ** 8) {
    outputs.push({
      address: fromAddress,
      value: Math.round(changeAmount - transactionSize * 5),
    })
  }
  psbt.addInputs(inputs);
  psbt.addOutputs(outputs);
  const childNode = commonUtils.getChildNode(mnemonic);
  const keyPair = ECPair.fromWIF(childNode.toWIF().toString('hex'), commonUtils.getNetwork());
  for (let index = 0; index < inputs.length; index++) {
    const childNode = commonUtils.getChildNode(mnemonic);
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
  const txResult = await commonUtils.sendTransaction(hex);
  console.log("===== HEX =====", txResult);
  res.status(200).json({
    status:true,
    message: txResult.message,
    txId: txResult.txId,
  });
};