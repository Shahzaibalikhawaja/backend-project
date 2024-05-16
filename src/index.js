// require('dotenv').config({path: './env'})

import dotenv from "dotenv";
import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: "./.env",
});

connectDB()
    .then(() => {
        app.on("Error", (error) => {
            console.log("ERROR: ", error);
            throw error;
        });
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running at port: ${process.env.PORT}`);
        });
    })
    .catch((err) => {
        console.log("MONGO db connection failed !!", err);
    });

/*
// method 1 yeh hai, to connect Database Mongodb, isko abhi comment kar rha

import express from "express"
const app = express()

// both asynchronous function and immediately executed function(IFFI) banaenge to connect with database
// aur try catch me so that error aye to catch ho
// better hai k function se pehle semi colon laga lo just in case, last code se disconnect hojae

;( async () => {
try {

    //yeh MONGODB_URL .env file me declare kara tha wahan se access kara hai connect karne k lye aur
    // uske aage Databse ka naam bhi likhna hota hai jo constants.js ki file me declared hai

    await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)

    app.on("Error", ()=>{
        console.log("Error: ", error);
        throw error
    } )
    
    app.listen(process.env.PORT, ()=>{
        console.log(`App is listening to port ${process.env.PORT}`);
    })

} catch (error) {
    console.log("Database Connection Error...")
    console.error("ERROR: " , error)
    throw error
}
})()

*/
