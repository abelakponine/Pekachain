const express = require('express');
const { default: Pekachain } = require('../Pekachain/modules/Pekachain');
const app = express();
const User = require('../Pekachain/modules/User');
const http = require('http');
const server = http.createServer(app);
const peka = new Pekachain();
const bigchainDb = require("bigchaindb-driver");
const { default: MutableData } = require('../Pekachain/modules/MutableData');
const formidable = require('formidable');
const GridFS = require('mongoose-gridfs');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const {Blob} = require('buffer');
const Base58 = require('base-58');
const crypto = require('crypto');

const fetch = require('node-fetch');

// const IPFS_URL = 'https://cloudflare-ipfs.com/ipfs';
// const IPFS_URL = 'https://infura-ipfs.io/ipfs';
const IPFS_URL = 'https://pekaboom.infura-ipfs.io/ipfs';
var BDB = new bigchainDb.Connection(peka.getNodeEndpoint());

var host = 'https://server.pekaboom.com';
// host = 'http://localhost:4000'

/** CORS */
const allowedOrigins = ["https://pekaboom.com", "https://www.pekaboom.com", "https://server.pekaboom.com", "https://hms.pekaboom.com", "http://pekaboom.com", "http://server.pekaboom.com"];

allowedOrigins.push("http://localhost");
allowedOrigins.push("http://localhost:3000");
allowedOrigins.push("http://localhost:3001");
allowedOrigins.push('http://localhost:5000');
allowedOrigins.push("http://192.168.0.15");
allowedOrigins.push("https://192.168.0.15");
allowedOrigins.push('http://192.168.0.15:3000');
allowedOrigins.push('http://192.168.0.15:5000');
allowedOrigins.push('https://192.168.0.15:3000');
allowedOrigins.push("http://pekaboom.com:3000");
allowedOrigins.push("http://server.pekaboom.com:3000");

app.use((req, res, next)=>{
    originIndex = allowedOrigins.indexOf(req.headers.origin);
    res.header("Access-Control-Allow-Origin", allowedOrigins[originIndex]);
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Host, Referer, Origin, X-Requested-With, Content-Type, Accept, token");
    res.header("Access-Control-Allow-Methods", "*")
    next();
});

app.use(express.urlencoded({extended:true}));
app.use(express.json());

var IPFS = undefined;


