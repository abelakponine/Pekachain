"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Transaction Block */
class Block {
    id = undefined;
    transactions = [];
    hash = undefined;
    previousHash = undefined;
    dateCreated = undefined;
    reward = 0;
    constructor() {
    }
    getBlockInfo() {
        return this;
    }
    updateReward() {
    }
}
exports.default = Block;
