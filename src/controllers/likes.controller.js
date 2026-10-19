import { Video } from "../models/video.model.js";
import { User} from "../models/user.model.js"
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { Like } from "../models/likes.model.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import { Tweet } from "../models/tweets.model.js";
import mongoose from "mongoose";
/*
To like a video,comment or tweet

for video
1. we have to get video id
2. findOne userid and video id  -> id match video is Liked else not
2. like field as true
*/

const toggleVideoLike = asyncHandler(async(req,res) => {
    try {
        const {videoId}=req.params
        const video = await Video.findById(videoId)
        if(!video){
            throw new ApiError(400,"Video not found")
        }

        const user = await User.findById(req.user?._id)
        if(!user){
            throw new ApiError(401,"Unauthorized request")
        }
         
        //check if there's such any document
        const isLiked = await Like.findOne({
            likedBy:user._id,
            video:videoId
        })

        if(isLiked){
            await Like.findByIdAndDelete(isLiked._id)
            return res
            .status(200)
            .json(new ApiResponse
                (200,
                    {
                        liked:false
                    },
                    "Video disliked successfully"
                )
            )
        }
        else{
            const newLike = await Like.create({
                likedBy:user._id,
                video:videoId
            })

            if(!newLike){
                throw new ApiError(500,"Something went wrong while liking the video")
            }

            return res
            .status(200)
            .json(new ApiResponse(200,{liked:true},"Video liked successfully"))
        }

    } catch (error) {
        throw new ApiError(400,error.message || "Something went wrong")
    }
})

const togglecommentLike = asyncHandler(async(req,res) =>{
    const {videoId,commentId} = req.params;
    const video = await Video.findById(videoId)
    const comment = await Comment.findById(commentId)
    const user = await User.findById(req.user?._id)

    if(!video){
        throw new ApiError(400,"Video doesn't exist")
    }
    if(!comment){
        throw new ApiError(400,"Comment not found")
    }
    if(!user){
        throw new ApiError(400,"Comment not found")
    }

    const isLiked = await Like.findOne({
        likedBy:user._id,
        video:videoId,
        comment:commentId
    })

    if(isLiked){
        await Like.findByIdAndDelete(isLiked._id)
        return res
        .status(200)
        .json(new ApiResponse(200,{liked:false},"Like removed successfully"))
    }

    else{
        const newLike = await Like.create({
            likedBy:user._id,
            video:videoId,
            comment:commentId
        })

        if(!newLike){
            throw new ApiError(500,"Something went wrong while liking the comment")
        }
        
        return res
        .status(200)
        .json(new ApiResponse(200,{liked:true},"Liked successfully"))
    }

})

const toggletweetLike = asyncHandler(async(req,res) =>{
    const {tweetId} = req.params;
    const tweet = await Tweet.findById(tweetId)
    const user = await User.findById(req.user?._id)

    if(!tweet){
        throw new ApiError(400,"tweet not found")
    }
    if(!user){
        throw new ApiError(400,"Comment not found")
    }

    const isLiked = await Like.findOne({
        likedBy:user._id,
        tweet:tweetId
    })

    if(isLiked){
        await Like.findByIdAndDelete(isLiked._id)
        return res
        .status(200)
        .json(new ApiResponse(200,{liked:false},"Like removed successfully"))
    }

    else{
        const newLike = await Like.create({
            likedBy:user._id,
            tweet:tweetId
        })

        if(!newLike){
            throw new ApiError(500,"Something went wrong while liking the tweet")
        }
        
        return res
        .status(200)
        .json(new ApiResponse(200,{liked:true},"Liked successfully"))
    }

})

const getLikedVideos = asyncHandler(async(req,res) => {
    /* 1.get the user
       2.count the Like documents where likedBy matches the user id
       3. return count
    */
    const likedVideos = await Like.aggregate(
        [
            {   //find only the liked documents by the loggedin user
                $match:{
                    likedBy:mongoose.Types.ObjectId(req.user?._id)
                }
            },{
                
                $lookup:{
                    //Which collection do you want to grab data from?
                    from:"videos",
                    //What field in the current (Like) collection holds the ID
                    localField:"video",
                    //What field in the target (videos) collection matches that ID
                    foreignField:"_id",
                    as:"likedVideo",
                }
            },{
                //only get the first element of the array of likedVideo, since lookup returns an array
                $addFields:{
                    likedVideo:{
                        $first:"$likedVideo"
                    }
                }
            },{
                $project:{
                    _id:0,
                    likedVideo:1
                }
            }]
    )

    if(!likedVideos){
        throw new ApiError(401,"Something went wrong while getting liked videos")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,{likedVideos},"LikedVideo returned successfully"))
})
export {toggleVideoLike,togglecommentLike,toggletweetLike,getLikedVideos}