"use strict";
/** Pekaboom Blockchain */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Accounts_1 = __importDefault(require("./Accounts"));
const Blocks_1 = __importDefault(require("./Blocks"));
const User_1 = __importDefault(require("./User"));
const Wallets_1 = __importDefault(require("./Wallets"));
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
    blockchain = new Array();
    nodeEndpoint = 'https://bigchaindb.pekaboom.com/api/v1/';
    currencyName = "pekacoin";
    initialReward = 10; // initial reward per transaction, decreases over time.
    totalAvailableSupply = 1000000000; // one billion pekacoin total available supply
    rewardSlashingPoint = 1000000; // reward slashing starts at 1000000
    numberOfRegisteredWallets = 0;
    rewardSlashingUnit = Math.floor((this.numberOfRegisteredWallets / this.rewardSlashingPoint) * 10) / 10;
    constructor() {
        let blocks = new Blocks_1.default();
        let wallets = new Wallets_1.default();
        let accounts = new Accounts_1.default();
        this.blockchain.push(blocks);
        this.blockchain.push(wallets);
        this.blockchain.push(accounts);
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
    getBlockchain() {
        let chain = JSON.parse(JSON.stringify(this));
        delete chain.blockchain[this.blockchain.findIndex((a, b) => (a == this.getAccountsChain()))]; // remove users' accounts (For Data Privacy)
        chain.blockchain = chain.blockchain.filter((a, b) => a !== null);
        return chain; // return only wallets and transactions
    }
    getInfo() {
        let data = JSON.parse(JSON.stringify(this)); //copy whole data
        delete data['blockchain']; // remove blockchain
        return data;
    }
    getAccountsChain() {
        let accounts = _scanner.find(this.blockchain, { chainType: "List_Of_Users_Account" });
        return accounts;
    }
    getTransactions() {
        return _scanner.find(this.blockchain, { chainType: "List_Of_Transactions" });
    }
    getWallets() {
        return _scanner.find(this.blockchain, { chainType: "List_Of_Users_Wallet" });
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
                encryptedUserPublicData: user.usePrivateEncrypt(JSON.stringify(user.getMutableData()), privateEDKey),
                username: user.getUsername(),
                publicEDKey: user.getEDKeyPair().publicEDKey
            }, {
                dateCreated: new Date().getTime(),
                userEmailHash: await User_1.default.createHash(user.getEmail()),
                userUsernameHash: await User_1.default.createHash(user.getUsername()) // for username checking if user account exists
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
