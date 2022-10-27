/** Transaction class, an instance of a transaction */
export default class Transaction {

    private id: number|undefined = undefined;
    private type: string|undefined = undefined;
    private sender: string|undefined = undefined;
    private recipient: string|undefined = undefined;
    private data: string|undefined = undefined;
    private dateCreated: string|undefined = undefined;

    constructor(){

    }

    getTransactionInfo(){
        return this;
    }
}