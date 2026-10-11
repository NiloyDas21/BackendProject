import multer from "multer"

const storage = multer.diskStorage({
    //where should the file go in our local folder
    destination:function(req,file,cb){
        cb(null,"./public/temp")
    },

    //what should be the file called?
    filename: function(req,file,cb){
        cb(null,file.originalname)
    }
})


export const upload = multer({
    storage,
})