/** Create new boom post */
app.post('/create_boom', cors(), (req, res)=>{
    
    try {

        let form = new formidable.IncomingForm();

        form.parse(req, async (error, fields, files)=>{


            console.log('\r\n**** Preparing boom ****')

            let filepath = files.data.filepath;
            let author = JSON.parse(fields.author);
            let file = fs.readFileSync(filepath);
            
            var content = fields.content;
            var hasMedia = fields.hasMedia;
            var registered_accounts = await BDB.searchAssets("user_account");

            var reward = (fields.hasMedia == 'true' && fields.content !== '' ? peka.calculateRewardPoints(registered_accounts) : peka.calculateRewardPoints(registered_accounts) / 2); // if user post has both media and content, then they get full reward, otherwise they get half rewards.

            if ("hasMedia" in fields){

                var mediaAsset = {}

                //  do files upload
                if ("data" in files && fields.hasMedia == 'true'){
                    let bufferSize = (140 * 1024);
                    let filepath = files.data.filepath;
                    let uploadedFile = fs.readFileSync(filepath);
                    let uuid = (crypto.randomUUID()+(new Date().getTime())).replaceAll('-', '');
                    let i = 0;
                    let uploadResults = [];

                    for (i; i < Math.ceil(uploadedFile.length / bufferSize); i++){

                        let bufferChunk = uploadedFile.slice(i*bufferSize, bufferSize*(i+1));
                        mediaAsset.assetType = "boom_media",
                        mediaAsset.media = bufferChunk;
                        mediaAsset.mediaType =  files.data.mimetype; // set media type
                        mediaAsset.mediaUUID = uuid;
                        mediaAsset.originalMediaName = files.data.originalFilename
                        mediaAsset.mediaExtension = files.data.originalFilename.split('.')[files.data.originalFilename.split('.').length - 1];
                        
                        uploadResults.push(await uploadToBigchainDB(req, mediaAsset, fields, files, error));
                    }
                    
                    boomAsset = {
                        assetType: "boom_post",
                        content: content,
                        hasMedia: (hasMedia == 'true' ? true : false),
                        media: null,
                        mediaType: null,
                        originalMediaName: null,
                        mediaExtension: null,
                        mediaUUID: uuid,
                        authorId: author.id,
                        dateCreated: new Date().getTime(),
                        reward: reward,
                        isShared: false,
                        sharedBy: null,
                        sharedBoomId: null
                    }
                
                    let privateKey = await (new User()).deCipher(fields.privateKey, fields.passcode, fields.password).then(res=>res).catch(err=>console.log(err));
            
                    console.log('\r\n**** Adding boom to blockchain ****')
            
                    let transaction = bigchainDb.Transaction.makeCreateTransaction(
                        {
                            ...boomAsset
            
                        }, null ,
                        [bigchainDb.Transaction.makeOutput(bigchainDb.Transaction.makeEd25519Condition(author.publicKey))],
                        author.publicKey
                    )

                    let signedTransaction = bigchainDb.Transaction.signTransaction(transaction, privateKey)
                    
                    BDB.postTransactionCommit(signedTransaction).then(async (result)=>{
                            
                        console.log('\r\n**** Uploading media files ****')

                        result.asset.data.id = result.id;

                        res.send({status:true, boomdata: result, filedata: uploadResults});

                    }).catch(err=>{
                        console.log(err);
                    })
                    
                }
                else {
                    res.send({status:true, boomdata: result, filedata: []});
                } 
            }
            else {

                boomAsset = {
                    assetType: "boom_post",
                    content: content,
                    hasMedia: (hasMedia == 'true' ? true : false),
                    media: null,
                    mediaType: null,
                    originalMediaName: null,
                    mediaExtension: null,
                    mediaUUID: null,
                    authorId: author.id,
                    dateCreated: new Date().getTime(),
                    reward: reward,
                    isShared: false,
                    sharedBy: null,
                    sharedBoomId: null
                }
            
                let privateKey = await (new User()).deCipher(fields.privateKey, fields.passcode, fields.password).then(res=>res).catch(err=>console.log(err));
        
                console.log('\r\n**** Adding boom to blockchain ****')
        
                let transaction = bigchainDb.Transaction.makeCreateTransaction(
                    {
                        ...boomAsset
        
                    }, null ,
                    [bigchainDb.Transaction.makeOutput(bigchainDb.Transaction.makeEd25519Condition(author.publicKey))],
                    author.publicKey
                )

                let signedTransaction = bigchainDb.Transaction.signTransaction(transaction, privateKey)
                
                BDB.postTransactionCommit(signedTransaction).then(async (result)=>{
                        
                    console.log('\r\n**** Uploading media files ****')

                    result.asset.data.id = result.id;

                    // console.log(results.length);
                    res.send({status:true, boomdata: result});

                }).catch(err=>{
                    console.log(err);
                })
            }
        
        });
    }
    catch (error){
        console.log(error);
    }
});


