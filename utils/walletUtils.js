/**
 * @file walletUtils.js
 * @description Common utility functions for wallet operations.
 * @author Jeya kumar
 * @version 1.0.0
 * @date 2025-02-06
 */
const bip39 = require("bip39");
const config = require("../config/config");
const bitcoin = require("bitcoinjs-lib");
const axios = require("axios");
const ecc = require("@bitcoinerlab/secp256k1");
const BIP32Factory = require("bip32").BIP32Factory;
const bip32 = BIP32Factory(ecc);
const { getAddressInfo } = require('bitcoin-address-validation');


/** This function used to generate a mnemonic key. */
exports.generateMnemonic = () => {
    return bip39.generateMnemonic();
}

/** This function used to get network. */
exports.getNetwork = () => {
    if (config.network === "testnet") {
        return bitcoin.networks.testnet;
    }
    if (config.network === "mainnet") {
        return bitcoin.networks.bitcoin;
    }
    return bitcoin.networks.regtest;
}
/** This function is used to get the derivation path from the config. */
exports.getDerivationPath = () => {
  return config.network === "testnet" || config.network === "regtest" ? config.testnetDerivationPath : config.mainnetDerivationPath;
}
/** This function is used to get an unspent list using an address. */
exports.getUnspents = async (address) => {
    try {
        const result = await axios.get(`${config.blockBookUrl}api/v2/utxo/${address}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept": "application/json",
            }
        })
        return {
            status:true,
            message:"Balance retrived successfully!",
            unspents: result.data,
        }
    } catch (error) {
        return {
            status:false,
            message:"Something went wrong",
            unspents: [],
        }
    }
}
/** This function is used to prepare inputs */
exports.getInputs = async (unspentOutputs, amount) => {
    let unspents = unspentOutputs.sort((a, b) => Number(b.value) - Number(a.value));
    let sumAmount = 0;
    let inputs = [];
    for (let i = 0; i < unspents.length; i++) {
        if (sumAmount > amount) break;
        if ((!unspents[i].coinbase && unspents[i].confirmations >= 6) || (unspents[i].coinbase && unspents[i].confirmations >= 100)) {
            sumAmount += Number(unspents[i].value);
            inputs.push(unspents[i])
        }
    }
    return {
        sumAmount,
        inputs,
    }
}
/** This function is used to get the child node. */
exports.getChildNode = (mnemonic) => {
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const rootKey = bip32.fromSeed(seed, bitcoin.networks.testnet);
  let derivationPath = config.network === "testnet" || config.network === "regtest" ? config.testnetDerivationPath : config.mainnetDerivationPath;
  const childNode = rootKey.derivePath(derivationPath)
  return childNode.derive(0).derive(config.derivationIndex)
}
/** This function is used to submit the transaction to the node. */
exports.sendTransaction = async (hex) => {
    try {
        const result = await axios.get(`${config.blockBookUrl}/api/v2/sendtx/${hex}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept": "application/json",
            }
        })
        return {
            status:true,
            message:"successfully submitted the transaction",
            txId: result.data.result,
        }
    } catch (error) {
        return {
            status:false,
            message:"Something went wrong",
            txId: "",
        }
    }
}
/** This function is used to get the address type. */
const getAddressType = (address) => {
    const info = getAddressInfo(address);
    return info.type;
}
/** This function is used to calculate the transaction size. */
exports.calculateTransactionSize = (inputs, outputs) => {
    let size = 11;
    size += inputs.length * 68;
    for (let index = 0; index < outputs.length; index++) {
        const addressType = getAddressType(outputs[index].address);
        if (addressType === "p2pkh") {
            size += 34;
        } else if (addressType === "p2sh") {
            size += 32;
        } else if (addressType === "p2wpkh") {
            size += 31;
        } else {
            size += 43;
        }
    }
    return size;
}
/** This function is used to get the wallet address. */
exports.getAddress = (mnemonic, network, derivationPath) => {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed, network);
    const account = root.derivePath(derivationPath).derive(0);// 0: change index
    const node = account.derive(Number(config.derivationIndex));
    const address = bitcoin.payments.p2wpkh({
        pubkey: Buffer.from(node.publicKey),
        network: network,
    })
    return address.address;
}