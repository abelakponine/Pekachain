// import { create, urlSource } from 'ipfs';
// const fs = require('fs');
// const User = require('../Pekachain/modules/User');



(async ()=>{
//     let ipfs = await import('ipfs').then(data=>{
//         return data;
//     })
//     let IPFS = await ipfs.create();

//     let file = (fs.readFileSync('../../../public/icon.png'));
    
//     console.log(await getIPFSFile('QmW6TYrLGZAXq1ja7nptuFvD8n1TmeSh5vvTi9DwDvYzPu'));


// })();

let user = new User({
    passcode: await User.createHash('1233'),
    password: '123'
});


const { spawn } = require('node:child_process');
const bat = spawn('cmd.exe', ['/c', 'my.bat']);

bat.stdout.on('data', (data) => {
  console.log(data.toString());
});

bat.stderr.on('data', (data) => {
  console.error(data.toString());
});

bat.on('exit', (code) => {
  console.log(`Child exited with code ${code}`);
});

// async function getIPFSFile(fileCID){

//     const {Blob} = require('buffer');

//     const content = [];

//     for await (const file of IPFS.get(fileCID)) {
//         content.push(new Blob(new Uint8Array(file)));
//     }
    
//     return new Blob(content);
// }
// const ipfs = await create()

// let file = Buffer.from(fs.readFileSync('../../../public/icon.png'));

// const data = await ipfs.add(file)
// console.log(data)

// const IPFS = create('https://ipfs.infura.io:5001/api/v0');

//     IPFS.add("Smile Pekaboom! :)").then((err, file)=>{
//         console.log(err, file);
//     });


    // console.log(data);

// conn.on("open", async ()=>{
//     let attachment = createModel({
//         modelName: 'Files',
//         connection: conn
//     });

//     let readStream = fs.createReadStream('../../../public/icon.png')
//     let options = {filename: 'pk_icon.png'}
//     attachment.write(options, readStream, (err, file)=>{
//         // console.log(file._id)
//         attachment.read({_id: "632ed8a39f5e1b9a3a692a2e"}, (err, buffer)=>{
//             console.log(buffer)
//         })
//     })
})();
