/*
-Thought by myself
publish video - TODO: get video, upload to cloudinary, create video
get video by id
update video details
delete video


-Couldn't think by myself
toggle publish status
getAllvideos- basically home feed/channel's videos
 */

import mongoose from "mongoose";
import { Video } from "../models/video.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/Apiresponse";
import { asyncHandler } from "../utils/asyncHandler";
import { uploadOnCloudinary } from "../utils/cloudinary";

const publishVideo = asyncHandler(async(req,res) =>{
    const {title,description} = req.body;
    if([title,description].some((field )=> !field || field?.trim() === "")){
        throw new ApiError(401,"Title and Description can't be empty")
    }

    const videofilelocalpath= req.files?.videoFile?.[0]?.path;
    const thumbnailfilelocalpath = req.files?.thumbnail?.[0]?.path;

    if(!videofilelocalpath){
        throw new ApiError(401,"Videofile path not found")
    }
    if(!thumbnailfilelocalpath){
        throw new ApiError(401,"Thumbnail path file not found")
    }

    const videoFile=await uploadOnCloudinary(videofilelocalpath);
    const thumbnailFile=await uploadOnCloudinary(thumbnailfilelocalpath);
    if(!videoFile){
        throw new ApiError(401,"Videofile not found")
    }
    if(!thumbnailFile){
        throw new ApiError(401,"Thumbnail file not found")
    }

    const video =await Video.create({
        videoFile:videoFile.url,
        thumbnail:thumbnailFile.url,
        title,
        description,
        duration:videoFile.duration,
        owner:req.user?._id,
        isPublished:isPublished !== undefined ? isPublished : true
    })

    if(!video){
        throw new ApiError(401,"Something went wrong while uploading video")
    }
    return res.status(201).json(
        new ApiResponse(201, video, "Video published successfully")
    );

})

const getVideobyId = asyncHandler(async(req,res) =>{
    const {videoId} = req.params
    await Video.findByIdAndUpdate(videoId,{
        $inc:{
            views:1
        }
    }).exec();
    

    //If video is found display, avatar, subs, isSubscribed or not, likes
    const video =await Video.aggregate([{
        $match:{_id: new mongoose.Types.ObjectId(videoId)}
    },{
        $lookup:{
            //Display channel name
            from:"users",
            localField:"owner",
            foreignField:"_id",
            as:"owner",
            //pipeline is used to show what fields would be visible for owner's (which is the user/channel) details
            pipeline:[{
                $lookup:{
                    from:"subscriptions",
                    localField:"_id",
                    foreignField:"channel",
                    as:"subscribers"

                }
            },{
                $addFields:{
                    subscriberCount:{$size:"$subscribers"},
                    isSubscribed:{
                        $cond:{
                            if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                            then:true,
                            else:false
                        }
                    }
                }
            },{
                $project:{
                    fullName:1,
                    username:1,
                    avatar:1,
                    subscriberCount:1,
                    isSubscribed:1
                }
            }]
        }
    },{
        $unwind:"$owner"
    }])

    if(!video || video.length === 0){
        throw new ApiError(401,"Video not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,video[0],"Video fetched successfully"))
})

const updateVideodetails = asyncHandler(async(req,res) => {
    const {videoId} = req.params
    const {title,description} = req.body
    const thumbnailfilelocalpath = req.files?.thumbnail?.[0]?.path;

    if([title,description].some((field) => !(field) || field?.trim() === "")){
        throw new ApiError(401,"Field can't be empty")
    }

    
    const updateData = {
        title,
        description
    };
    if(thumbnailfilelocalpath){
        const thumbnail = await uploadOnCloudinary(thumbnailfilelocalpath)
        if(!thumbnail?.url){
            throw new ApiError(401,"Thumbnail not found")
        }
        updateData.thumbnail = thumbnail.url
    }
    

    const updatedVideo = await Video.findByIdAndUpdate(videoId,{
        $set:updateData},
        { new:true} )       //returns the updated document

    if(!updatedVideo){
        throw new ApiError(401,"Not authorized to update it")
    }
    return res
    .status(200)
    .json(new ApiResponse(200,updatedVideo,"Video updated Successfully"))
})

const deleteVideo = asyncHandler(async(req,res) => {
    const {videoId} = req.params;
    if(!videoId){
        throw new ApiError(401,"Video not found")
    }
    const result = await Video.deleteOne({
        _id:videoId,
        owner:req.user?._id
    })

    // deleteOne returns { acknowledged: true, deletedCount: 0 or 1 }
    if(result.deletedCount === 0){
        throw new ApiError(401,"You are not authorized to delete it")
    }
    return res
    .status(200)
    .json(200, new ApiResponse(200,{},"Video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async(req,res) => {
    const {videoId} = req.params
    if(!videoId){
        throw new ApiError(401,"Video not found")
    }
    const video = await Video.findOne({
        _id:videoId,
        owner:req.user?._id
    })

    if(!video){
        throw new ApiError(401,"Video not found")
    }
    video.isPublished = ! video.isPublished
    await video.save();

    return res
    .status(200)
    .json(new ApiResponse({isPublished:video.isPublished},"Publish status toggled successfully"))

})

const getAllvideos = asyncHandler(async(req,res) =>{
    const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortType = "desc",
        query,               //represents search keyword that user typed
        userId               //userId, if it is a partcular channel
    } =req.query             //.query() is an object createdBy Express which contains all the paramters passed in the url after ?

    const pageNumber =Math.max(1,(parseInt(page,10)));
    const limitNumber=Math.max(1,(parseInt(limit,10)));
    const skip = (pageNumber-1)*limitNumber;
    
    const matchCondition = {};
    matchCondition.isPublished = true;

    if(userId){
        if(!mongoose.Types.ObjectId.isValid(userId)){ //Is it a valid Id format
            throw new ApiError(401,"Invalid Userid format")
        }  
        matchCondition.owner =new  mongoose.Types.ObjectId(userId)         
    }

    //query in search tab
    if(query?.trim()){
        matchCondition.$or = [
            {$title:{$regex:query.trim(),$options:"i"}}  ,     //$options:"i":means case insensitive
            //$regex: regular expression, Don't look for an exact match. Just check if this word appears anywhere inside the text.
            {$description:{$regex:query.trim(),$options:"i"}}
        ]
    }

    //sort
    const sortCriteria = {};
    sortCriteria[sortBy] = sortType === "asc"?1:-1

    const video = await Video.aggregate(
        [
            {
                $match:matchCondition
            },{
                $sort:sortCriteria
            },{
                $skip:skip
            },{
                $limit:limitNumber
            },{
                $lookup:{
                    $from:"users",
                    localField:"owner",
                    foreignField:"_id",
                    as:"Channel",
                    pipeline:[{
                        $project:{
                            fullName:1,
                            username:1,
                            avatar:1
                        }
                    }]
                }
            },{
                $unwind:"$Channel"
            }]
    )

    //Video.aggregate() always returns an array., so no check needed

    return res
    .status(200)
    .json(new ApiResponse({
        page:pageNumber,
        limit:limitNumber,
        count:video.length,
        video
    },"Videos fetched successfully"));



})
export {publishVideo,getVideobyId,updateVideodetails,deleteVideo,togglePublishStatus,getAllvideos}