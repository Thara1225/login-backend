//npm run index
import express from "express";
import cors from "cors";
import "dotenv/config"
import cookieParser from "cookie-parser"; //cookie req ewna

import connectDB from './config/mongodb.js'
import authRouter from './routes/authRoutes.js'

const app =express();
const port = process.env.PORT || 4000

connectDB();

app.use(express.json());
app.use(cookieParser());
app.use(cors({credential:true})) // cookie req wltath domain athara block ek arala denw

//API Endpointes
app.get('/api',(req,res) =>{
    res.send("API working ")
});
app.use('/api/auth',authRouter);
//meken passe verification email ekt nodemailer wlt ynw - config-nodeMailer.js

app.listen(port, ()=> console.log(`Server is running on PORT:${port}`));
//mongodb connection ek hdnw - config-mongodb.js