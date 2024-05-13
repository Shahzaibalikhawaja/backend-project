import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";


const router = Router()


// /http://locahost:8000/api/v1/user/register pe koi bhi jaega to registerUser method execute hoga
// router.route("/register").post(registerUser)

// ab yahan registerUser se pehle middleware laga rhe multer wala so that we can upload files

router.route("/register").post(
    upload.fields([ //field ki documentation me likha hai yeh array accept karta hai so make array []

        //yahan pe do files upload karni hai, avatar and coverImage, 2 object banenge array k andar
        {
            name: "avatar",
            maxCount : 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]) ,   
    registerUser
)

export default router