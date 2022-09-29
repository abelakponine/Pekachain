import Pekachain from "./Pekachain";
import User from "./User";
const bigchainDb = require('bigchaindb-driver');

/** Account class, it holds all users' account */
export default class Accounts {

    chainType: string = "List_Of_Users_Account";
    private accounts: User[] = [];
    
    getChainType(){
        return this.chainType;
    }
    getAccounts(includePassword = false){
        if (!includePassword){
            let accounts = JSON.parse(JSON.stringify(this.accounts)).map((user:User)=>{
                
                delete user['password'];
                return user;
            });
            return accounts;
        }
        else {
            return this.accounts;
        }
    }
    private async addUser(user:User, passcode:string): Promise<boolean> {
        try {
            let encryptedUserData = await user.getEncryptedData(passcode);

            const txn = bigchainDb.Transaction.makeCreateTransaction(
            {
                encryptedUserData,
                username: user.getUsername(),
                dataType: "user_account"
            },
            {
                dateCreated: new Date().getTime()
            },
            [
                bigchainDb.Transaction.makeOutput(bigchainDb.Transaction.makeEd25519Condition(user.getKeyPair().publicKey!))
            ],

                user.getKeyPair().publicKey
            );

            let privateKey = await user.getPrivateKey(passcode, user.getPassword());

            let signedTxn = bigchainDb.Transaction.signTransaction(txn, privateKey);

            const peka = new Pekachain();
            const conn = new bigchainDb.Connection(peka.getNodeEndpoint());

            // Add user account to blockchain
            conn.postTransaction(signedTxn).then((res:any)=>{
                console.log(res);
            });

            // conn.getTransaction('e93ab661825c98d49db8615eeb3ac4c619ad1c1207674a784b38114952afd4d3').then((res:any)=>{
            //     // console.log(res.asset.data.user, res.outputs);
            // });
            return true;
        }
        catch (error:any){
            return error;
        }
    }
}