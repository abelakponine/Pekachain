"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Blocks {
    chainType = "List_Of_Transaction_Blocks";
    blocks = [];
    getChainType() {
        return this.chainType;
    }
    getBlocks() {
        return this.blocks;
    }
    addNewBlock(block) {
        if (this.blocks.push(block))
            return true;
        else
            return false;
    }
}
exports.default = Blocks;
