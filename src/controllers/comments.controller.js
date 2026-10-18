import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import { Comment } from "../models/comments.model.js";
import { Video } from "../models/video.model.js";

/* In Comments, we can-
    0. getVideo comment
    1. Add comment
    2. Update comment
    3. Delete comment
    

*/

const getVideocomment = asyncHandler(async(req,res) =>{
    try {
        //To get comments in a video, we need to get the video first from url
        const {videoId}=req.params
        //console.log("videoId:",videoId)
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100,Math.max(1, parseInt(req.query.limit, 10) || 10))

        //check whether video exists
        const video =await Video.findById(videoId)
        if(!video){
            throw new ApiError(401,"Video not found")
        }
        
        //get the comments in the video
        //the video field in comment and  videoid in video should match
        const comments =await Comment.find({video:videoId})
        .limit(limit)
        .skip((page-1)*limit)
        .populate("owner","username fullName avatar")
        .sort({createdAt:-1})

        if(!comments){
            throw new ApiError(401,"Comment section not found")
        }

        //now also display comment count
        const totalComments = await Comment.countDocuments({video:videoId})

        if(!totalComments){
            throw new ApiError(401,"Comment count not found")
        }
        return res
        .status(200)
        .json(new ApiResponse(200,
            {
                comments,
                totalComments,
                currentPage:page,
                totalPages:Math.ceil(totalComments/limit)
            },
            "Video comments fetched successfully"
        )
        )

        
    } catch (error) {
        throw new ApiError(500,"Something went wrong" || error.message)
    }
})

const addComment = asyncHandler(async(req,res) =>{
    const {videoId}=req.params
    const video =await Video.findById(videoId)
    
    if(!video){
        throw new ApiError(404,"Video not found")
    }

    const content = req.body?.content
    if(typeof content !== "string" || !content.trim()){
        throw new ApiError(400,"Comment field cant be empty")
    }

    const comment = await Comment.create({
        content:content.trim(),
        commentedBy:req.user?._id,
        video:videoId
    })

    return res
    .status(201)
    .json(new ApiResponse(201,{
            comment
        },    
        "Comment added successfully"
    )
    )
})

const updateComment = asyncHandler(async(req,res) =>{
    try {
        //we need to get the video, the exact comment id and change the content

        const {content}=req.body
        const {videoId,commentId}=req.params
        if(!content){
            throw new ApiError(401,"Comment Field can't be empty")
        }
        

        const video =await Video.findById(videoId)
        if(!video){
            throw new ApiError(401,"Video not found")
        }

        const comment =await Comment.findById(commentId)
        if(!comment){
            throw new ApiError(401,"Video not found")
        }

        //we need to check if commentId matches


        const updatedComment = await Comment.findOneAndUpdate(
            {
                _id:commentId,
                video:videoId,
                commentedBy:req.user?._id
            },{
                $set:{
                    content:content.trim()
                }
            },{
                new:true,
                runValidators:true
            }
        )
        if(!updatedComment){
            throw new ApiError(401,"Comment can't be updated")
        }

        return res.status(200,
            {
                updateComment
            },
            "Comment updated successfully"
        ) 

    } catch (error) {
        throw new ApiError(401,"Comment can't be updated"|| error.message)
    }
})

const deleteComment = asyncHandler(async(req,res) => {
    try {
        /*To delete - 
        go to video
        to comments
        choose comment to delete
        delete that comment document file
        */ 
        const {videoId,commentId} =req.params
        const video =await Video.findById(videoId)
        if(!video){
            throw new ApiError(401,"Video not found")
        }

        const result = await Comment.deleteOne({
            _id:commentId,
            video:videoId,
            commentedBy:req.user?._id
        })

        if(result.deletedCount === 0){
            throw new ApiError(404,"Comment not found or you are not authorized to delete it")
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200,{},"Commen deleted successfully")
        )
        
    } catch (error) {
        throw new ApiError(201,"Comment can't be deleted" || error.message)
    }
})
export {getVideocomment,addComment,updateComment,deleteComment}