"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Transaction class, it holds a transactions in the ecosystem */
class Transactions {
    chainType = "List_Of_Transactions";
    transactions = [];
    pendingTransactions = [];
    allowNewTransactions = true;
    temporaryTransactionsHold = [];
    getChainType() {
        return this.chainType;
    }
    getAllTransactions() {
        return this.transactions;
    }
    addAddTransaction(transaction) {
        if (this.transactions.push(transaction))
            return true;
        else
            return false;
    }
    addPendingTransaction(transaction) {
        if (this.pendingTransactions.push(transaction))
            return true;
        else
            return false;
    }
}
exports.default = Transactions;
