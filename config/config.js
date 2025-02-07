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
  testnetDerivationPath: process.env.TESTNETDERIVATIONPATH || "m/84'/1'/0'",
  mainnetDerivationPath: process.env.MAINNETDERIVATIONPATH || "m/84'/0'/0'",
  derivationIndex: process.env.DERIVATIONINDEX || 0,
};