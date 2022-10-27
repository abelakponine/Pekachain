"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Transaction class, an instance of a transaction */
class Transaction {
    id = undefined;
    type = undefined;
    sender = undefined;
    recipient = undefined;
    data = undefined;
    dateCreated = undefined;
    constructor() {
    }
    getTransactionInfo() {
        return this;
    }
}
exports.default = Transaction;
