"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Pekachain_1 = __importDefault(require("./Pekachain"));
const bigchainDb = require('bigchaindb-driver');
/** Account class, it holds all users' account */
class Accounts {
    chainType = "List_Of_Users_Account";
    accounts = [];
    getChainType() {
        return this.chainType;
    }
    getAccounts(includePassword = false) {
        if (!includePassword) {
            let accounts = JSON.parse(JSON.stringify(this.accounts)).map((user) => {
                delete user['password'];
                return user;
            });
            return accounts;
        }
        else {
            return this.accounts;
        }
    }
    async addUser(user, passcode) {
        try {
            let encryptedUserData = await user.getEncryptedData(passcode);
            const txn = bigchainDb.Transaction.makeCreateTransaction({
                encryptedUserData,
                username: user.getUsername(),
                dataType: "user_account"
            }, {
                dateCreated: new Date().getTime()
            }, [
                bigchainDb.Transaction.makeOutput(bigchainDb.Transaction.makeEd25519Condition(user.getKeyPair().publicKey))
            ], user.getKeyPair().publicKey);
            let privateKey = await user.getPrivateKey(passcode, user.getPassword());
            let signedTxn = bigchainDb.Transaction.signTransaction(txn, privateKey);
            const peka = new Pekachain_1.default();
            const conn = new bigchainDb.Connection(peka.getNodeEndpoint());
            // Add user account to blockchain
            conn.postTransaction(signedTxn).then((res) => {
                console.log(res);
            });
            // conn.getTransaction('e93ab661825c98d49db8615eeb3ac4c619ad1c1207674a784b38114952afd4d3').then((res:any)=>{
            //     // console.log(res.asset.data.user, res.outputs);
            // });
            return true;
        }
        catch (error) {
            return error;
        }
    }
}
exports.default = Accounts;
