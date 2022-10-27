const fetch = require("node-fetch");
var host = "https://server.pekaboom.com";
// host = "http://localhost:4000";


const { default: Pekachain } = require('../Pekachain/modules/Pekachain');
const peka = new Pekachain();
const bigchainDb = require("bigchaindb-driver");
var BDB = new bigchainDb.Connection(peka.getNodeEndpoint());
const mongoose = require('mongoose');

mongoose.connect('mongodb://server.pekaboom.com:27017/bigchain', (err)=>{
    if (!err){
        console.log('Connected to MongoDB')
    }
    else {
        console.log(err)
    }
});
const dbconn = mongoose.connection;

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
        avatar: {
            type: GraphQLString,
            async resolve(parent, args){
                
                let media = _scanner.orderBy(await dbconn.db.collection('assets').find({$and:[{'data.assetType': 'profile_picture'}, {'data.authorId': parent.id}]}).toArray(),  ['data.dateCreated'], ['desc']);

                if (media.length > 0){
                    return host+'/avatar/'+parent.id;
                }
                else {
                    return null;
                }
            }
        },
        userEncryptedData: { type: GraphQLString }
    })
});

const Avatar = new GraphQLObjectType({
    name: "UserAvatar",
    fields: ()=>({
        id: { type: GraphQLID },
        data: {
            type: new GraphQLObjectType({
                name: 'AvatarData',
                fields: ()=>({
                    authorId: { type: GraphQLString },
                    hasMedia: { type: GraphQLBoolean },
                    media: { type: GraphQLString },
                    mediaType: { type: GraphQLString },
                    originalMediaName: { type: GraphQLString },
                    mediaExtension: { type: GraphQLString },
                    dateCreated: { type: GraphQLFloat }
                })
            })
        }
    })
});

const BoomData = new GraphQLObjectType({
    name: "BoomData",
    fields: ()=>({
        assetType: {type: GraphQLString},
        content: { type: GraphQLString},
        media: {type: GraphQLString},
        mediaType: {type: GraphQLString},
        originalMediaName: {type: GraphQLString},
        mediaExtention: {type: GraphQLString},
        mediaUUID: {type: GraphQLString},
        dateCreated: {type: GraphQLFloat},
        authorId: { type: GraphQLString },
        hasMedia: {type: GraphQLBoolean},
        reward: {type: GraphQLFloat},
        isShared: {type: GraphQLBoolean},
        sharedBy: {type: GraphQLID},
        sharedBoomId: {type: GraphQLID},
        sharerData: {
            type: User,
            async resolve(parent, args){

                let userdata = await BDB.searchAssets(parent.authorId, null);

                userdata = userdata.filter((a, b)=>{
                    return (a.data.assetType == 'user_account');
                });
                if (userdata.length > 0){
                    return {id: userdata[0].id, username: userdata[0].data.username};
                }
                else {
                    return null
                }
            }
        }
    })
})

const BoomComments = new GraphQLObjectType({
    name: "BoomComments",
    fields: ()=>({
        boomId: { type: GraphQLID },
        assetType: {type: GraphQLString},
        content: { type: GraphQLString},
        media: {type: GraphQLString},
        mediaType: {type: GraphQLString},
        originalMediaName: {type: GraphQLString},
        mediaExtention: {type: GraphQLString},
        dateCreated: {type: GraphQLFloat},
        authorId: { type: GraphQLString },
        author: {
            type: User,
            async resolve(parent, args){

                let userdata = await BDB.searchAssets(parent.authorId, null);

                userdata = userdata.filter((a, b)=>{
                    return (a.data.assetType == 'user_account');
                });

                return {id: userdata[0].id, username: userdata[0].data.username};
            }
        },
        hasMedia: {type: GraphQLBoolean},
        reward: {type: GraphQLFloat}
    })
})

