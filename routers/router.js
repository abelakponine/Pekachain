const express = require('express');
const { default: Pekachain } = require('../Pekachain/modules/Pekachain');
const Router = express.Router();
const User = require('../Pekachain/modules/User');
const _scanner = require('lodash');
const fetch = require('node-fetch');

const peka = new Pekachain();
const bigchainDb = require("bigchaindb-driver");
const { default: MutableData } = require('../Pekachain/modules/MutableData');
const formidable = require('formidable');
const GridFS = require('mongoose-gridfs');
const mongoose = require('mongoose');
const fs = require('fs');
const {Blob} = require('buffer');
const Base58 = require('base-58');

var BDB = new bigchainDb.Connection(peka.getNodeEndpoint());

var host = 'https://server.pekaboom.com';
// host = "http://localhost:4000";

if (typeof peka.getBlockchain() == "object"){
    
    setInterval(async ()=>{
        let result  = await fetch(host+'/pekaboom').then(async res=>{
            return res.json();
        }).catch(err=>{ console.log(err); });


    }, 3000);

    console.log("\r\n\033[1;34mPekachain is Live!\033[0m");
}

var IPFS;


Router.get('/', (req, res)=>{
    res.send("<h1>Hello Pekaboom! :)</h1>")
})
Router.get('/pekaboom', (req, res)=>{
    res.send({live: true, version:1})
})

Router.post('/signup', async (req, res)=>{
    
    if (req.body.passcode !== "" && req.body.passcode !== null){

        let user = new User(req.body);
        
        // Ensure user account is ready
        const isUserReady = setInterval(async ()=>{

            if (user.getPassword() !== undefined){

                console.log("User password found");

                let findUserByEmail = await BDB.searchMetadata(await User.createHash(user.getEmail()));
                let findUserByUsername = await BDB.searchMetadata(await User.createHash(user.getUsername()));
                

                if (findUserByEmail.length > 0){
                    res.send({status: false, error: "The provided email already exists."})
                }
                else if (findUserByUsername.length > 0){
                    res.send({status: false, error: "The username already exists."})
                }
                else {

                    console.log("\r\n***** Adding User *****");

                    peka.addUser(user, req.body.passcode).then(result=>{ // add user with passcode required.

                        user.passcode = req.body.passcode;

                        if (result.status){

                            console.log("\r\n***** New User Added *****");

                            user.id = result.id;
                            
                            res.send({status: true, data: user});
                        }
                        else {
                            console.log("Error: ", result);
                        }
                    });
                }
                
                clearInterval(isUserReady);
            }

        }, 500);

    }
    else {
        res.send({status: false, error: 'Passcode is required!'});
    }
});

Router.post('/login', async (req, res)=>{
    
    // find user by username or email
    let findUserInMetadata = await BDB.searchMetadata(await User.createHash(req.body.username));

    let findUserInAssets = await BDB.searchAssets(req.body.username);
    
    try {
        if (findUserInMetadata.length > 0){

            try {

                let userQuery = (await BDB.searchAssets(findUserInMetadata[0].id))[0].data.encryptedUserData;
                
                let password = await User.createHash(req.body.passcode+req.body.password);
            
                let user;

                if (user = JSON.parse(await new User(null).deCipher(userQuery, req.body.passcode, password))){
                    user.passcode = req.body.passcode;

                    user.id = findUserInMetadata[0].id;
                    console.log('UID: ', user.id)
                    res.send({status: true, data: user});
                }
            }
            catch (error){
                console.log(error);
                res.send({status: false, error: "Invalid credetials, unable to decrypt userdata.\r\nPlease ensure you are providing the correct passcode or password."})
            }
        }
        else if (findUserInAssets.length > 0){
            let userQuery = findUserInAssets[0].data.encryptedUserData;
            let password = User.createHash(req.body.passcode+req.body.password);
            
            try {
                let user;
                if (user = JSON.parse(await (new User(null)).deCipher(userQuery, req.body.passcode, password))){
                    
                    user.id = findUserInAssets[0].id;
                    res.send({status: true, data: user});
                }
            }
            catch (error){
                console.log(error);
                res.send({status: false, error: "Invalid credetials, unable to decrypt userdata.\r\nPlease ensure you are providing the correct passcode or password."})
            }
        }
        else {
            res.send({status: false, error: "User not found, please check your login details."})
        }
    }
    catch (error){
        res.send({status: false, error: "User not found, please check your login details."})
    }
});

