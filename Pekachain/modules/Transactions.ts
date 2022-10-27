import Transaction from "./Transaction";

/** Transaction class, it holds a transactions in the ecosystem */
export default class Transactions {

    private chainType: string = "List_Of_Transactions";
    private transactions: Transaction[] = [];
    private pendingTransactions: Transaction[] = [];
    private allowNewTransactions: boolean = true;
    private temporaryTransactionsHold: Transaction[] = [];

    getChainType(){
        return this.chainType;
    }
    getAllTransactions(): Transaction[] {
        return this.transactions;
    }
    protected addAddTransaction(transaction: Transaction): boolean {
        if (this.transactions.push(transaction)) return true;
        else return false;
    }
    protected addPendingTransaction(transaction: Transaction): boolean {
        if (this.pendingTransactions.push(transaction)) return true;
        else return false;
    }
}