/** Use router */
app.post('/create_boom2', cors(), (req, res)=>{
    
    try {

        let form = new formidable.IncomingForm();
        let storedPeers = [];

        form.parse(req, async (err, fields, files)=>{

            if ("hasMedia" in fields){

                let content = fields.content;
                let hasMedia = fields.hasMedia;
                let author = JSON.parse(fields.author);
                let registered_accounts = await BDB.searchAssets("user_account");

                let reward = (fields.hasMedia == 'true' && fields.content !== '' ? peka.calculateRewardPoints(registered_accounts) : peka.calculateRewardPoints(registered_accounts) / 2); // if user post has both media and content, then they get full reward, otherwise they get half rewards.

                let asset = {
                    assetType: "boom_post",
                    content: content,
                    hasMedia: (hasMedia == 'true' ? true : false),
                    media: null,
                    mediaType: null,
                    originalMediaName: null,
                    mediaExtension: null,
                    authorId: author.id,
                    dateCreated: new Date().getTime(),
                    reward: reward
                }

                //  do files upload
                if ("data" in files && fields.hasMedia == 'true'){

                    if (IPFS === undefined){
                        await import('ipfs').then(async data=>{

                            const projectId = '2GBjvanH5NiwzvfChVWyJT3Wo84';
                            const projectSecret = '081e4b5d9bec42528c05a9c5d681c287';
                            const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64')
                            // Use cloudflare ipfs node
                            // IPFS = await data.create({
                            //     host: 'ipfs.infura.io',
                            //     port: 5001,
                            //     protocol: 'https',
                            //     headers: {
                            //         authorization: auth,
                            //     },
                            // });

                            IPFS = await data.create();
                            
                        }).catch(err=>{
                            console.log(err)
                        });
                    }
                    
                    console.log('\r\n**** Ready to upload media files ****')
                                
                    /**** Remove comments to enable GridFS support, but you should also disable All IPFS ****/

                    // let fileExtension = files.data.originalFilename.split('.')[files.data.originalFilename.split('.').length-1];

                    // let conn = mongoose.createConnection("mongodb://34.142.39.129:27017/GridFS");

                    // conn.on("open", ()=>{

                    //     const attachment = GridFS.createModel({
                    //         modelName: "File",
                    //         connection: conn
                    //     });

                        // let filename = files.data.originalFilename;
                        // let readStream = fs.createReadStream(filepath);
                        // let options = {filename: filename, aliases: [fileExtension]};
                        // let filepath = files.data.filepath;
                        
                        // (async (filepath)=>{

                            let filepath = files.data.filepath;

                            let file = fs.readFileSync(filepath);
                            
                            console.log('\r\n**** Uploading media files ****')
                            
                            IPFS.add(file, {pin: true}).then( async (file)=>{
                                
                                let projectId = '2GBjvanH5NiwzvfChVWyJT3Wo84';
                                let projectSecret = '081e4b5d9bec42528c05a9c5d681c287';
                                
                                // console.log(IPFS.cids)
                                console.log('Pinned to IPFS: ', await IPFS.pin.add(file.cid), file, IPFS.CID, "Basic " + Buffer.from(projectId + ':' + projectSecret).toString('base64'));
                                
                                let headers = new fetch.Headers();
                                headers.set("Authorization", "Basic " + Buffer.from(projectId + ':' + projectSecret).toString('base64'));

                                console.log('Pinning: ', await fetch('https://ipfs.infura.io:5001/api/v0/pin/add?arg='+file.cid.toString(), {
                                    method: 'POST',
                                    headers
                                }).then(res=>res.json()))

                                asset.media = file.cid.toString(); // add file ID to blockchain post and commit
                                asset.mediaType =  files.data.mimetype; // set media type 
                                asset.originalMediaName = files.data.originalFilename
                                asset.mediaExtension = files.data.originalFilename.split('.')[files.data.originalFilename.split('.').length - 1];

                                let privateKey = await (new User()).deCipher(fields.privateKey, fields.passcode, fields.password);

                                console.log('**** Adding post to blockchain ****', file.cid.toString())

                                let transaction = bigchainDb.Transaction.makeCreateTransaction(
                                    {
                                        ...asset

                                    }, null ,
                                    [bigchainDb.Transaction.makeOutput(bigchainDb.Transaction.makeEd25519Condition(author.publicKey))],
                                    author.publicKey
                                )

                                let signedTransaction = bigchainDb.Transaction.signTransaction(transaction, privateKey)
                                
                                BDB.postTransactionCommit(signedTransaction).then(async (result)=>{
                                        
                                    console.log('\r\n**** Post published! ****')
                                    
                                    res.send({status:true, data: result.asset.data});

                                }).catch(err=>{
                                    console.log(err);
                                })
                            });

                        
                        // })(filepath);

                        // uncomment to write file chunks to mongodb using GridFS
                        // attachment.write(options, readStream, (err, file)=>{
                            
                        //     attachment.read({
                        //         _id: file._id
                        //     }, async (err, buffer)=>{

                        //         asset.media = file._id.toString(); // add file ID to blockchain post and commit
                                
                        //         // console.log(asset, file._id.toString())
            
                        //         let privateKey = await new MutableData().deCipher(fields.privateKey, fields.passcode, fields.password);

                        //         let transaction = bigchainDb.Transaction.makeCreateTransaction(
                        //             {
                        //                 ...asset

                        //             }, null ,
                        //             [bigchainDb.Transaction.makeOutput(bigchainDb.Transaction.makeEd25519Condition(author.publicKey))],
                        //             author.publicKey
                        //         )

                        //         let signedTransaction = bigchainDb.Transaction.signTransaction(transaction, privateKey)

                        //         // BDB = new bigchainDb.Connection(peka.getNodeEndpoint());
                        //         BDB.postTransactionCommit(signedTransaction).then((result)=>{
                        //             result.mediaBuffer = buffer
                        //             console.log(result, file)
                        //             res.json({status:true, data: result.asset.data})
                        //         });
                        //     });

                        // });
                }
                else {

                    let privateKey = await (new User()).deCipher(fields.privateKey, fields.passcode, fields.password);

                    console.log('**** Adding post to blockchain ****', privateKey)

                    let transaction = bigchainDb.Transaction.makeCreateTransaction(
                        {
                            ...asset

                        }, null ,
                        [bigchainDb.Transaction.makeOutput(bigchainDb.Transaction.makeEd25519Condition(author.publicKey))],
                        author.publicKey
                    )

                    let signedTransaction = bigchainDb.Transaction.signTransaction(transaction, privateKey)

                    BDB.postTransactionCommit(signedTransaction).then(async (result)=>{
                            
                        console.log('\r\n**** Post published! ****')
                        
                        res.json({status:true, data: result.asset.data});

                    }).catch(err=>{
                        console.log(err);
                    })
                }

            }
        });
    }
    catch (error){
        console.log(error);
    }
});


