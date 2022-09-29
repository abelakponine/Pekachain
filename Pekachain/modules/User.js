"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const MutableData_1 = __importDefault(require("./MutableData"));
const crypto_1 = require("crypto");
const bigchaindb = require('bigchaindb-driver');
/** User class, it is an instance of a real user */
class User {
    firstname = undefined;
    lastname = undefined;
    username = undefined;
    gender = undefined;
    dateOfBirth = undefined;
    dateCreated = undefined;
    publicKey = undefined; // for public signing and verification
    privateKey = undefined; // for private signing and verification
    publicEDKey = undefined; // for public encryption and decryption
    privateEDKey = undefined; // for private encryption and decryption
    password = undefined;
    mutableData = new MutableData_1.default(null);
    constructor(data) {
        if (data) {
            this.firstname = data.firstname;
            this.lastname = data.lastname;
            this.username = data.username;
            this.gender = data.gender;
            this.dateOfBirth = data.dateOfBirth;
            this.dateCreated = new Date().getTime();
            let payload = data.passcode + data.password;
            User.createHash(payload).then(hash => {
                this.mutableData = new MutableData_1.default(data);
                // Generate Hashed Password
                this.setPassword(hash);
                // Generate Signing and Verification Keypair with passcode
                this.generateKeyPair(data.passcode);
                // Generate Encryption and Decryption Keypair with passcode
                this.generateEDKeyPair(data.passcode);
            });
        }
    }
    async getPrivateKey(passcode, password) {
        let encryptedPrivateKey = this.getKeyPair().encryptedPrivateKey;
        let privateKey = await this.deCipher(encryptedPrivateKey, passcode, password);
        return privateKey;
    }
    getPrivateEDKey() {
        return this.getEDKeyPair().privateEDKey;
    }
    getUserInfo() {
        let payload = JSON.parse(JSON.stringify(this));
        return payload;
    }
    static async createHash(payload, algorithm = "SHA512") {
        let encodedData = new TextEncoder().encode(JSON.stringify(payload));
        let digest = (0, crypto_1.createHash)(algorithm);
        let hash = digest.update(encodedData).digest('hex');
        return hash;
    }
    async getEncryptedData(passcode) {
        let userdata = JSON.stringify(this);
        return await this.createCipher(userdata, passcode, this.getPassword());
    }
    getEmail() {
        return this.getMutableData()['email'];
    }
    getMutableData() {
        return this.mutableData;
    }
    getFullname() {
        return this.firstname + " " + this.lastname;
    }
    getUsername() {
        return this.username;
    }
    getKeyPair() {
        return {
            publicKey: this.publicKey,
            encryptedPrivateKey: this.privateKey
        };
    }
    getEDKeyPair() {
        return {
            publicEDKey: this.publicEDKey,
            privateEDKey: this.privateEDKey
        };
    }
    async generateKeyPair(passcode) {
        let keypair = new bigchaindb.Ed25519Keypair();
        this.publicKey = keypair.publicKey;
        this.privateKey = await this.createCipher(keypair.privateKey, passcode, this.password);
        return {
            publicKey: this.publicKey,
            encryptedPrivateKey: this.privateKey
        };
    }
    generateEDKeyPair(passcode) {
        let keypair = (0, crypto_1.generateKeyPairSync)("rsa", {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
        this.publicEDKey = keypair.publicKey;
        this.privateEDKey = keypair.privateKey;
        return {
            publicEDKey: this.publicEDKey,
            privateEDKey: this.privateEDKey
        };
    }
    async createCipher(payload, passcode, password) {
        let key = Buffer.from(await User.createHash(password, "SHA256"), "hex");
        let iv = Buffer.from(await User.createHash(passcode, "SHA256"), "hex");
        let cipher = (0, crypto_1.createCipheriv)("aes-256-gcm", key, iv);
        return cipher.update(payload).toString('hex');
    }
    async deCipher(payload, passcode, password) {
        let key = Buffer.from(await User.createHash(password, "SHA256"), "hex");
        let iv = Buffer.from(await User.createHash(passcode, "SHA256"), "hex");
        let deCipher = (0, crypto_1.createDecipheriv)("aes-256-gcm", key, iv);
        return deCipher.update(Buffer.from(payload, "hex")).toString();
    }
    usePublicEncrypt(payload, publicEDKey) {
        let encrypted = (0, crypto_1.publicEncrypt)(publicEDKey, Buffer.from(payload));
        return encrypted.toString('hex');
    }
    usePublicDecrypt(payload, publicEDKey) {
        let deCipher = (0, crypto_1.publicDecrypt)(publicEDKey, Buffer.from(payload, 'hex'));
        return deCipher.toString();
    }
    usePrivateEncrypt(payload, privateEDKey) {
        let encrypted = (0, crypto_1.privateEncrypt)(privateEDKey, Buffer.from(payload));
        return encrypted.toString('hex');
    }
    usePrivateDecrypt(payload, privateEDKey) {
        let deCipher = (0, crypto_1.privateDecrypt)(privateEDKey, Buffer.from(payload, 'hex'));
        return deCipher.toString();
    }
    getPassword() {
        return this.password;
    }
    setPassword(password) {
        this.password = password;
    }
}
module.exports = User;
exports.default = User;