Router.get('/accounts', async (req, res)=>{
    res.send(await peka.getAccounts());
});

Router.get('/files/:cid', async (req, res)=>{
    
    let cid = req.params.cid.split('--')[0];
    let extension = req.params.cid.split('--')[1].replace('__','/');
    
    let file = await fetch('https://cloudflare-ipfs.com/ipfs/'+cid).then(res=>res.buffer());
    
    res.setHeader("Content-Type", extension);

    res.send(file);
})

Router.get('/booms/:type?/:userOrId?', async (req, res)=>{

    let type = req.params.type;
    let userOrId = req.params.userOrId;
    let booms;
    let boomList = [];
    

    if (type == "all" && userOrId == undefined){
        booms = await BDB.searchAssets("boom_post").then(res=>res);
    }
    else if (type == "all" && typeof(userOrId) == "string" || type == "post" && typeof(userOrId) == "string"){
        booms = await BDB.searchAssets(userOrId);
    }
    else {
        booms = await BDB.searchAssets("boom_post");
    }
    
    if (booms.length > 0){
        booms.forEach(async (boom, index)=>{
        
            let userdata = await BDB.searchAssets(boom.data.authorId);

            if (userdata.length > 0){

                userdata = userdata.filter((a,b)=>{
                    return (a.data.assetType == 'user_account');
                });

                boom.author = {id: userdata[0].id, username: userdata[0].data.username};
                boomList.push(boom);
            }
            else {
                boom.author = null;
                // boomList.push(boom);
            }

            boomList = _scanner.orderBy(boomList, ['data.dateCreated'], ['desc']);
            
            
            setTimeout(()=>{ // ensure all data is returned from boomList

                if (index >= booms.length-1){
                    
                    res.send(boomList);
                }

            }, 300);

        })
    }
    else {
        res.send([])
    }
})

/** All users are required to provide their login credentials as query args, in order to decrypt and access other users' public information */
Router.get('/user/:userId?/:queryUsername?/:queryPasscode?/:queryPassword?', async (req, res)=>{
    let userId = req.params.userId;
    let queryUsername = (req.params.queryUsername !== undefined ? req.params.queryUsername : undefined);
    let queryPassword = (req.params.queryPassword !== undefined ? req.params.queryPassword : undefined);
    let queryPasscode = (req.params.queryPasscode !== undefined ? req.params.queryPasscode.replaceAll(' ', '') : undefined);

    let user;

    if (userId !== undefined && typeof(userId) == "string"){

        user = await BDB.searchAssets(userId);

        if (user.length > 0){

            let userdata = user.filter((a,b)=>{
                return a.data.assetType == 'user_account';
            });
            
            if (queryUsername !== undefined && queryPasscode !== undefined && queryPassword !== undefined){
            
                try {
                    let decryptedUser = new User(null).usePublicDecrypt(userdata[0].data.encryptedUserPublicData, userdata[0].data.publicEDKey); // decrypt requested public data if provided credentials are valid

                    res.send(JSON.parse(decryptedUser));
                }
                catch (error){
                    res.send({status: false, error: "Failed to decrypt userdata - invalid credentials provided."});
                }
            }
            else {
                res.send({id: userdata[0].id, username: userdata[0].data.username, userEncryptedData: userdata[0].data.encryptedUserPublicData});
            }
        }
        else {
            res.send({Error: "User not found."})
        }
    }
    else {
        res.send({Error: "Invalid path entered."})
    }
})

async function simulateUserLogin(username, passcode, password){
    
    // find user by username
    let findUserInAssets = await BDB.searchAssets(username);
    
    if (findUserInAssets.length > 0){
        let userQuery = findUserInAssets[0].data.encryptedUserData;
        
        try {
            let user;
            if (user = JSON.parse(await (new User(null)).deCipher(userQuery, passcode, password))){
                
                user.id = findUserInAssets[0].id;
                return ({status: true, data: user});
            }
        }
        catch (error){
            console.log(error);
            return ({status: false, error: "Invalid credetials, unable to decrypt userdata.\r\nPlease ensure you are providing the correct passcode or password."})
        }
    }
    else {
        return ({status: false, error: "User not found, please check your login details."})
    }
}
async function getIPFSFile(IPFS, fileCID){

    const {Blob} = require('buffer');

    const content = [];
    let files = IPFS.get(fileCID);

    for await (const file of files) {

        // content.push(file);
        if (file instanceof Buffer) content.push(file);
    }
    
    return Buffer.concat(content);
}

module.exports = Router;
