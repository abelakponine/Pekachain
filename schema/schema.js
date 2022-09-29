const fetch = require("node-fetch");
var host = "https://server.pekaboom.com";
// host = "http://localhost:4000";


const { default: Pekachain } = require('../Pekachain/modules/Pekachain');
const peka = new Pekachain();
const bigchainDb = require("bigchaindb-driver");
var BDB = new bigchainDb.Connection(peka.getNodeEndpoint());


const {
    GraphQLSchema,
    GraphQLString,
    GraphQLObjectType,
    GraphQLID,
    GraphQLFloat,
    GraphQLInt,
    GraphQLList,
    GraphQLBoolean} = require('graphql');

const _scanner = require('lodash');



const MutableData = new GraphQLObjectType({
    name: 'MutableData',
    fields: ()=>({
        email: {type: GraphQLString},
        gender: {type: GraphQLString},
        telephone: {type: GraphQLString},
        country: {type: GraphQLString},
        password: {type: GraphQLString},
        highestDegree: {type: GraphQLString},
        school: {type: GraphQLString},
        job: {type: GraphQLString},
        company: {type: GraphQLString},
        publicKey: {type: GraphQLString},
        mutableData: {type: GraphQLString}
    })
});

const User = new GraphQLObjectType({
    name: 'User',
    fields: ()=>({
        id: {type: GraphQLID},
        username : {type: GraphQLString},
        userEncryptedData: { type: GraphQLString },
        // posts: {
        //     type: new GraphQLList(Post),
        //     resolve(parent, args){
        //         return _data.filter(posts, {authorId: parent.id});
        //     }
        // }
    })
});

const BoomData = new GraphQLObjectType({
    name: "BoomData",
    fields: ()=>({
        dataType: {type: GraphQLString},
        content: { type: GraphQLString},
        media: {type: GraphQLString},
        mediaType: {type: GraphQLString},
        originalMediaName: {type: GraphQLString},
        mediaExtention: {type: GraphQLString},
        dateCreated: {type: GraphQLFloat},
        authorId: { type: GraphQLString },
        hasMedia: {type: GraphQLBoolean},
        reward: {type: GraphQLFloat}
    })
})

const Post = new GraphQLObjectType({
    name: 'Post',
    fields: ()=>({
        id: { type: GraphQLID },
        data: { type: BoomData },
        author: {
            type: User,
            async resolve(parent, args){

                let userdata = await BDB.searchAssets(parent.data.authorId);

                userdata = userdata.filter((a, b)=>{
                    return (a.data.assetType == 'user_account');
                });

                return {id: userdata[0].id, username: userdata[0].data.username};
            }
        }
    })
});

const query = new GraphQLObjectType({
    name: 'RootQuery',
    fields: {
        posts: {
            type: new GraphQLList(Post),
            async resolve(parent, args){
                let booms = _scanner.orderBy(await BDB.searchAssets("boom_post").then(res=>res),
                    ['data.dateCreated'], ['desc']);
                return booms;
            }
        },
        accounts: {
            type: new GraphQLList(User),
            async resolve(parent, args){
                let accounts = await fetch(host+'/accounts').then(res=>{
                    return res.json();
                });
                
                return accounts;
            }
        },
        // post: {
        //     type: Post,

        // }

    }
});

const mutation = new GraphQLObjectType({
    name: "GQLMutations",
    fields: {
        refetchData: {
            type: GraphQLBoolean,
            args: {
                enableRefetch: { type: GraphQLBoolean }
            },
            resolve(parents, args){
                // console.log("Should Enable Refetch: ", args.enableRefetch);
                // console.log("\r\nRefetching...\r\n");
                return args.enableRefetch;
            }
        }
    }
})
module.exports = new GraphQLSchema({
    query,
    mutation
})