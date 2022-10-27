const bigchainDb = require('bigchaindb-driver');
var endpoint = 'https://bigchaindb.pekaboom.com/api/v1/'; // 'https://test.ipdb.io/api/v1/';
    // endpoint = 'http://34.142.39.129:9984/api/v1/';

const conn = new bigchainDb.Connection(endpoint);
const user = new bigchainDb.Ed25519Keypair();
const crypto = require('crypto');

const mongoose = require('mongoose');

mongoose.connect('mongodb://35.246.51.222:27017/bigchain', (err)=>{
    if (!err){
        console.log('Connected to MongoDB')
    }
    else {
        console.log(err)
    }
});
const dbconn = mongoose.connection;

const _scanner = require('lodash');

// const txn = bigchainDb.Transaction.makeCreateTransaction(
//     {
//         firstname: 'Abel',
//         lastname: 'Akponine'
//     },
//     {
//         dateCreated: new Date().getTime()
//     },
//     [
//         bigchainDb.Transaction.makeOutput(bigchainDb.Transaction.makeEd25519Condition(user.publicKey))
//     ],
    
//     user.publicKey
// );

// const signedTxn = bigchainDb.Transaction.signTransaction(txn, user.privateKey);

// conn.postTransactionCommit(signedTxn).then(res=>{
//     console.log(res);
// });

//  conn.searchAssets("fc7b9f64d773d2a201a5ed49173ea163d31e9990b388269457cbd99ad0d4b4e5").then(res=>{
//     console.log(res);
//  })
//  ("30f9295a3e5d136cb5de2215491c2e5a365900b31e241622fe83b5e5ddb813d9").then(res=>{
//     console.log(res);
//  })

// conn.listTransactions('632db4c1300fb0682166b97b').then(res=>{
//     console.log(res.asset.data, res.outputs);
// });

(async ()=>{
    
    let sign = crypto.createSign('SHA256');
    let verify = crypto.createVerify('SHA256');

    let keyPair = crypto.generateKeyPairSync('rsa', {
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

    // console.log(keyPair)

    // sign.update('Pekaboom');
    // let signed = sign.sign(keyPair.privateKey, 'hex')

    // verify.update('Pekaboom');
    // console.log(verify.verify(keyPair.publicKey, signed, 'hex'), signed)

    dbconn.on('open', async ()=>{
      // console.log(await dbconn.db.collection('assets').find({'id':'aaccdd7170ae5ada24632b9afb2bbf9807196b0adb102c04684f2c043368bb04'}).toArray())
        
        let metadata = _scanner.orderBy(await dbconn.db.collection('assets').find({'data.assetType':'boom_post'}).sort({'data.dateCreated': -1}).toArray(), ['metadata.lastUpdated'], ['desc']);

        // let metadata = _scanner.orderBy((await conn.searchAssets("4153b55edc294d276deffb3122d5bebd151bd472e98f5721ecabb24d3fbf8eb7", null)).filter((a,b)=>a.data.assetType == "boom_post"), ['metadata.lastUpdated'], ['desc']);

        console.log(metadata.length)

        if (metadata.length > 0 && 'metadata' in metadata[0] && metadata[0].metadata){
            return metadata[0].metadata.isHidden;
        }
        else {
            return false;
        }
    });
})()
