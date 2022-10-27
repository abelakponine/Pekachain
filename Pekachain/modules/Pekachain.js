"use strict";
/** Pekaboom Blockchain */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Accounts_1 = __importDefault(require("./Accounts"));
const User_1 = __importDefault(require("./User"));
const _scanner = require('lodash');
const Base58 = require('base-58');
const fetch = require('node-fetch');
const bigchainDb = require("bigchaindb-driver");
class Pekachain {
    /** Technoloy Description */
    blockchainName = "Pekachain";
    blockchainVersion = "1.0.0";
    blockchainDescription = "Pekaboom Blockchain Technology";
    author = "Abel Akponine";
    company = "Pekaboom LTD";
    /** Blockhain */
    nodeEndpoint = 'https://bigchaindb.pekaboom.com/api/v1/';
    // private nodeEndpoint: string = 'http://localhost:9984/api/v1/';
    currencyName = "pekacoin";
    initialReward = 10; // initial reward per transaction, decreases over time.
    totalAvailableSupply = 1000000000; // one billion pekacoin total available supply
    rewardSlashingPoint = 1000000; // reward slashing starts at 1000000
    numberOfRegisteredWallets = 0;
    rewardSlashingUnit = Math.floor((this.numberOfRegisteredWallets / this.rewardSlashingPoint) * 10) / 10;
    constructor() {
        let accounts = new Accounts_1.default();
    }
    calculateRewardPoints(numberOfRegisteredWallets = 0) {
        if (numberOfRegisteredWallets >= this.rewardSlashingPoint) {
            return (Math.floor((this.initialReward /
                (numberOfRegisteredWallets / this.rewardSlashingPoint)) * 100) / 100);
        }
        else {
            return this.initialReward;
        }
    }
    getInfo() {
        let data = JSON.parse(JSON.stringify(this)); //copy whole data
        delete data['blockchain']; // remove blockchain
        return data;
    }
    setNodeEndpoint(endpoint) {
        this.nodeEndpoint = endpoint;
    }
    getNodeEndpoint() {
        return this.nodeEndpoint;
    }
    async getAccounts(includePassword = false) {
        let conn = new bigchainDb.Connection(this.getNodeEndpoint());
        let result = await conn.searchAssets("user_account").then((res) => res).catch((error) => {
            return error;
        });
        return result;
    }
    async addUser(user, passcode) {
        try {
            let encryptedUserData = await user.getEncryptedData(passcode);
            let privateKey = await user.getPrivateKey(passcode, user.getPassword());
            let privateEDKey = user.getPrivateEDKey();
            // console.log(user.getPassword(), "PrivateEDKey: ", user.getKeyPair().publicKey!, privateKey, user);
            const txn = bigchainDb.Transaction.makeCreateTransaction({
                assetType: "user_account",
                encryptedUserData,
                username: user.getUsername()
            }, {
                dateCreated: new Date().getTime(),
                userEmailHash: await User_1.default.createHash(user.getEmail()),
                userUsernameHash: await User_1.default.createHash(user.getUsername()),
                encryptedUserPublicData: user.usePrivateEncrypt(JSON.stringify(user.getMutableData()), privateEDKey),
                publicEDKey: user.getEDKeyPair().publicEDKey
            }, [
                bigchainDb.Transaction.makeOutput(bigchainDb.Transaction.makeEd25519Condition(user.getKeyPair().publicKey))
            ], user.getKeyPair().publicKey);
            let signedTxn = bigchainDb.Transaction.signTransaction(txn, privateKey);
            // Add user account to blockchain
            let conn = new bigchainDb.Connection(this.nodeEndpoint);
            let addUserStatus = await conn.postTransactionCommit(signedTxn).then((res) => {
                return res;
            });
            return { status: true, id: addUserStatus.id };
        }
        catch (error) {
            return error;
        }
    }
}
exports.default = Pekachain;
