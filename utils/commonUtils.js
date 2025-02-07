const bip39 = require("bip39");
const config = require("../config/config");
const bitcoin = require("bitcoinjs-lib");
const axios = require("axios");
const ecc = require("@bitcoinerlab/secp256k1");
const BIP32Factory = require("bip32").BIP32Factory;
const bip32 = BIP32Factory(ecc);
const { getAddressInfo } = require('bitcoin-address-validation');
// This function used to generate a mnemonic key
exports.generateMnemonic = () => {
    return bip39.generateMnemonic();
}

// This function used to get network
exports.getNetwork = () => {
    if (config.network === "testnet") {
        return bitcoin.networks.testnet;
    }
    if (config.network === "mainnet") {
        return bitcoin.networks.bitcoin;
    }
    return bitcoin.networks.regtest;
}
exports.getDerivationPath = () => {
  return config.network === "testnet" || config.network === "regtest" ? "m/84'/1'/0'" : "m/84'/0'/0'";
}
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
exports.getInputs = async (unspents, amount) => {
    let sumAmount = 0;
    let inputs = [];
    for (let i = 0; i < unspents.length; i++) {
        console.log("=== ELEMENT ===", unspents[i])
        if (sumAmount > amount) break;
        sumAmount += Number(unspents[i].value);
        inputs.push(unspents[i])
    }
    return {
        sumAmount,
        inputs,
    }
}
exports.getChildNode = (mnemonic) => {
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const rootKey = bip32.fromSeed(seed, bitcoin.networks.testnet)
  const childNode = rootKey.derivePath("m/84'/1'/0'")
  return childNode.derive(0).derive(0)
}
exports.sendTransaction = async (hex) => {
    try {
        const result = await axios.get(`${config.blockBookUrl}/api/v2/sendtx/${hex}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept": "application/json",
            }
        })
        console.log("===== RESULT =====", result.data);
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
const getAddressType = (address) => {
    const info = getAddressInfo(address);
    return info.type;
}
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
    console.log("===== TRANSACTION SIZE =====", size);
    return size;
}
exports.getAddress = (mnemonic, network, derivationPath) => {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed, network);
    const account = root.derivePath(derivationPath).derive(0);// 0: change index
    const node = account.derive(parseInt(0));
    const address = bitcoin.payments.p2wpkh({
        pubkey: Buffer.from(node.publicKey),
        network: network,
    })
    console.log("=== ADDRESS ===", address.address)
    return address.address;
}