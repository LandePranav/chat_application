const express = require('express') ;
const mongoose = require('mongoose') ;
const jwt = require('jsonwebtoken') ;
const User = require('./models/user') ;
const cookieParser = require('cookie-parser') ;
require('dotenv').config() ;
const cors = require('cors') ;
const bcrypt = require('bcryptjs') ;
const app = express() ;
const jwtSecret = process.env.JWTSECRET ;
const ws = require('ws') ;
const Message = require('./models/message') ;
const fs = require('fs') ;
const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3') ;
const multer = require('multer') ;
const multerS3 = require('multer-s3') ;
const path = require('path') ;

const bSalt = bcrypt.genSaltSync(10) ;

mongoose.connect(process.env.MONGO_URI).then(
    console.log('DB Connectd Succesfully!') 
) ;

app.use(cors({
    credentials:true,
    origin:process.env.CLIENT_URL 
}));

app.use(express.json()) ;
app.use(cookieParser()) ;

app.use('/api/uploads', express.static(__dirname + '/uploads')) ;

async function getUserDataFromRequest(req){
    return new Promise((resolve,reject) => {
        const token = req.cookies?.token ;
        if(token){
            jwt.verify(token,jwtSecret,{},(err,userData) => {
                if(err) throw err ;
                resolve(userData) ;
            }) ;
        }else {
            reject('no token') ;
        }  
    }) ;
}

const port = process.env.PORT ;

app.get('/api/test', (req,res) => {
    mongoose.connect(process.env.MONGO_URI) ;
    res.json('Backend Server Is Running OK') ;
}) ;

app.get('/api/messages/:userId', async (req,res) => {
    mongoose.connect(process.env.MONGO_URI) ;
    const {userId} = req.params ;
    const userData = await getUserDataFromRequest(req) ;
    const ourUserId = userData.userId ;

    const messages = await Message.find({
        sender: {$in:[userId, ourUserId]},
        recipient: {$in:[userId, ourUserId]},
    }).sort({createdAt:1}) ;
    res.json(messages) ;
}) ;

app.get('/api/people', async (req,res) => {
    mongoose.connect(process.env.MONGO_URI) ;
    const users = await User.find({}, {'_id':1, username:1}) ;
    res.json(users) ;
}) ;

app.get('/api/profile', (req,res) => {
    mongoose.connect(process.env.MONGO_URI) ;
    const token = req.cookies?.token ;
        if(token){
            jwt.verify(token,jwtSecret,{},(err,userData) => {
                if(err) throw err ;
                if(userData){
                    const {userId,username} = userData ;
                    //console.log(userData) ;
                    res.json({userId,username}) ;
                }else {console.log("NO data send")}
            }) ;
        }else {     
            res.json('no token') ;
        }   
}) ;

app.post('/api/register', async (req,res) => {
    mongoose.connect(process.env.MONGO_URI) ;
    const {username,password} = req.body ;
    try {
        const hashedPassword = bcrypt.hashSync(password,bSalt) ;
        const createdUser = await User.create({
            username:username,
            password:hashedPassword
        }) ;
        
        jwt.sign({userId:createdUser._id, username}, jwtSecret, {}, (err,token) => {
            if(err) return err ;
            res.cookie('token',token, {sameSite:'none',secure:true}).status(201).json({
                id : createdUser._id ,
                username
            }) ;
        });

    } catch (error) {
        if(error) console.log(error) ;
    }
}) ;

app.post('/api/login', async (req,res) => {
    mongoose.connect(process.env.MONGO_URI) ;
    const {username,password} = req.body ;
    try {
        const foundUser = await User.findOne({username}) ;
        if(foundUser){
            const pass = bcrypt.compareSync(password,foundUser.password) ;
            if(pass){
                jwt.sign({userId:foundUser._id, username}, jwtSecret, {}, (err,token) => {
                    if(err) return err ;
                    res.cookie('token',token, {sameSite:'none',secure:true}).status(201).json({
                        id : foundUser._id ,
                    }) ;
                });
            }else {
                res.json("Invalid-Cred") ;
            }
        }  
    } catch (error) {
        if(error) console.log(error) ;
    }
}) ;

