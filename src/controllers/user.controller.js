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

const generateAccessNRefreshToken = async(userId) =>{
    try {
        //Generate both tokens 
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        
        //Save Refresh Token in DB

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

export {registerUser,loginUser} 

























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