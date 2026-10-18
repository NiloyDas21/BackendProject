import { Router } from "express";
import { addComment, deleteComment, getVideocomment, updateComment } from "../controllers/comments.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router()

router.use(verifyJWT)
router.route("/:videoId").get(getVideocomment).post(upload.none(),addComment)
router.route("/c/:commentId").delete(deleteComment).patch(updateComment)

export default router