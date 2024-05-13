import {v2 as cloudinary} from 'cloudinary';
import { log } from 'console';
// pehle user se leke local server pe upload karenge, uske baad wahan se cloudinary pe, 

import fs from "fs";
// fs is file system , is library ko install ni karna parta its already part of nodejs

const uploadOnCloudinary = async (localFilePath)=>{
    try {
        // check agar local file path hai hi nahi to null value k sath return hojao
        if (!localFilePath) return null

        // agar return ni hwa to yeh code execute hoga
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto'
        })
        // file has been uploaded
        console.log("File has been Uploaded");
        console.log(response.url);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) //remove the locally saved temp file as the upload operation failed
        return null;
    }
}

    // Configuration
cloudinary.config({ 
cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
api_key: process.env.CLOUDINARY_API_KEY, 
api_secret: process.env.CLOUDINARY_API_SECRET 
  }  );  
   
export {uploadOnCloudinary}