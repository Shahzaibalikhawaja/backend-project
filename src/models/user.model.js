import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt"; //password ko encrypt karenge save karne se pehle using bcrypt
import jwt from "jsonwebtoken"; // bearer token hai, chabi ki tarah hai, jiske pas yeh hwa usey data send kardenge
//https://www.npmjs.com/package/jsonwebtoken

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true, //kisi bhi cheeze ko searchable banana hai to index true kardo
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullName: {
            type: String,
            required: true,
            index: true,
            trim: true,
        },
        avatar: {
            type: String, //cloudinary url
            required: true,
        },
        coverImage: {
            type: String,
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video",
            },
        ],

        password: {
            type: String,
            required: [true, "Password is required"],
        },

        refreshToken: {
            type: String,
        },
    },
    { timestamps: true }
); //created at mil jaega is se

// pre = before
// post = after
// before saving, we encrypt using hash method, hash requires two things
// pehla k encrypt kya karna hai
// dursa kitne round ki encryption lagani hai
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next(); //agar modify ni hwa password to direct return

    this.password = await bcrypt.hash(this.password, 10);
    next();
});

//custom method banaya hai
userSchema.methods.isPasswordCorrectBhai = async function (password) {
    return await bcrypt.compare(password, this.password);
};
// do aur custom method banaenge, jwt (jsonWebToken) se do token generate karaenge
userSchema.methods.generateAccessToken = function () {
    //jwt ki documentation parho, iska sign method karta hai token generate
    return jwt.sign(
        {
            _id: this.ObjectId,
            email: this.email,
            username: this.username,
            fullName: this.fullName,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    );
};
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this.ObjectId,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    );
};

export const User = mongoose.model("User", userSchema);
// yeh User database se direct contact kar sakta hai because it is made with mongoose.
