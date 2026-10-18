import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const registerUser = asyncHandler(async (req,res) =>{
    //req.body works when req is either coming from a form / json 

    const {username,email,fullName,password}=req.body

    // if(fullName === ""){
    //     throw new ApiError(400,"fullName is required")
    // }
    //The above operation check can be done for all parameters at once by

    if([username,email,fullName,password].some((field) =>
        !field || field?.trim() === "")){
            throw new ApiError(400,"Field can't be empty")
    }

    const existedUser=await User.findOne({
        $or:[{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409,"User with username or email already exists")
    }

    const avatarLocalPath=req.files?.avatar?.[0]?.path;
    const coverImageLocalPath=req.files?.coverImage?.[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar= await uploadOnCloudinary(avatarLocalPath)
    const coverImage = coverImageLocalPath
    ? await uploadOnCloudinary(coverImageLocalPath)
    : null;

    if(!avatar){
        throw new ApiError(400,"Avatar is required")
    }

    const user =await User.create({
        fullName,
        email,
        password,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        username:username.toLowerCase() 
    })

    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(201,createdUser,"User registered Successfully")
    )
})

const generateAccessNRefreshToken = async(userId) =>{
    try {
        //Generate both tokens 
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        
        //Save new Refresh Token in DB

        user.refreshToken= refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken} ;

        
    } catch (error) {
        // console.log("ERROR",error)  <-- This is wrong , this is server error, not able to provide tokens

        throw new ApiError(500,"Something went wrong while generationg tokens")
    }
}

const loginUser = asyncHandler(async (req,res) => {
    const {username,email, password} = req.body
    if(!(username || email)){
        throw new ApiError(400,"username or email is required")
    }

    const user=await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"User doesn't exist")
    }

    const isPasswordValid=await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid Credentials")
    }

    //grant Access and Refresh Token

    const {accessToken,refreshToken}=await generateAccessNRefreshToken(user._id);

    const loggedInUser=await User.findById(user_id).select("-password -refreshToken")

    //httpOnly: true
    //The cookie cannot be read by JavaScript in the browser
    //secure: true
    //The browser will only send the cookie over HTTPS, never plain HTTP.
    const options={
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(new ApiResponse(200,{
        user:loggedInUser,accessToken,refreshToken
    },
    "User logged in successfully"
))

})

//logoutUser means delete the refreshToken

const logoutUser =await asyncHandler( async(req,res) =>{
    //we have access to user, since had user_id from access token, from that we got user, and at last we did req.user = user
    //.findByIdAndUpdate only updates and saves the mentioned field

    User.findByIdAndUpdate(req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
                new:true
        }
    )

    const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out Successfully"))
    
}) 

const refreshAccessToken = asyncHandler(async(req,res) => {
    //get the refreshToken from clientside(browser) and verify with the one stored in DB
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,"RefreshToken not found")
    }

    //decode it and compare with DB
    try {
        const decodedRefreshToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
        if(!decodedRefreshToken){
            throw new ApiError(401,"RefreshToken not found")
        }
        //refreshToken has id, from that we get user, user has refreshToken(one saved in DB)
        const user =await User.findById(decodedRefreshToken._id)
        if(!user){
            throw new ApiError(401,"Invalid Refresh Token")
        }
        if((user?.refreshToken !== incomingRefreshToken)){ //here user has refreshToken which is encrypted
            throw new ApiError(401,"Invalid Refresh Token")
        }

        const {accessToken,newrefreshToken} =await generateAccessNRefreshToken(user._id)

        const options = {
            httpOnly:true,
            secure:true
        }

        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("newRefreshToken",newrefreshToken,options)
        .json(
            new ApiResponse(200,
                {accessToken,refreshToken:newrefreshToken},
                "accessToken verified"
            )
        )
        
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refreshToken")
    }
})

const changeCurrentPassword = asyncHandler(async(req,res) => {
    const {oldPassword,newPassword}=req.body

    //Check whether Old pass is correct or not, req r usrt ase user -> user t ase password, but we can also see that user has a method isPasswordCorrect
    const user = User.findById(req.user?._id)

    const isCorrectPassword=user.isPasswordCorrect(oldPassword)
    if(!isCorrectPassword){
        throw new ApiError(401,"Incorrect Password")
    }

    user.password = newPassword

    //save that password
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password changed successfully"))



})

const getCurrentUser = asyncHandler(async(req,res) => {
    res
    .status(200)
    .json(new ApiResponse(200,req.user,"User fetched successfully"))
})

const updateAccountDetails = asyncHandler(async(req,res) => {
    // fullName, email, 
    try {
        const {fullName,email}=req.body
        if(!(fullName) || !(email)){
            throw new ApiError(401,"All Fields required")
        }
    
        const user =await User.findById(req.user?._id)
        if(!user){
            throw new ApiError(400,"User not found")
        }
        user.fullName = fullName
        user.email = email
        await user.save({validateBeforeSave:false})
    
        return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
    } catch (error) {
        throw new ApiError(400,error?.message || "Details can't be updated")
    }


})