/** Create new boom post */
app.post('/share_boom/:boomId/:authorId/:mediaUUID?', cors(), (req, res)=>{
    
    try {

        let form = new formidable.IncomingForm();

        form.parse(req, async (error, fields, files)=>{


            console.log('\r\n**** Preparing boom ****')

            let authorId = req.params.authorId;
            let boomId = req.params.boomId;
            let sharer = JSON.parse(fields.author);
            let mediaUUID = req.params.mediaUUID ? req.params.mediaUUID : null;

            var content = fields.content;
            var hasMedia = fields.hasMedia;
            var registered_accounts = await BDB.searchAssets("user_account");

            var reward = (fields.hasMedia == 'true' && fields.content !== '' ? peka.calculateRewardPoints(registered_accounts) / 4 : peka.calculateRewardPoints(registered_accounts) / 8); // if user post has both media and content, then they get full reward, otherwise they get half rewards.

            if ("hasMedia" in fields){

                console.log(mediaUUID)

                if (mediaUUID, req.params.mediaUUID){

                    boomAsset = {
                        assetType: "boom_post",
                        content: content,
                        hasMedia: (hasMedia == 'true' ? true : false),
                        media: null,
                        mediaType: null,
                        originalMediaName: null,
                        mediaExtension: null,
                        mediaUUID: mediaUUID,
                        authorId: authorId,
                        dateCreated: new Date().getTime(),
                        reward: reward,
                        isShared: true,
                        sharedBy: sharer.id,
                        sharedBoomId: boomId
                    }
                
                    let privateKey = await (new User()).deCipher(fields.privateKey, fields.passcode, fields.password).then(res=>res).catch(err=>console.log(err));
            
                    console.log('\r\n**** Adding boom to blockchain ****')
            
                    let transaction = bigchainDb.Transaction.makeCreateTransaction(
                        {
                            ...boomAsset
            
                        },
                        {
                            originalBoom: boomId,
                            lastUpdated:new Date().getTime()
                        },
                        [bigchainDb.Transaction.makeOutput(bigchainDb.Transaction.makeEd25519Condition(sharer.publicKey))],
                        sharer.publicKey
                    )

                    let signedTransaction = bigchainDb.Transaction.signTransaction(transaction, privateKey)
                    
                    BDB.postTransactionCommit(signedTransaction).then(async (result)=>{
                            
                        console.log('\r\n**** Uploading media files ****')

                        result.asset.data.id = result.id;

                        console.log(result);
                        
                        res.send({status:true, boomdata: result});

                    }).catch(err=>{
                        console.log(err);
                    })
                    
                }
                else {
                    res.send({status:true, boomdata: result, filedata: []});
                } 
            }
            else {

                boomAsset = {
                    assetType: "boom_post",
                    content: content,
                    hasMedia: (hasMedia == 'true' ? true : false),
                    media: null,
                    mediaType: null,
                    originalMediaName: null,
                    mediaExtension: null,
                    mediaUUID: null,
                    authorId: authorId,
                    dateCreated: new Date().getTime(),
                    reward: reward,
                    isShared: true,
                    sharedBy: sharer.id,
                    sharedBoomId: boomId
                }
            
                let privateKey = await (new User()).deCipher(fields.privateKey, fields.passcode, fields.password).then(res=>res).catch(err=>console.log(err));
        
                console.log('\r\n**** Adding boom to blockchain ****')
        
                let transaction = bigchainDb.Transaction.makeCreateTransaction(
                    {
                        ...boomAsset
        
                    },
                    {
                        originalBoom: boomId,
                        lastUpdated:new Date().getTime()
                    },
                    [bigchainDb.Transaction.makeOutput(bigchainDb.Transaction.makeEd25519Condition(sharer.publicKey))],
                    sharer.publicKey
                )

                let signedTransaction = bigchainDb.Transaction.signTransaction(transaction, privateKey)
                
                BDB.postTransactionCommit(signedTransaction).then(async (result)=>{
                        
                    console.log('\r\n**** Uploading media files ****')

                    result.asset.data.id = result.id;

                    // console.log(results.length);
                    res.send({status:true, boomdata: result});

                }).catch(err=>{
                    console.log(err);
                })
            }
        
        });
    }
    catch (error){
        console.log(error);
    }
});

