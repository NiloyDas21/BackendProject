import {Router} from "express"
import { publishVideo } from "../controllers/video.controller"
const router = Router()

router.route("/upload-video").post(
    upload.fields([
        {
            name:"videoFile",
            maxCount:1
        },{
            name:"thumbnail",
            maxCount:1
        }
    ]),
    publishVideo)
    
export default router