const updateUserAvatar = asyncHandler(async (req,res) =>{
    /* 
    Receive avatar through Multer
    Get local path and validate file
    Upload image to Cloudinary
    Save returned URL in MongoDB
    Return updated user details
     */

    try {
        const avatarLocalPath = req.file?.path;
        if(!avatarLocalPath){
            throw new ApiError(400,"Avatar path not found")
        }
        
        //
        
        const avatar=await uploadOnCloudinary(avatarLocalPath)
        if(!avatar.url){
            throw new ApiError(400,"Avatar not uplaoded successfully ")
        }
    
        //find the user by Id and save returned URL in MongoDB
        const user =await User.findByIdAndUpdate(req.user?._id,
            {
                $set:{
                    avatar : avatar.url
                }
            },
            {
                new:true
            }
        ).select("-password")
    
        return res
        .status(200)
        .json(new ApiResponse(200,
            {
                user
            },
            "Avatar updated successfully"
        ))
    } catch (error) {
        throw new ApiError(400,error?.message || "Avatar can't be updated")
    }


})

//No, Niloy, using req.file?.path in both functions will not create a problem by itself. Both functions can use the same property because each request uploads a different file at a different endpoint.

const updateUserCoverImage = asyncHandler(async (req,res) =>{
    try {
        const coverImageLocalPath=req.file?.path
        if(!coverImageLocalPath){
            throw new ApiError(400,"CoverImage path not found")
        }
    
        //If found upload on cloudinary
        const coverImage =await uploadOnCloudinary(coverImageLocalPath)
        if(!coverImage?.url){
            throw new ApiError(400,"Error while uploading coverImage on Cloudinary")
        }
    
        const user = await User.findByIdAndUpdate(req.user?._id,
            {
                $set:{
                    coverImage:coverImage.url
                }
            },
            {
                new:true
            }).select("-password")
    
        return res
        .status(200)    
        .json(new ApiResponse(200,{user},"coverImage updated Successfully"))
    } catch (error) {
        throw new ApiError(400,error?.message || "coverImage can't be updated")
    }
    
})

const getUserChannelProfile = asyncHandler(async (req,res) => {
    //User searches for a particular channel
    const {username}=req.params
    if(!username?.trim()){
        throw new ApiError(400,"Username is missing")
    }

    //find that particular user(can also be done by getting id first and then aggregation can be done further), but here we are using match
    const channel = await User.aggregate([
        {
            $match:{
                username:username
            }
        },
        //getting no of subs
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        //getting no of channels subscriber to
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        //adding fields to user model to show on channel profile
        {
            $addFields:{
                SubscriberCount:{
                    $size:"subscribers"
                },
                channelsSubcribedToCount:{
                    $size:"subscribedTo"
                },
                //To check if we are subscribed to that channel or not

                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                coverImage:1,
                avatar:1,
                SubscriberCount:1,
                channelsSubcribedToCount:1,
                isSubscribed:1,

            }
        }
    ])

    if(!channel.length){
        throw new ApiError(401,"Channel not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "User channel fetched successfully"))

})

const getWatchHistory = asyncHandler(async(req,res) => {
    try {
        const user =await User.aggregate(
            [
                {   //match userid
                    $match:{
                        _id:new mongoose.Types.ObjectId(req.user?._id)
                    }
                },{
                    $lookup:{
                        from:"videos",
                        localField:"watchHistory:",
                        foreignField:"_id",
                        as:"watchhistory",
                        pipeline:[                        //needed to get the user details of the channel
                            {
                                $lookup:{
                                    from:"user",
                                    localField:"owner",
                                    foreignField:"_id",
                                    as:"channelowner",
                                    pipeline:[{
                                        $project:{
                                            username:1,
                                            fullName:1,
                                            avatar:1,
                                        }
                                    }]
                                }
                            }
                        ]
                    }
                },{
                    //Not necessary, included to make the owner appear first with username,fullName and avatar and nothing else appears
                    $addFields:{
                        owner:{
                            $first:"$owner"
                        }
                    }
                }
            ])
    
        return res
        .status(200)
        .json(new ApiResponse(200
            ,user[0].watchHistory
            ,"watch History fetched successfully"))
    } catch (error) {
        throw new ApiError(200,error.message || "Something went wrong")
    }

})
export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateUserCoverImage,getUserChannelProfile,getWatchHistory} 

























/*register -> create a new account in a platform
step1:enter email 
enter username
step2:enter pass


Ans.
1.get user details from frontend
2.validation- username,email (in correct format or not/not empty)
3.check if user already exist:email
4.files check-avatar,coverimage
5.upload them to cloudinary, again check avatar..
6.create user object - create entry in db
7.remove password and refresh token filed from response
8.check if user is successfully created or not
9.return response
*/


/*
Login User steps

a. req.body se data
b. username or email(as data input)
c. password check - can return password or username incorrect
d. login
e. grant Access token and refresh token and sent it through secure cookies
f. send response


*/