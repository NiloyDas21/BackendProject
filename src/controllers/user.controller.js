import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/Apiresponse.js";

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

export {registerUser} 

























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