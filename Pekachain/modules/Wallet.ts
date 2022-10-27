/** Wallet class, an instance of a user wallet */

import Transaction from "./Transaction";

export default class Wallet {

    private id: string|undefined = undefined;
    private passphraseHash: string|undefined = undefined;
    private fullfilledTransactions: Transaction[] = [];

    constructor(){

    }

    private getWalletInfo(id:string, passphrase:string){
        return this;
    }
    private getBalance(){

    }
}