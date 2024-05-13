import {asyncHandler}  from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";



 //user ko register karna hai
const registerUser =   asyncHandler( async (req, res) => {

    // Here's the algorithm
    //step 1: get user details from frontend
    //step 2: validation karni hogi, check user ne username empty to nahi de dya etc
    //step 3: check if user already exists in database : username and email should be unique 
    //step 4: check for image , check for avatar
    //step 5: upload them to cloudinary, avatar
    //step 6: create user object - create entry in db
    //step 7: user banane k baad response ayega us response se password hata do password show ni karana, 
    //remove password and refresh token field from response
    //step 8: check response aya hai ya nahi, user create hwa ya nahi
    //step 9: if created then return response otherwise error bhejdo



    // 1
    const {fullName, email , username, password} = req.body
    console.log("Email yeh agyi hai: " , email);
    
    // 2
    if ( // check k koi empty input to nahi agya, agar koi empty hai to error bhejo
        [fullName, email, username, password].some((field) => field?.trim()=== "")
    ) {
        throw new ApiError(400 , "All fields are required")
    }

    // 3
    const existedUser = await User.findOne({ //User can communicate with database on our behalf
        $or: [ { username } , { email } ]//AND gate aur OR gate wala OR operator hai, koi aik value bhi mili to returns true 
        
    })
    console.log("existedUser: ", existedUser);
    if (existedUser) { // If koi user esa exist karta hai to error bhejdo
        throw new ApiError(409 , "Error: Username/Email already used")
    }

    // 4
    const avatarLocalPath = await req.files?.avatar[0]?.path;
//localpath is liye kyun ke abhi local server pe hai cloudinary pe upload nahi kiya image multer ne
    const coverImageLocalPath = await req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400 , "Avatar file is required")
    }

    // 5 
    const avatar =  await uploadOnCloudinary(avatarLocalPath) // await because upload hone me time lagega
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
    // aik bar check karo avatar upload hwa k nahi because its required field
    if (!avatar) {
        throw new ApiError(400, "Avatar not uploaded")
    }
    
    //6 
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage:coverImage?.url || "", // if coverimage hai to url nikal k dedo else empty string dedo
        email,
        password,
        username: username.toLowerCase()
    })
    // checking User create hwa ya nahi, agar hwa to uski _id hogi 
    //( step 7 bhi yahin hojaega id se select karke)
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    // 8 
    if (!createdUser) {
        throw new ApiError(500, "something went wrong while registering a user")
    }

    // 9, will return response using ApiResponse.js
    // 
    return res.status(201).json(//Json response bhejenge, matlab JavaScript Object Notation style mein
        new ApiResponse(200, createdUser,  "User registered Successfully") // new object
    )
})

export {registerUser}