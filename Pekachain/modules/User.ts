import MutableData from "./MutableData";
import { createHash, generateKeyPairSync, sign, verify, createSign,
    createVerify,createCipheriv, createDecipheriv, publicEncrypt, privateEncrypt,
    publicDecrypt, privateDecrypt, Sign, Verify } from "crypto";

const bigchaindb = require('bigchaindb-driver');


/** User class, it is an instance of a real user */
class User {
    private firstname: string|undefined = undefined;
    private lastname: string|undefined = undefined;
    private username: string|undefined = undefined;
    private gender: string|undefined = undefined;
    private dateOfBirth: string|undefined = undefined;
    private dateCreated: number|undefined = undefined;
    private publicKey: string|undefined = undefined; // for public transaction signing and verification
    private privateKey: string|undefined = undefined; // for private transaction signing and verification
    private publicEDKey: string|undefined = undefined; // for public encryption and decryption
    private privateEDKey: string|undefined = undefined; // for private encryption and decryption
    private password: string|undefined = undefined;
    private mutableData: MutableData = new MutableData(null);

    constructor(data:any){

        if (data){
            this.firstname = data.firstname;
            this.lastname = data.lastname;
            this.username = data.username;
            this.gender = data.gender;
            this.dateOfBirth = data.dateOfBirth;
            this.dateCreated = new Date().getTime();
            

            let payload = data.passcode+data.password;

            User.createHash(payload).then(hash=>{
                this.mutableData = new MutableData(data);
                // Generate Hashed Password
                this.setPassword(hash);
                // Generate Signing and Verification Keypair with passcode
                this.generateKeyPair(data.passcode);
                // Generate Encryption and Decryption Keypair with passcode
                this.generateEDKeyPair(data.passcode);
            });
        }
    }
    async getPrivateKey(passcode:string, password:string){
        let encryptedPrivateKey = this.getKeyPair().encryptedPrivateKey;
        let privateKey = await this.deCipher(encryptedPrivateKey, passcode, password);
        return privateKey;
    }
    getPrivateEDKey(): string {
        return this.getEDKeyPair().privateEDKey!;
    }
    getUserInfo(){
        let payload = JSON.parse(JSON.stringify(this));

        return payload;
    }
    static async createHash(payload:string, algorithm:string="SHA512"){

        let encodedData = new TextEncoder().encode(JSON.stringify(payload));
        let digest = createHash(algorithm);
        let hash = digest.update(encodedData).digest('hex');

        return hash;
    }
    async getEncryptedData(passcode:string){
        let userdata = JSON.stringify(this);
        
        return await this.createCipher(userdata, passcode, this.getPassword());
    }
    getEmail(){
        return this.getMutableData()['email'];
    }
    getMutableData(){
        return this.mutableData;
    }
    getFullname(){
        return this.firstname+" "+this.lastname;
    }
    getUsername(){
        return this.username;
    }
    getKeyPair(){
        return {
            publicKey: this.publicKey,
            encryptedPrivateKey: this.privateKey
        }
    }
    getEDKeyPair(){
        return {
            publicEDKey: this.publicEDKey,
            privateEDKey: this.privateEDKey
        }
    }
    
    async generateKeyPair(passcode:string){
        let keypair = new bigchaindb.Ed25519Keypair();
        this.publicKey = keypair.publicKey;
        this.privateKey = await this.createCipher(keypair.privateKey, passcode, this.password!);

        return {
            publicKey: this.publicKey,
            encryptedPrivateKey: this.privateKey
        }
    }
    generateEDKeyPair(passcode:string){
        let keypair = generateKeyPairSync("rsa", {
            modulusLength: 2048,
            publicKeyEncoding: {
              type: 'spki',
              format: 'pem'
            },
            privateKeyEncoding: {
              type: 'pkcs8',
              format: 'pem'
            }
        })
        this.publicEDKey = keypair.publicKey;
        this.privateEDKey = keypair.privateKey;

        return {
            publicEDKey: this.publicEDKey,
            privateEDKey: this.privateEDKey
        }
    }
    async createCipher(payload:any, passcode:string, password:string){
        let key = Buffer.from(await User.createHash(password!, "SHA256"), "hex");
        let iv = Buffer.from(await User.createHash(passcode, "SHA256"), "hex");
        let cipher = createCipheriv("aes-256-gcm", key, iv);
        return cipher.update(payload).toString('hex');
    }
    async deCipher(payload:any, passcode:string, password:string){
        let key = Buffer.from(await User.createHash(password!, "SHA256"), "hex");
        let iv = Buffer.from(await User.createHash(passcode, "SHA256"), "hex");
        let deCipher = createDecipheriv("aes-256-gcm", key, iv);

        return deCipher.update(Buffer.from(payload, "hex")).toString();
    }
    usePublicEncrypt(payload:string, publicEDKey:string){
        let encrypted = publicEncrypt(publicEDKey, Buffer.from(payload));
        return encrypted.toString('hex');
    }
    usePublicDecrypt(payload:string, publicEDKey:string){
        let deCipher = publicDecrypt(publicEDKey, Buffer.from(payload, 'hex'))

        return deCipher.toString();
    }
    usePrivateEncrypt(payload:string, privateEDKey:string){
        let encrypted = privateEncrypt(privateEDKey, Buffer.from(payload));
        return encrypted.toString('hex');
    }
    usePrivateDecrypt(payload:string, privateEDKey:string){
        let deCipher = privateDecrypt(privateEDKey, Buffer.from(payload, 'hex'))

        return deCipher.toString();
    }
    getPassword(): string {
        return this.password!;
    }
    setPassword(password:string){
        this.password = password;
    }
}

module.exports = User;
export default User;