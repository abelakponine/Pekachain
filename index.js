const express = require('express');
const app = express();
const server = require('http').createServer(app);
const {graphqlHTTP} = require('express-graphql');
const schema = require('./schema/schema');
const cors = require('cors');
const router = require('./routers/router');
const {Server} = require('socket.io');

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

app.use('/gql', cors(), graphqlHTTP({
    schema,
    graphiql: true,
    catch: ((error)=>{
        console.log(error)
    })
}));


/** Use router */
app.use('/', router);

server.listen(4000, async (error)=>{
    if (!error){
        
        console.log('\r\nServer started at port: \033[4;32m' + server.address().port + '\033[0m',
            '\r\n\033[1;30mGood to go!\033[0m');
    }
    else {
        console.log('\r\n\033[31mError: \033[37m', error);
    }
})

/** Socket IO */
let io = new Server('8080', {
    cors: '*'
});

io.on('connection', (stream)=>{
    console.log('user connected successfully!');
})
io.on('messae', (msg)=>{
    console.log(msg)
})
io.on('error', (error)=>{
    console.log('Error: ', error)
})