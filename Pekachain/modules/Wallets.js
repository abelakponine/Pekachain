"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Wallet class, it holds all users' wallet */
class Wallets {
    chainType = "List_Of_Users_Wallet";
    wallets = [];
    getChainType() {
        return this.chainType;
    }
    getWalletAllWallets() {
        return this.wallets;
    }
    addWallet(wallet) {
        if (this.wallets.push(wallet))
            return true;
        else
            return false;
    }
}
exports.default = Wallets;
