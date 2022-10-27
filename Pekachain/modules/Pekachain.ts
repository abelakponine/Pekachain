/** Pekaboom Blockchain */

import Accounts from "./Accounts";
import User from "./User";
const _scanner = require('lodash');
const Base58 = require('base-58');
const fetch = require('node-fetch');
const bigchainDb = require("bigchaindb-driver");

export default class Pekachain {
    /** Technoloy Description */
    private blockchainName: string = "Pekachain";
    private blockchainVersion: string = "1.0.0";
    private blockchainDescription: string = "Pekaboom Blockchain Technology";
    private author: string = "Abel Akponine";
    private company: string = "Pekaboom LTD";

    /** Blockhain */
    private nodeEndpoint: string = 'https://bigchaindb.pekaboom.com/api/v1/';
    // private nodeEndpoint: string = 'http://localhost:9984/api/v1/';
    private currencyName: string = "pekacoin";
    private initialReward: number = 10; // initial reward per transaction, decreases over time.
    private totalAvailableSupply: number = 1000000000; // one billion pekacoin total available supply
    private rewardSlashingPoint: number = 1000000; // reward slashing starts at 1000000
    private numberOfRegisteredWallets: number = 0;
    private rewardSlashingUnit: number = 
            Math.floor((this.numberOfRegisteredWallets / this.rewardSlashingPoint) * 10) / 10;

    constructor(){
        let accounts:Accounts = new Accounts();
    }
    calculateRewardPoints(numberOfRegisteredWallets:number=0){

        if (numberOfRegisteredWallets >= this.rewardSlashingPoint){
            return (
                Math.floor((this.initialReward /
                    (numberOfRegisteredWallets / this.rewardSlashingPoint)) * 100) / 100
            );
        }
        else {
            return this.initialReward;
        }
    }
    getInfo(){
        let data = JSON.parse(JSON.stringify(this)); //copy whole data
        delete data['blockchain']; // remove blockchain
        return data;
    }
    setNodeEndpoint(endpoint: string){
        this.nodeEndpoint = endpoint;
    }
    getNodeEndpoint() {
        return this.nodeEndpoint;
    }
    async getAccounts(includePassword = false){

        let conn = new bigchainDb.Connection(this.getNodeEndpoint());
        let result = await conn.searchAssets("user_account").then((res:any)=>res).catch((error:any)=>{
            return error;
        })
        
        return result;
    }
    private async addUser(user:User, passcode:string): Promise<object> {
        try {

            let encryptedUserData = await user.getEncryptedData(passcode);

            let privateKey = await user.getPrivateKey(passcode, user.getPassword());
            let privateEDKey = user.getPrivateEDKey();

            // console.log(user.getPassword(), "PrivateEDKey: ", user.getKeyPair().publicKey!, privateKey, user);

            const txn = bigchainDb.Transaction.makeCreateTransaction(
            {
                assetType: "user_account",
                encryptedUserData,
                username: user.getUsername()
            },
            {
                dateCreated: new Date().getTime(),
                userEmailHash: await User.createHash(user.getEmail()!), // for email checking if user account exists
                userUsernameHash: await User.createHash(user.getUsername()!), // for username checking if user account exists
                encryptedUserPublicData: user.usePrivateEncrypt(JSON.stringify(user.getMutableData()), privateEDKey),
                publicEDKey: user.getEDKeyPair().publicEDKey
            },
            [
                bigchainDb.Transaction.makeOutput(bigchainDb.Transaction.makeEd25519Condition(user.getKeyPair().publicKey!))
            ],

                user.getKeyPair().publicKey
            );

            let signedTxn = bigchainDb.Transaction.signTransaction(txn, privateKey);

            // Add user account to blockchain
            let conn = new bigchainDb.Connection(this.nodeEndpoint);

            let addUserStatus = await conn.postTransactionCommit(signedTxn).then((res:any)=>{
                return res;
            });

            return {status: true, id: addUserStatus.id};
        }
        catch (error:any){
            return error;
        }
    }
}
