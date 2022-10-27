"use strict";
/** Wallet class, an instance of a user wallet */
Object.defineProperty(exports, "__esModule", { value: true });
class Wallet {
    id = undefined;
    passphraseHash = undefined;
    fullfilledTransactions = [];
    constructor() {
    }
    getWalletInfo(id, passphrase) {
        return this;
    }
    getBalance() {
    }
}
exports.default = Wallet;
