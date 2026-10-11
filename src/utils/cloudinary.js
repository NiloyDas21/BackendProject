import {v2 as cloudinary} from cloudinary
import fs from "fs"


cloudinary.config({
    cloud_name : process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret:process.env.CLOUD_API_SECRET

})


const uploadOnCloudinary =async (localfilepath) => {
    try{
        if(!localfilepath) return null;                //We can also return that file is not uploaded
        const response = await cloudinary.uploader.upload(localfilepath,{
            resource_type:"auto"
        })

        console.log("File has been uploaded successfully",response.url)
        return response
    }
    catch(error){ 
        fs.unlink(localfilepath)           //remove the locally saved temporary file as tehe upload operation got failed
        return null
    }
}

export {uploadOnCloudinary}