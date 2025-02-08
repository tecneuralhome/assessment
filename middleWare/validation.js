/**
 * @file validation.js
 * @description Validation rules for wallet-related requests using express-validator.
 * @author Jeya kumar
 * @version 1.0.0
 * @date 2025-02-06
 */
const { check, validationResult } = require('express-validator');
const bip39 = require('bip39');
const { validate } = require('bitcoin-address-validation');
const config = require("../config/config");

exports.getBalanceValidation =
[
	// Validate address (Bitcoin address check)
    check('address').trim().notEmpty().withMessage('Address is required')
        .custom((value) => {
            if (!validate(value, config.network)) {
                return false;
            }
            return true;
        }).withMessage('Invalid Bitcoin address'),
	// Middleware to handle validation results
	(req, res, next) => {
		next();
	},
]
exports.createTransactionValidation =
[
	// Validate mnemonic (BIP39 - 12 words)
	check('mnemonic').trim().notEmpty().withMessage('Mnemonic is required')
    	.custom((value) => {
    		const words = value.split(' ');
            if (words.length < 12 || words.length > 12 || !bip39.validateMnemonic(value)) {
                return false;
            }
            return true;
        }).withMessage('Invalid mnemonic: Must be a valid BIP39 phrase (12words)'),
    // Validate receiver address (Bitcoin address check)
    check('toAddress').trim().notEmpty().withMessage('Receiver address is required')
        .custom((value) => {
            if (!validate(value, config.network)) {
                return false;
            }
            return true;
        }).withMessage('Invalid Bitcoin address'),
	// Validate amount (Numeric, greater than zero)
    check('amount').trim().notEmpty().withMessage('Amount is required').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
	// Middleware to handle validation results
	(req, res, next) => {
		next();
	},
]