const Post = new GraphQLObjectType({
    name: 'Post',
    fields: ()=>({
        id: { type: GraphQLID },
        data: { type: BoomData },
        isHidden: {
            type: GraphQLBoolean,
            // async resolve(parent, args){
            //     let metadata = _scanner.orderBy((await BDB.searchMetadata(parent.id, null)).filter((a,b)=>a.metadata), ['metadata.lastUpdated'], ['desc']);

            //     if (metadata.length > 0 && 'metadata' in metadata[0] && metadata[0].metadata){
            //         return metadata[0].metadata.isHidden;
            //     }
            //     else {
            //         return false;
            //     }
            // }
        },
        author: { type: User,
            async resolve(parent, args){

                let userdata = await BDB.searchAssets(parent.data.authorId, null);

                userdata = userdata.filter((a, b)=>{
                    return (a.data.assetType == 'user_account');
                });

                if (userdata.length > 0){
                    return {id: userdata[0].id, username: userdata[0].data.username};
                }
                else {
                    return null;
                }
            }
        },
        comments: {
            type: new GraphQLList(BoomComments),

            async resolve(parent, args){
                
                let boomComments = await BDB.searchAssets(parent.id, null);
                let boomCommentsList = [];

                boomComments.forEach((comment)=>{
                    if (comment.data.assetType == 'boom_comment'){
                        comment.data.id = comment.id;
                        boomCommentsList.push(comment.data);
                    }
                });

                return boomCommentsList;
            }

        },
        media: {
            type:GraphQLString,
            resolve(parent, args){
                return host+'/boom_media/'+parent.data.mediaUUID;
            }
        }
    })
});

async function isBoomHidden(boomId, sharedBoomId = null){
    let metadata = (sharedBoomId !== null ?
        _scanner.orderBy(await dbconn.db.collection('metadata').find({$or: [{'id': boomId}, {'metadata.boomId': boomId}, {'metadata.boomId': sharedBoomId}]}).toArray(), ['metadata.lastUpdated'], ['desc'])
        :
        _scanner.orderBy(await dbconn.db.collection('metadata').find({$or: [{'metadata.boomId': boomId}]}).toArray(), ['metadata.lastUpdated'], ['desc'])
    )
    
    if (metadata.length > 0 && 'metadata' in metadata[0] && metadata[0].metadata){
        return metadata[0].metadata.isHidden;
    }
    else {
        return false;
    }
}

const query = new GraphQLObjectType({
    name: 'RootQuery',
    fields: {
        posts: {
            type: new GraphQLList(Post),
            args: {
                limit: { type: GraphQLInt }
            },
            async resolve(parent, args){

                // Fetch all boom posts
                let booms = await dbconn.db.collection('assets').find({'data.assetType':'boom_post'}).sort({'data.dateCreated': -1}).toArray();
                
                if (booms.length > 0){

                    // remove hidden boom posts
                    let boomList = ()=>{
                        return (
                            new Promise((res, rej)=>{
                                var boom_list = [];
                                let i = 0;

                                booms.forEach(async (boom)=>{
                                    boom.isHidden = (boom.data.isShared ? await isBoomHidden(boom.id, boom.data.sharedBoomId) : await isBoomHidden(boom.id));
                                    boom_list = boom_list.concat([boom]);

                                    i++;

                                    if (i == booms.length){
                                        res(boom_list);
                                        return boom_list;
                                    }
                                });
                                
                            })
                        )
                    }

                    return _scanner.orderBy((await boomList()).filter((boom, i)=>{
                        return boom.isHidden !== true
                    }), ['data.dateCreated'], ['desc']).slice(0, args.limit);
                }
                else {
                    return booms;
                }
            }
        },
        account: {
            type: User,
            args: {
                id: { type: GraphQLID }
            },
            async resolve(parent, args){

                let userdata = await BDB.searchAssets('user_account', null);

                userdata = userdata.filter((a, b)=>{
                    return (a.id == args.id);
                });
                
                if (userdata.length > 0){
                    return {id: userdata[0].id, username: userdata[0].data.username};
                }
                else {
                    return null;
                }
            }
        }

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