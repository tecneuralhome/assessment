var express = require('express');
var router = express.Router();
var validation = require('../middleWare/validation')
var controller = require('../controller/controller')

router.post('/create-wallet', controller.createWallet);
router.get('/balance', validation.getBalanceValidation, controller.getBalance);
router.get('/history', validation.getBalanceValidation, controller.getTransactionHistory);
router.post('/create-transaction', validation.createTransactionValidation, controller.createTransaction);
module.exports = router