/**
 * @file route.js
 * @description Routes for wallet-related operations.
 * @author Jeya kumar
 * @version 1.0.0
 * @date 2025-02-06
 */
var express = require('express');
var router = express.Router();
var validation = require('../middleware/validation')
var walletController = require('../controller/walletController')

router.post('/create-wallet', walletController.createWallet);
router.get('/balance', validation.getBalanceValidation, walletController.getBalance);
router.get('/history', validation.getBalanceValidation, walletController.getTransactionHistory);
router.post('/create-transaction', validation.createTransactionValidation, walletController.createTransaction);
module.exports = router