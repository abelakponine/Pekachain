import Transaction from "./Transaction";

/** Transaction Block */
export default class Block {
    
    private id: number|undefined = undefined;
    private transactions: Transaction[] = [];
    private hash: string|undefined = undefined;
    private previousHash: string|undefined = undefined;
    private dateCreated: string|undefined = undefined;
    private reward: number = 0;

    constructor(){

    }

    getBlockInfo(){
        return this;
    }
    updateReward(){

    }
}