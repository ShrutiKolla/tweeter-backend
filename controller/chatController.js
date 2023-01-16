const Chat = require("../models/Chat");
const { Op } = require('sequelize');
const Chatrel = require("../models/Chatrel");
const User = require("../models/userModel");
const Message = require("../models/Message");

const userchat = async (req,res) => {
    try {
        const user = req.user;
        const {userId} = req.params;
        if(!userId)
            return res.status(400).json({success:false,msg:'User Id required'});
        if(userId == user._id)
            return res.status(400).json({success:false,msg:'Cannot create chat with yourself'});
        const findUser = await User.findByPk(userId);
        if(!findUser)
            return res.status(404).json({success:false,msg:'User not found'});
        const mychat = await Chat.findOne({
            where:{
                [Op.or] : [
                    {[Op.and] : [{second:user._id},{first:userId}]},
                    {[Op.and] : [{first:user._id},{second:userId}]}
                ]
            },
            include:{
                model: User,
                attributes:['_id','name','user_name','displaypic']
            }
        });
        if(mychat)
            return res.status(200).json({success:true,newchat:false,chat:mychat});
        const newchat = await Chat.create({
            first:user._id,
            second:userId
        });
        await newchat.addUser(user);
        await newchat.addUser(findUser);
        const getchat = await Chat.findByPk(newchat._id,{
            include:{
                model:User,
                attributes:['_id','name','user_name','displaypic']
            }
        });
        return res.status(200).json({success:true,newchat:true,chat:getchat});
    } catch (err) {
        console.log(err);
        return res.status(500).json({success:false,msg:`${err}`});
    }
}

const mychat = async (req,res) => {
    try {
        const user = req.user;
        const mychats = await Chat.findAll({
            where:{
                [Op.or]:[{first:user._id},{second:user._id}]
            },
            order:[['updatedAt','DESC']],
            include:{
                model:User,
                attributes:['_id','name','user_name','displaypic']
            }
        });
        return res.status(200).json({success:true,mychats});
    } catch (err) {
        console.log(err);
        return res.status(500).json({success:false,msg:`${err}`});
    }
}

const newmsg = async (req,res) => {
    try {
        const {text,chatId} = req.body;
        const user = req.user;
        let filepath = null,image=null,video=null;
        if(req.file !== undefined){
            filepath = 'uploads/' + req.file.filename;
        }
        if(req.file!==undefined && req.file.mimetype === 'video/mp4'){
            video = filepath
        }else{
            image = filepath
        }
        if(!chatId)
            return res.status(400).json({success:false,msg:'chat Id required'});

        const chat = await Chat.findByPk(chatId);
        if(!chat)
            return res.status(404).json({success:false,msg:'Chat not found'});
        if(chat.first!=user._id&&chat.second!=user._id)
            return res.status(400).json({success:false,msg:'Access Denied'});
        let msg = await chat.createMessage({
            text,
            image,
            video,
            userId:user._id
        });
        let lmsg;
        if(image)
            lmsg = user.user_name + ': sent a photo';
        if(video)
            lmsg = user.user_name + ': sent a video';
        if(text)
            lmsg = user.user_name + ': ' + text;
        
        await Chat.update({
            latestmsg:lmsg
        },{
            where:{
                _id:chatId
            }
        });
        msg = await Message.findByPk(msg._id,{
            include:[{
                model:User,
                attributes:['_id','name','user_name','displaypic']
            },{
                model:Chat,
                include:{
                    model:User,
                    attributes:['_id','name','user_name','displaypic']
                }
            }]
        });
        return res.status(200).json({success:true,msg});
    } catch (err) {
        console.log(err);
        return res.status(500).json({success:false,msg:`${err}`});
    }
}

const allmsg = async (req,res) => {
    try {
        const user = req.user;
        const {chatId} = req.params;
        if(!chatId)
            return res.status(400).json({success:false,msg:'chat Id required'});
        const chat = await Chat.findByPk(chatId);
        if(!chat)
            return res.status(404).json({success:false,msg:'Chat not found'});
        if(chat.first!=user._id&&chat.second!=user._id)
            return res.status(400).json({success:false,msg:'Access Denied'});
        const msgs = await Message.findAll({
            where:{
                chatId
            },
            order:[['createdAt','ASC']],
            attributes:['text','image','video','chatId'],
            include:{
                model:User,
                attributes:['_id','name','user_name','displaypic']
            }
        });
        return res.status(200).json({success:true,messages:msgs});
    } catch (err) {
        console.log(err);
        return res.status(500).json({success:false,msg:`${err}`});
    }
}

module.exports = {
    userchat,
    mychat,
    newmsg,
    allmsg
}