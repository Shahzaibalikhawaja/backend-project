import {v2 as cloudinary} from 'cloudinary';
// pehle user se leke local server pe upload karenge, uske baad wahan se cloudinary pe, 

import fs from "fs";
// fs is file system , is library ko install ni karna parta its already part of nodejs


    // Configuration
cloudinary.config({ 
cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
api_key: process.env.CLOUDINARY_API_KEY, 
api_secret: process.env.CLOUDINARY_API_SECRET 
  }  );  
   