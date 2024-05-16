import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
    // call this method whenever you need to generate access and refresh token,
    // takes userId as parameter, returns the generated AccessToken and refreshToken

    try {
        const user = await User.findById(userId); // database se is ID ka user nikalo
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // User.model.js me jo refreshToken hai usme daldo generated refresh token
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false }); // save bhi karlo changes
        // validate before save = false because otherwise password validate hoga,
        // required field hai user.model.js me password
        // aur yahan hamne koi password ni diya, validate hota to error ata

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating Access and Refresh Tokens"
        );
    }
};

//user ko register karna hai
const registerUser = asyncHandler(async (req, res) => {
    // algorithm:
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
    const { fullName, email, username, password } = req.body;
    // console.log("Email yeh agyi hai: " , email);

    // 2
    if (
        // check k koi empty input to nahi agya, agar koi empty hai to error bhejo
        [fullName, email, username, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // 3
    const existedUser = await User.findOne({
        //User can communicate with database on our behalf
        $or: [{ username }, { email }], //AND gate aur OR gate wala OR operator hai, koi aik value bhi mili to returns true
    });
    // console.log("existedUser: ", existedUser);
    if (existedUser) {
        // If koi user esa exist karta hai to error bhejdo
        throw new ApiError(409, "Error: Username/Email already used");
    }

    // 4
    const avatarLocalPath = await req.files?.avatar[0]?.path;
    // //localpath is liye kyun ke abhi local server pe hai cloudinary pe upload nahi kiya image multer ne
    //     const coverImageLocalPath = await req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.Length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // 5
    const avatar = await uploadOnCloudinary(avatarLocalPath); // await because upload hone me time lagega
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    // aik bar check karo avatar upload hwa k nahi because its required field
    if (!avatar) {
        throw new ApiError(400, "Avatar not uploaded");
    }

    //6
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "", // if coverimage hai to url nikal k dedo else empty string dedo
        email,
        password,
        username: username.toLowerCase(),
    });
    // checking User create hwa ya nahi, agar hwa to uski _id hogi
    //( step 7 bhi yahin hojaega id se select karke)
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    // 8
    if (!createdUser) {
        throw new ApiError(
            500,
            "something went wrong while registering a user"
        );
    }

    // 9, will return response using ApiResponse.js
    //
    return res.status(201).json(
        //Json response bhejenge, matlab JavaScript Object Notation style mein
        new ApiResponse(200, createdUser, "User registered Successfully") // new object
    );
});

// user ko login karana hai
const loginUser = asyncHandler(async (req, res) => {
    // algorithm
    // 1. req.body se data lao
    // 2. username email hai ya nahi check
    // 3. find the user
    // 3.5 return error if cant find the user
    // 4. password check
    // 5. generate and send access and refresh token
    // 6. send cookie

    // 1.
    const { email, username, password } = req.body;

    // 2.
    if (!username && !email) {
        throw new ApiError(400, "Username or Email is required");
    }
    console.log("Email: ", email);
    console.log("Username: ", username);

    // 3. database me find karen dono, return jo pehle mila
    const user = await User.findOne({
        $or: [{ email }, { username }],
    });

    // 3.5 agar database me nahi mila matlab is username/email ka koi user database me nahi hai
    if (!user) {
        throw new ApiError(
            404,
            "Failed to login, User with this Username/Email does not exist"
        );
    }

    // 4
    const isPasswordValid = await user.isPasswordCorrectBhai(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid Password");
    }

    // 5.
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        user._id
    );

    // 6. cookie

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    // cookies bhejte waqt uske kuch options design karte parte hain (object hota hai)
    const options = {
        httpOnly: true,
        secure: true,
    };
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User Logged In Successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            },
        },
        {
            new: true,
        }
    );
    const options = {
        httpOnly: true,
        secure: true,
    };
    return res
        .status(200)
        .clearCookie("accessToken")
        .clearCookie("refreshToken")
        .json(new ApiResponse(200, {}, "User Logged Out"));
});

// aik end-point banate hain
const refreshAccesToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized Access( token ghalat hai apka)");
    }
    try {
        //token verify karate hain
        const decodedToken = verify.jwt(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
        const user = await User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token)");
        }

        //incoming token jo current user bhej rha hai, aur
        // database me jo is user ka token saved hai woh compare karte hain

        if (incomingRefreshToken != user?.refreshToken) {
            throw new ApiError(401, "Refresh token is Already Used or Expired");
        }

        const options = {
            httpOnly: true,
            secure: true,
        };

        const { newRefreshToken, accessToken } =
            await generateAccessAndRefreshToken(user._id);

        return res
            .status(200)
            .cookie("refreshToken", newRefreshToken, options)
            .cookie("accessToken", accessToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token");
    }
});

//user ko password change karana ho to uska controller banate hain
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    //pehle current user lo jo already logged in hai
    //login k waqt auth middleware me data gya hoga uska (req.user)
    const user = await User.findById(req.user?._id);

    //hamare pas user schema mein aik method hai isPasswordCorrectBhai jo true ya falsa return karta hai

    const isPasswordCorrect = await user.isPasswordCorrectBhai(oldPassword); // save this true/false value in a variable

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Old Password is not correct");
    }
    // if isPasswordCorrect = true to is line pe ayega
    user.password = newPassword; // set newPassword, this only sets it and does not save it

    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    res.status(200).json(200, req.user, "Current User fetched Successfully");
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body; //images update karne ka alag controller banana advice hai
    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email,
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Account details updated successfully")
        );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    //multer middleware se file request
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath); //yeh string ni poora object milta hai

    if (!avatar.url) {
        throw new ApiError(400, "Error while Uploading avatar");
    }

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url, // avatar object se sirf url chahye new file ka
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    //multer middleware se file request
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image file is missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath); //yeh string ni poora object milta hai

    if (!coverImage.url) {
        throw new ApiError(400, "Error while Uploading Cover Image");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url, //  object se sirf url chahye new file ka
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover Image updated successfully"));
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccesToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
};