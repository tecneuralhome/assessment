/**
 * @file config.js
 * @description Configuration file for environment variables.
 * @author Jeya kumar
 * @version 1.0.0
 * @date 2025-02-06
 */
module.exports = {
  port: process.env.PORT || 8080,
  network: process.env.NETWORK || "testnet",
  blockBookUrl: process.env.BLOCKBOOKURL || "https://tbtc1.trezor.io/",
  derivationPath: process.env.DERIVATIONPATH || "m/84'/1'/0'",
  derivationIndex: process.env.DERIVATIONINDEX || 0,
};