app.post('/api/logout', (req,res) => {
    mongoose.connect(process.env.MONGO_URI) ;
    res.cookie('token', '', {sameSite:'none', secure:true}).status(201).json('logged out succesfullt') ;
}) ;


//s3 client ,,,out of func so obj created only once ,,not everytime
const client = new S3Client({
    region : process.env.REGION,
    credentials : {
        accessKeyId : process.env.S3_ACCESS_KEY,
        secretAccessKey : process.env.S3_SECRET_ACCESS_KEY,
    }
}) ;

async function uploadToS3(bufferData, filename, mimetype) {

    await client.send(new PutObjectCommand({
        Bucket : process.env.BUCKET,
        Body : bufferData,
        Key : filename,
        ContentType : mimetype,
        ACL : 'public-read'
    })) ;

    //console.log({data}) ;
    return `https://${process.env.BUCKET}.s3.${process.env.REGION}.amazonaws.com/${filename}`
} 

const server = app.listen(port) ;

const wss = new ws.WebSocketServer({server}) ;

wss.on('connection', (connection, req) => {
    function notifyAboutOnlinePeople() {
        [...wss.clients].forEach(client => {
            client.send(JSON.stringify({
                online : [...wss.clients].map(c => 
                    ({userId:c.userId,username:c.username})
                ) }
            ));
        }) ;
    }

    connection.isAlive = true ;

    connection.timer = setInterval(()=> {
        connection.ping() ;
        connection.deathTimer = setTimeout(() => {
            connection.isAlive = false ;
            clearInterval(connection.timer) ;
            connection.terminate() ;
            notifyAboutOnlinePeople() ;
            console.log('dead') ;
        }, 1000) ;
    }, 10000) ;

    connection.on('pong', () => {
        // console.log(pong) ;
        clearTimeout(connection.deathTimer) ;
    }) ;

    //console.log('ws cli connected') ;
    //connection.send("Hello socket") ;
    //console.log(req.headers) ;
    const cookies = req.headers.cookie ;
    if(cookies) {
        const tokenCookieString = cookies.split(';')
                                        .find(str => str.startsWith('token=')) ;
        if(tokenCookieString){
            const token = tokenCookieString.split('=')[1] ;
            if(token){
                jwt.verify(token,jwtSecret,{},(err,userData) => {
                    if(err) throw err ;
                    const {userId,username} = userData ;
                    connection.userId = userId ;
                    connection.username = username ;
                })
            }
        }
    }

    connection.on('message', async (message) => {
        message = JSON.parse(message.toString()) ;
        //console.log(message) ;
        const {recipient, text, file} = message ;
        let filename = null ;
        let url = null ;

        if(file){
            //console.log(file) ;
            const parts = file.name.split('.') ;
            const ext = parts[parts.length - 1] ;
            filename = Date.now() + '.'+ext ;
            //const path = __dirname + '/uploads/' + filename ;
            //const filePath = path.join(__dirname, 'uploads', filename) ;
            const bufferData = await new Buffer.from(file.data.split(',')[1], 'base64') ; 

            // fs.writeFile(filePath, bufferData, (err) => {
            //     if(err){
            //         console.log(err) ;
            //     }else {
            //         console.log('File saved : '+ filePath) ;
            //     }
            // } ) ;

            ///s3 utility from here
            url = await uploadToS3(bufferData, filename, file.mimetype) ;
            console.log(url) ;
        }

        if(recipient && (text || file)) {

            const messageDoc = await Message.create({
                sender : connection.userId,
                recipient,
                text,
                file:file ? url : null,
            });

            [...wss.clients].filter( c=> recipient === c.userId)
                            .forEach(c => c.send(
                                JSON.stringify({
                                    text, 
                                    sender:connection.userId,
                                    recipient, 
                                    file: file? url : null ,
                                    _id:messageDoc._id
                                })
                            )) ;
        }
    }) ;

    // const users = [...wss.clients];
    // console.log(users) ;

    //send list of online users
    notifyAboutOnlinePeople() ;


}) ;

