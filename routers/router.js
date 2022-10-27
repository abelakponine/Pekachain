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
const Schema = mongoose.Schema;

// mongoose.connect('mongodb://35.246.51.222:27017/bigchain', (err)=>{
//     if (!err){
//         console.log('Connected to MongoDB')
//     }
//     else {
//         console.log(err)
//     }
// });
const dbconn = mongoose.connection;

var BDB = new bigchainDb.Connection(peka.getNodeEndpoint());

var host = 'https://server.pekaboom.com';
// host = "http://localhost:4000";

var IPFS;


Router.get('/', (req, res)=>{
    res.send("<h1>Hello Pekaboom! :)</h1>")
})
Router.get('/pekaboom', (req, res)=>{
    res.send({live: true, version:1})
})

Router.post('/signup', (req, res)=>{
    
    (async (req, res)=>{

        if (req.body.passcode !== "" && req.body.passcode !== null){

            let user = new User(req.body);
            
            // Ensure user account is ready
            const isUserReady = setInterval(async ()=>{

                if (user.getPassword() !== undefined){

                    console.log("User password found");

                    let findUserByEmail = await BDB.searchMetadata(await User.createHash(user.getEmail())).then(res=>res).catch(err=>console.log(err));
                    let findUserByUsername = await BDB.searchMetadata(await User.createHash(user.getUsername())).then(res=>res).catch(err=>console.log(err));
                    

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

    })(req, res)
});

Router.post('/login', (req, res)=>{
    
    (async (req, res)=>{
    
        // find user by username or email
        let findUserInMetadata = await BDB.searchMetadata(await User.createHash(req.body.username).then(res=>res).catch(err=>console.log(err))).then(res=>res).catch(err=>console.log(err));

        let findUserInAssets = (await BDB.searchAssets(req.body.username, null).then(res=>res).catch(err=>console.log(err))).filter((a,b)=>a.data.assetType == 'user_account');
        
        try {
            if (findUserInMetadata.length > 0){

                try {

                    let userQuery = (await (await BDB.searchAssets(findUserInMetadata[0].id, null).then(res=>res).catch(err=>console.log(err))).filter((a,b)=>a.data.assetType == 'user_account'))[0].data.encryptedUserData;
                    
                    let password = await User.createHash(req.body.passcode+req.body.password).then(res=>res).catch(err=>console.log(err));
                
                    let user;
                    

                    if (userQuery){
                        if (user = JSON.parse(await new User(null).deCipher(userQuery, req.body.passcode, password).then(res=>res).catch(err=>console.log(err)))){
                            user.passcode = req.body.passcode;

                            user.id = findUserInMetadata[0].id;
                            
                            res.send({status: true, data: user});
                        }
                    }
                    else {
                        res.send({status:false, error:'UserData not found, please check credentials.'})
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
                    if (user = JSON.parse(await (new User(null)).deCipher(userQuery, req.body.passcode, password).then(res=>res).catch(err=>console.log(err)))){
                        
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

    })(req, res)
});

Router.get('/accounts', (req, res)=>{
    
    (async (req, res)=>{

        res.send(await peka.getAccounts().then(res=>res).catch(err=>console.log(err)));

    })(req, res)
});

Router.get('/files/:cid', (req, res)=>{
    
    (async (req, res)=>{
    
        let cid = req.params.cid.split('--')[0];
        let extension = req.params.cid.split('--')[1].replace('__','/');
        
        let file = await fetch('https://cloudflare-ipfs.com/ipfs/'+cid).then(res=>res.buffer()).catch(err=>console.log(err))
        
        res.setHeader("Content-Type", extension);

        res.send(file);

    })(req, res);
})

Router.get('/booms/:type?/:userOrId?', (req, res)=>{

    (async (req, res)=>{

        let type = req.params.type;
        let userOrId = req.params.userOrId;
        let booms;
        let boomList = [];
        

        if (type == "all" && userOrId == undefined){
            booms = await BDB.searchAssets("boom_post", null).then(res=>res).catch(err=>console.log(err));
        }
        else if (type == "all" && typeof(userOrId) == "string" || type == "post" && typeof(userOrId) == "string"){
            booms = await BDB.searchAssets(userOrId, null).then(res=>res).catch(err=>console.log(err));
        }
        else {
            booms = await BDB.searchAssets("boom_post", null).then(res=>res).catch(err=>console.log(err));
        }

        if (booms.length > 0){
            booms.forEach(async (boom, index)=>{
            
                let userdata = await BDB.searchAssets(boom.data.authorId, null).then(res=>res).catch(err=>console.log(err));

                userdata = userdata.filter((a,b)=>{
                    return (a.data.assetType == 'user_account');
                });

                if (userdata.length > 0){

                    if (userdata[0] && 'id' in userdata[0]){
                        
                        boom.author = {
                            id: userdata[0]['id'],
                            username: userdata[0].data.username
                        };
                        boomList.push(boom);
                    }
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

    })(req, res)
})

Router.get('/boom_comments/:boomId', (req, res)=>{

    (async (req, res)=>{

        let type = req.params.type;
        let boomId = req.params.boomId;
        let commentList = [];
        
        if (boomId !== null){
            commentList = _scanner.orderBy((await BDB.searchAssets(boomId).then(res=>res).catch(err=>console.log(err))).filter((a,b)=>{
                return (a.data.assetType == 'boom_comment');
            }),  ['data.dateCreated'], ['asc']);
        }
        
        res.send(commentList);

    })(req, res)
})

Router.post('/hide_boom/:boomId', (req, res)=>{

    (async (req, res)=>{

        // if (req.params.boomId){
            
        //     console.log('Hiding boom with ID: ', req.params.boomId);

        //     try {

        //         await dbconn.db.collection('metadata').updateMany({$or:[{id: req.params.boomId}, {'metadata.originalBoom': req.params.boomId}]}, {$set:{'metadata':{isHidden: true}}});

        //         console.log('Done!');
            
        //         res.send({status: true, isHidden: true})
        //     }
        //     catch (error){
        //         console.log(error);
        //         res.send({status: false})
        //     }
        // }
        // else {
        //     res.send({status: false})
        // }

        let userCred = JSON.parse(req.body.userCred);
        
        let boom = await BDB.getTransaction(req.params.boomId).then(res=>res).catch(err=>console.log(err));
        
        let transaction = bigchainDb.Transaction.makeTransferTransaction([{
            tx: boom,
            output_index: 0
        }], [bigchainDb.Transaction.makeOutput(bigchainDb.Transaction.makeEd25519Condition(userCred.pubKey))], {
            isHidden: true,
            boomId: req.params.boomId,
            lastUpdated:new Date().getTime()
        });
        
        let privateKey = await (new User()).deCipher(userCred.privKey, userCred.passcode, userCred.password).then(res=>res).catch(err=>console.log(err));
                
        console.log('\r\n**** Updating boom on blockchain ****')

        let signedTransaction = bigchainDb.Transaction.signTransaction(transaction, privateKey)
        

        BDB.postTransactionCommit(signedTransaction).then(async (result)=>{
            
            res.send({status:true, boomdata: result});

        }).catch(err=>{
            console.log(err);
        });

    })(req, res)
})

Router.post('/unhide_boom/:boomId', (req, res)=>{
    
    (async (req, res)=>{

        if (req.params.boomId){
            
            console.log('Unhiding boom with ID: ', req.params.boomId);

            try {
                
                await dbconn.db.collection('metadata').updateMany({$or:[{id: req.params.boomId}, {'metadata.originalBoom': req.params.boomId}]}, {$set:{'metadata':{isHidden: false}}}).then(res=>res).catch(err=>console.log(err));

                console.log('Done!');
            
                res.send({status: true, isHidden: false})
            }
            catch (error){
                console.log(error);
                res.send({status: false})
            }
        }
        else {
            res.send({status: false})
        }

    })(req, res)
})

/** All users are required to provide their login credentials as query args, in order to decrypt and access other users' public information */
Router.get('/user/:userId?/:queryUsername?/:queryPasscode?/:queryPassword?', (req, res)=>{
    
    (async (req, res)=>{

        try {
            let userId = req.params.userId;
            let queryUsername = (req.params.queryUsername !== undefined ? req.params.queryUsername : undefined);
            let queryPassword = (req.params.queryPassword !== undefined ? req.params.queryPassword : undefined);
            let queryPasscode = (req.params.queryPasscode !== undefined ? req.params.queryPasscode.replaceAll(' ', '') : undefined);

            let isSignedIn = (await simulateUserLogin(queryUsername, queryPasscode, queryPassword).then(res=>res).catch(err=>console.log(err)));

            let user;

            if (userId !== undefined && typeof(userId) == "string"){

                userdata = await BDB.searchMetadata(userId).then(res=>res).catch(err=>console.log(err));

                if (userdata.length > 0){

                    if (queryUsername !== undefined && queryPasscode !== undefined && queryPassword !== undefined && isSignedIn.status){
                    
                        try {
                            let decryptedUser = new User(null).usePublicDecrypt(userdata[0].metadata.encryptedUserPublicData, userdata[0].metadata.publicEDKey); // decrypt requested public data if provided credentials are valid

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
        }
        catch(err){
            console.log(err)
        }

    })(req, res)
})

Router.get('/avatars', (req, res)=>{

    (async (req, res)=>{

        try {
            // console.log(fs.readdirSync('/root/.jsipfs/').includes('repo.lock'));

            let avatars = _scanner.orderBy((await BDB.searchAssets('profile_picture', null).then(res=>res).catch(err=>console.log(err))),  ['data.dateCreated'], ['desc']);
            
            res.send(avatars);
        }
        catch(err){
            console.log(err)
        }

    })(req, res)
})

Router.get('/avatar/:uid', (req, res)=>{

    (async (req, res)=>{

        let bufferChunks = [];
            
        try {
            // console.log(fs.readdirSync('/root/.jsipfs/').includes('repo.lock'));

            let media = _scanner.orderBy(await dbconn.db.collection('assets').find({$and:[{'data.assetType': 'profile_picture'}, {'data.authorId': req.params.uid}]}).toArray(),  ['data.dateCreated'], ['desc']);

            let avatars = media.filter((a,b)=>{
                if (a.data.mediaUUID == media[0].data.mediaUUID){
                    bufferChunks.push(Buffer.from(a.data.media));
                    return a;
                }
            });

            if (avatars.length > 0){
                let ext = avatars[0].data.mediaType;
                
                res.setHeader('Content-Type', ext);

                res.send(Buffer.concat(bufferChunks));
            }
            else {
                res.send(false)
            }
        }
        catch(err){
            console.log(err)
        }

    })(req, res)
})

Router.get('/boom_media/:bmId?', (req, res)=>{

    (async (req, res)=>{

        try {
            // console.log(fs.readdirSync('/root/.jsipfs/').includes('repo.lock'));

            let bufferChunks = [];
            let mediaID = req.params.bmId;
            
            if (mediaID){

                // let media = _scanner.orderBy((await BDB.searchAssets(`${mediaID}`, null)),  ['data.dateCreated'], ['desc']).filter((a,b)=>{
                //     if (a.data.assetType == 'boom_media'){
                //         bufferChunks.push(Buffer.from(a.data.media));
                //         return a;
                //     }
                // });

                let media = _scanner.orderBy(await dbconn.db.collection('assets').find({$and:[{'data.assetType': 'boom_media'}, {'data.mediaUUID': mediaID}]}).toArray(),  ['data.dateCreated'], ['desc']).filter((a,b)=>{
                    if (a.data.assetType == 'boom_media'){
                        bufferChunks.push(Buffer.from(a.data.media));
                        return a;
                    }
                });

                if (media.length > 0){

                    let ext = media[0].data.mediaType;
                    
                    res.setHeader('Content-Type', ext);
                    res.send(Buffer.concat(bufferChunks));
                }
                else {
                    res.send(false)
                }
            }
            else {
                let media = _scanner.orderBy((await BDB.searchAssets('boom_media', null).then(res=>res).catch(err=>console.log(err))),  ['data.dateCreated'], ['desc']);

                res.send(media);
            }
        }
        catch(err){
            console.log(err)
        }

    })(req, res)
})


Router.get('/ping_servers', (req, res)=>{
    (async (req, res)=>{
        try {
            let bigchain = await BDB.searchAssets('boom_post', null).then(res=>res).catch(err=>console.log(err));
            let mongodb = await dbconn.db.collection('assets').find({'data.assetType':'boom_post'}).toArray().then(res=>res).catch(err=>console.log(err));

            res.send({bigchain: bigchain.length, mongodb: mongodb.length})
        }
        catch (err){
            console.log(err)
        }

    })(req, res)
});

async function simulateUserLogin(username, passcode, password){
    
    // find user by username
    let findUserInAssets = await BDB.searchAssets(username).then(res=>res).catch(err=>console.log(err));
    
    if (findUserInAssets && findUserInAssets.length > 0){
        let userQuery = findUserInAssets[0].data.encryptedUserData;

        // console.log(userQuery);

        try {

            let user = JSON.parse(await (new User(null)).deCipher(userQuery, passcode, password).then(res=>res).catch(err=>console.log(err)));

            if (user){
                
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


setInterval(async ()=>{
    fetch('https://server.pekaboom.com/ping_servers').then(async res=>{
        console.log(await res.json());
    }).catch(err=>console.log(err))
}, 30000)

module.exports = Router;