/** Create new boom comment */
app.post('/create_boom_comment', cors(), (req, res)=>{
    
    (async (req, res)=>{

        try {

            let form = new formidable.IncomingForm();
            
            form.parse(req, async (error, fields, files)=>{

                if ("hasMedia" in fields){

                    var content = fields.content;
                    var hasMedia = fields.hasMedia;
                    var author = JSON.parse(fields.author);
                    var registered_accounts = await BDB.searchAssets("user_account");

                    var reward = (fields.hasMedia == 'true' && fields.content !== '' ? peka.calculateRewardPoints(registered_accounts) : peka.calculateRewardPoints(registered_accounts) / 2); // if user post has both media and content, then they get full reward, otherwise they get half rewards.

                    var asset = {
                        assetType: "boom_comment",
                        boomId: fields.boomId,
                        content: content,
                        hasMedia: (hasMedia == 'true' ? true : false),
                        media: null,
                        mediaType: null,
                        originalMediaName: null,
                        mediaExtension: null,
                        authorId: author.id,
                        dateCreated: new Date().getTime(),
                        reward: reward
                    }

                    //  do files upload
                    if ("data" in files && fields.hasMedia == 'true'){

                        if (IPFS === undefined){
                            await import('ipfs').then(async data=>{

                                // Use cloudflare ipfs node
                                IPFS = await data.create({host:IPFS_URL}).then(ipfs=>ipfs).catch(err=>console.log(err));
                                
                                doIPFSandBigchainDB(req, res, asset, fields, files, error);

                                /**** Remove comments to enable GridFS support, but you should also disable All IPFS ****/
                                // doGridFSandBigchainDB(req, res, asset, fields, files, error)

                            }).catch(err=>{
                                console.log(err)
                            });
                        }
                        else {

                            doIPFSandBigchainDB(req, res, asset, fields, files, error);
                            
                            /**** Remove comments to enable GridFS support, but you should also disable All IPFS ****/
                            // doGridFSandBigchainDB(req, res, asset, fields, files, error)
                        }
                        
                    }
                    else {

                        let privateKey = await (new User()).deCipher(fields.privateKey, fields.passcode, fields.password).then(res=>res).catch(err=>console.log(err));

                        console.log('**** Adding post to blockchain ****', privateKey)

                        let transaction = bigchainDb.Transaction.makeCreateTransaction(
                            {
                                ...asset

                            }, null ,
                            [bigchainDb.Transaction.makeOutput(bigchainDb.Transaction.makeEd25519Condition(author.publicKey))],
                            author.publicKey
                        )

                        let signedTransaction = bigchainDb.Transaction.signTransaction(transaction, privateKey)

                        BDB.postTransactionCommit(signedTransaction).then(async (result)=>{
                                
                            console.log('\r\n**** Comment published! ****')
                            
                            res.json({status:true, data: result.asset.data});

                        }).catch(err=>{
                            console.log(err);
                        })
                    }

                }
            });
        }
        catch (error){
            console.log(error);
        }
        
    })(req, res)
});

