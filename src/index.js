// require('dotenv').config({path:'./env'})
import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path:'./.env'
})


connectDB()
.then(() =>{
    app.on("error",(error)=>{
        console.log("ERROR:",error)
        throw error
    })
    app.listen(process.env.PORT || 8000, () =>{
        console.log(`Server is running at port:${process.env.PORT || 8000
            
        }`)
    })
})
.catch((err) =>{
    console.log("MONGODB connection fail")
})
















/*
Approach one: Connection with DB is established in the index.js file itself
import express from "express"
const app = express()
//Use of IIFE

(async () => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        //Listener
        app.on("error",(error) => {
            console.log("ERR:",error)
            throw error
        })

        app.listen(process.env.PORT,() =>{
            console.log(`App is listening on port ${process.env.PORT}`)
        })
        
    }catch(error){
        console.error("ERROR:",error)
        throw error
    }
})()

*/