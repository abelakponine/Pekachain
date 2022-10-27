import Wallet from "./Wallet";

/** Wallet class, it holds all users' wallet */
export default class Wallets {

    private chainType: string = "List_Of_Users_Wallet";
    private wallets: Wallet[] = [];

    getChainType(): string {
        return this.chainType;
    }
    getWalletAllWallets(): Wallet[] {
        return this.wallets;
    }
    private addWallet(wallet:Wallet): boolean {
        if (this.wallets.push(wallet)) return true;
        else return false;
    }
}