/** Upload profile picture */
app.post('/upload_profile_picture', cors(), (req, res)=>{
    
    (async (req, res)=>{

        try {

            let form = new formidable.IncomingForm();
            
            form.parse(req, async (error, fields, files)=>{

                if ("hasMedia" in fields){

                    var hasMedia = fields.hasMedia;
                    var author = JSON.parse(fields.author);

                    var asset = {
                        assetType: "profile_picture",
                        hasMedia: (hasMedia == 'true' ? true : false),
                        media: null,
                        mediaUUID: null,
                        mediaType: null,
                        originalMediaName: null,
                        mediaExtension: null,
                        mediaOffset: fields.mediaOffset,
                        authorId: author.id,
                        dateCreated: new Date().getTime()
                    }

                    //  do files upload
                    if ("data" in files && fields.hasMedia == 'true'){
                        let bufferSize = (140 * 1024);
                        let filepath = files.data.filepath;
                        let uploadedFile = fs.readFileSync(filepath);

                        let i = 0;
                        let uuid = (new Date().getTime())+'-'+crypto.randomUUID();
                        let results = [];

                        for (i; i < Math.ceil(uploadedFile.length / bufferSize); i++){
                            
                            let bufferChunk = uploadedFile.slice(i*bufferSize, bufferSize*(i+1));
                            asset.media = bufferChunk;
                            asset.mediaType =  files.data.mimetype; // set media type
                            asset.mediaUUID = (uuid).replaceAll('-', '');
                            asset.originalMediaName = files.data.originalFilename
                            asset.mediaExtension = files.data.originalFilename.split('.')[files.data.originalFilename.split('.').length - 1];
                    
                            results.push(await uploadToBigchainDB(req, asset, fields, files, error));

                        }
                        
                        // console.log(results.length);
                        res.send({status:true, data: results});
                    }
                    else {
                        res.send({status: false, error: 'No media found, please upload a file.'})
                    }
                }
            });
        }
        catch (error){
            console.log(error);
        }

    })(req, res)
});

