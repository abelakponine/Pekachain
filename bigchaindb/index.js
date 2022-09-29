const bigchainDb = require('bigchaindb-driver');
var endpoint = 'https://bigchaindb.pekaboom.com/api/v1/'; // 'https://test.ipdb.io/api/v1/';
    // endpoint = 'http://34.142.39.129:9984/api/v1/';

const conn = new bigchainDb.Connection(endpoint);
const user = new bigchainDb.Ed25519Keypair();

const txn = bigchainDb.Transaction.makeCreateTransaction(
    {
        firstname: 'Abel',
        lastname: 'Akponine'
    },
    {
        dateCreated: new Date().getTime()
    },
    [
        bigchainDb.Transaction.makeOutput(bigchainDb.Transaction.makeEd25519Condition(user.publicKey))
    ],
    
    user.publicKey
);

const signedTxn = bigchainDb.Transaction.signTransaction(txn, user.privateKey);

// conn.postTransactionCommit(signedTxn).then(res=>{
//     console.log(res);
// });

 conn.searchAssets("fc7b9f64d773d2a201a5ed49173ea163d31e9990b388269457cbd99ad0d4b4e5").then(res=>{
    console.log(res);
 })
//  ("30f9295a3e5d136cb5de2215491c2e5a365900b31e241622fe83b5e5ddb813d9").then(res=>{
//     console.log(res);
//  })

// conn.listTransactions('632db4c1300fb0682166b97b').then(res=>{
//     console.log(res.asset.data, res.outputs);
// });
