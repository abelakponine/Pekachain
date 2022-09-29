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

const fetch = require('node-fetch');

var BDB = new bigchainDb.Connection(peka.getNodeEndpoint());

var host = 'https://server.pekaboom.com';

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

/** Use router */
app.post('/create_boom', cors(), (req, res)=>{
    
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

                            // Use cloudflare ipfs node
                            IPFS = await data.create({host:"https://cloudflare-ipfs.com/ipfs"});
                            
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
                                
                            IPFS.add(file).then( async (file)=>{
                                
                                asset.media = file.cid.toString(); // add file ID to blockchain post and commit
                                asset.mediaType =  files.data.mimetype; // set media type 
                                asset.originalMediaName = files.data.originalFilename
                                asset.mediaExtension = files.data.originalFilename.split('.')[files.data.originalFilename.split('.').length - 1];

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

server.listen(5000, async (error)=>{
    if (!error){
        
        console.log('\r\nServer started at port: \033[4;32m' + server.address().port + '\033[0m',
            '\r\n\033[1;30mGood to go!\033[0m');
    }
    else {
        console.log('\r\n\033[31mError: \033[37m', error);
    }
})