/** Upload profile picture: for IPFS */
app.post('/upload_profile_picture2', cors(), (req, res)=>{
    
    try {

        let form = new formidable.IncomingForm();
        
        form.parse(req, async (error, fields, files)=>{

            if ("hasMedia" in fields){

                var hasMedia = fields.hasMedia;
                var author = JSON.parse(fields.author);

                var asset = {
                    assetType: "profile_picture",
                    hasMedia: (hasMedia == 'true' ? true : false),
                    media: null,
                    mediaType: null,
                    originalMediaName: null,
                    mediaExtension: null,
                    mediaOffset: fields.mediaOffset,
                    authorId: author.id,
                    dateCreated: new Date().getTime()
                }

                //  do files upload
                if ("data" in files && fields.hasMedia == 'true'){

                    if (IPFS === undefined){
                        await import('ipfs').then(async data=>{

                            // Use cloudflare ipfs node
                            IPFS = await data.create({host:IPFS_URL}).then(ipfs=>ipfs).catch(err=>console.log(err));
                            
                            doIPFSandBigchainDB(req, res, asset, fields, files, error);

                            /**** Remove comments to enable GridFS support, but you should also disable All IPFS ****/
                            // doGridFSandBigchainDB(req, res, asset, fields, files, error)

                        }).catch(err=>{
                            console.log(err)
                        });
                    }
                    else {

                        doIPFSandBigchainDB(req, res, asset, fields, files, error);
                        
                        /**** Remove comments to enable GridFS support, but you should also disable All IPFS ****/
                        // doGridFSandBigchainDB(req, res, asset, fields, files, error)
                    }
                    
                }
                else {

                    let privateKey = await (new User()).deCipher(fields.privateKey, fields.passcode, fields.password).then(res=>res).catch(err=>console.log(err));

                    console.log('**** Adding post to blockchain ****', privateKey)

                    let transaction = bigchainDb.Transaction.makeCreateTransaction(
                        {
                            ...asset

                        }, null ,
                        [bigchainDb.Transaction.makeOutput(bigchainDb.Transaction.makeEd25519Condition(author.publicKey))],
                        author.publicKey
                    )

                    let signedTransaction = bigchainDb.Transaction.signTransaction(transaction, privateKey)

                    BDB.postTransactionCommit(signedTransaction).then(async (result)=>{
                            
                        console.log('\r\n**** Comment published! ****')
                        
                        res.json({status:true, data: result.asset.data});

                    }).catch(err=>{
                        console.log(err);
                    })
                }

            }
        });
    }
    catch (error){
        console.log(error);
    }
});



async function uploadToBigchainDB(req, asset, fields, files, error){
    
    console.log('\r\n**** Ready to upload media files ****')

    let filepath = files.data.filepath;
    let author = JSON.parse(fields.author);
    let file = fs.readFileSync(filepath);

    console.log('\r\n**** Uploading media files ****')
    
    let privateKey = await (new User()).deCipher(fields.privateKey, fields.passcode, fields.password).then(res=>res).catch(err=>console.log(err));

    console.log('\r\n**** Adding post to blockchain ****', 'CID: ', asset.mediaUUID)

    let transaction = bigchainDb.Transaction.makeCreateTransaction(
        {
            ...asset

        }, null ,
        [bigchainDb.Transaction.makeOutput(bigchainDb.Transaction.makeEd25519Condition(author.publicKey))],
        author.publicKey
    )

    let signedTransaction = bigchainDb.Transaction.signTransaction(transaction, privateKey)
    
    return await BDB.postTransactionCommit(signedTransaction).then(async (result)=>{
            
        console.log('\r\n**** Post published! ****')
        
        return result.asset.data;

    }).catch(err=>{
        console.log(err);
    })

}

async function doIPFSandBigchainDB(req, res, asset, fields, files, error){
    
    console.log('\r\n**** Ready to upload media files ****')

    let filepath = files.data.filepath;
    let author = JSON.parse(fields.author);
    let file = fs.readFileSync(filepath);
    
    console.log('\r\n**** Uploading media files ****')
        
    IPFS.add(file).then( async (file)=>{
        
        asset.media = file.cid.toString(); // add file ID to blockchain post and commit
        asset.mediaType =  files.data.mimetype; // set media type 
        asset.originalMediaName = files.data.originalFilename
        asset.mediaExtension = files.data.originalFilename.split('.')[files.data.originalFilename.split('.').length - 1];

        let privateKey = await (new User()).deCipher(fields.privateKey, fields.passcode, fields.password).then(res=>res).catch(err=>console.log(err));

        console.log('\r\n**** Adding post to blockchain ****', 'CID: ', file.cid.toString())

        let transaction = bigchainDb.Transaction.makeCreateTransaction(
            {
                ...asset

            }, null ,
            [bigchainDb.Transaction.makeOutput(bigchainDb.Transaction.makeEd25519Condition(author.publicKey))],
            author.publicKey
        )

        let signedTransaction = bigchainDb.Transaction.signTransaction(transaction, privateKey)
        
        BDB.postTransactionCommit(signedTransaction).then(async (result)=>{
                
            console.log('\r\n**** Post published! ****', result)
            
            res.send({status:true, data: result.asset.data});

        }).catch(err=>{
            console.log(err);
        })
    });

}

async function doGridFSandBigchainDB(req, res, asset, fields, files, error){
    
    let fileExtension = files.data.originalFilename.split('.')[files.data.originalFilename.split('.').length-1];

    let conn = mongoose.createConnection("mongodb://34.142.39.129:27017/GridFS");

    conn.on("open", ()=>{

        const attachment = GridFS.createModel({
            modelName: "File",
            connection: conn
        });

        let author = JSON.parse(fields.author);
        let filename = files.data.originalFilename;
        let readStream = fs.createReadStream(filepath);
        let options = {filename: filename, aliases: [fileExtension]};
        let filepath = files.data.filepath;
        
        (async (filepath)=>{

            // let filepath = files.data.filepath;

            let file = fs.readFileSync(filepath);
            
            console.log('\r\n**** Uploading media files ****')
                
            IPFS.add(file).then( async (file)=>{
                
                asset.media = file.cid.toString(); // add file ID to blockchain post and commit
                asset.mediaType =  files.data.mimetype; // set media type 
                asset.originalMediaName = files.data.originalFilename
                asset.mediaExtension = files.data.originalFilename.split('.')[files.data.originalFilename.split('.').length - 1];
                
                let privateKey = await (new User()).deCipher(fields.privateKey, fields.passcode, fields.password).then(res=>res).catch(err=>console.log(err));

                console.log('**** Adding post to blockchain ****', privateKey)

                let transaction = bigchainDb.Transaction.makeCreateTransaction(
                    {
                        ...asset

                    }, null ,
                    [bigchainDb.Transaction.makeOutput(bigchainDb.Transaction.makeEd25519Condition(author.publicKey))],
                    author.publicKey
                )

                let signedTransaction = bigchainDb.Transaction.signTransaction(transaction, privateKey)
                
                BDB.postTransactionCommit(signedTransaction).then(async (result)=>{
                        
                    console.log('\r\n**** Post published! ****')
                    
                    res.send({status:true, data: result.asset.data});

                }).catch(err=>{
                    console.log(err);
                })
            });

        
        })(filepath);

        attachment.write(options, readStream, (err, file)=>{
            
            attachment.read({
                _id: file._id
            }, async (err, buffer)=>{

                asset.media = file._id.toString(); // add file ID to blockchain post and commit
                
                // console.log(asset, file._id.toString())

                let privateKey = await new MutableData().deCipher(fields.privateKey, fields.passcode, fields.password);

                let transaction = bigchainDb.Transaction.makeCreateTransaction(
                    {
                        ...asset

                    }, null ,
                    [bigchainDb.Transaction.makeOutput(bigchainDb.Transaction.makeEd25519Condition(author.publicKey))],
                    author.publicKey
                )

                let signedTransaction = bigchainDb.Transaction.signTransaction(transaction, privateKey)

                // BDB = new bigchainDb.Connection(peka.getNodeEndpoint());
                BDB.postTransactionCommit(signedTransaction).then((result)=>{
                    result.mediaBuffer = buffer
                    console.log(result, file)
                    res.json({status:true, data: result.asset.data})
                });
            });

        });

    });
}


// start express server
server.listen(5000, async (error)=>{
    if (!error){
        
        console.log('\r\nServer started at port: \033[4;32m' + server.address().port + '\033[0m',
            '\r\n\033[1;30mGood to go!\033[0m');
    }
    else {
        console.log('\r\n\033[31mError: \033[37m', error);
    }
})
