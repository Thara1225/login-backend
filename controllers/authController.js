import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'; 
import userModel from '../models/userModel.js';
import transporter from '../config/nodeMailer.js';

//name,email,pass request body eken aragennw
//form ek fill krld blnw 
//klin register kenek d blnw - email eken - ekt try,catch block ek use krnw
//passwword ek bcrypt wlin hash krl save krnw
//jwt token ekak generate krl cookie wlt register info add krnw
//nodemailer wlin welcome note ekak ywnw - transpoter ekak hdl (createTransport)options dala sendMail (transpoter.sendMail)denw
export const register = async (req,res) => {
    const {name,email,password} = req.body ;

    if( !name || !email || !password){
        return res.status(400).json({success: false , message: 'Missing Details'})
    }//res.json wenuwt error msg danna ...

    try{
        // Check if user already exists
        const existingUser = await userModel.findOne ({email})
        if(existingUser){
            return res.status(400).json({ success: false, message: 'User already exists' });   
        }

        //Hash the Password
        const hashedPassword = await bcrypt.hash (password,10);
        const user = new userModel({name, email, password: hashedPassword})
        await user.save();
        //userModel eken create a user and save

        //Generate a JWT token
        //const Id = user._id - meka dala sign eke Id call krnnath puluwn ... hbai object ekak widiyt
        //dammoth key prop ekakuth ekka , odject ek futhur modification wltath gnna puluwn
        const token = jwt.sign({id:user_id} , process.env.JWT_SECRET, { expiresIn:'7d'});
        //Add register info to cookie
        res.cookie('token',token,{
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 
            'none' : 'strict' ,
            maxAge: 7 * 24 * 60 * 60 * 1000 ,
        });

        //nodemailer wlin welcome email ekak danw-config eken passe
        const mailOptions = {
            from:process.env.SENDER_EMAIL,
            to:email,
            subject:'Welcome ...',
            text:`Welcome to our Hotel ${name} ... Your account has been created with email id :${email}`
        }
        await transporter.sendMail(mailOptions);

        //success and new resource will be created - 201
        return res.status(201).json({success:true , message:"User Registered Successfully"})

    } catch (error) {
        return res.status(500).json({success:false , message:error.message})
    }
}

export const login = async (req, res) => {
    const {email,password} = req.body;

    if (!email || !password){
        return res.status(400).json({success: false , message:"Email and Password are required"})
    }

    try {
        //check the user exists
        const user = await userModel.findOne({email});
        if(!user) {
            return res.status(400).json ({success : false , message:'Invalid Email'})
        }

        //compare passwords
        const isMatch = await bcrypt.compare(password,user.password);
        if(!isMatch) {
            return res.status(400).json ({success : false , message:'Invalid Password'})
        }

        //Generate a JWT token
        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, { expiresIn:'7d'});
        res.cookie('token',token,{
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 
            'none' : 'strict' ,
            maxAge: 7 * 24 * 60 * 60 * 1000 ,

        });

        return res.status(200).json({ success: true, message: 'Logged in successfully' });
    

    } catch (error) {
        return res.status(500).json({success:false , message:error.message});
    }
    
}

export const logout = async (req,res) => {
    try {
        res.clearCookie('token' , {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 
                'none' : 'strict' ,     
        });
        return res.status(200).json({success:true , message:"Logged Out"});

    } catch (error) {
        return res.status(500).json({success:false, message:error.message}); 
    }
}

//Send verification OTP to the User's Email
export const sendVerifyOtp = async (req,res) =>{
    try {
        const{userId} =req.body; //cookie wl userId ek thiynw ... eken ganna middleware use krnw
        const user = await userModel.findById(userId)
        if(user.isAccountVerified){
            //acc ek verified nm user already exists .. success:false ekak
            return res.status(400).json({success:false , message: `Account is Already verified by ${user.email}`})
        }

        //create an otp
        const otp = String(Math.floor(100000 + Math.random() * 900000))

        user.verifyOtp = otp;
        user.verifyOtpExpireAt = Date.now() + 1 * 60 * 60 * 1000;
        await user.save();

        const mailOption = {
            from:process.env.SENDER_EMAIL,
            to:user.email,
            subject:'Verify OTP',
            text:`Welcome to our Hotel ${user.name} ... Your ${user.email} OTP is : ${user.verifyOtp} . Verify your Aaccount using this OTP .  `
        }
        await transporter.sendMail(mailOption);

        //success , ok - 200
        return res.status(200).json({ success: true, message: `Verification OTP sent to the ${user.email}` });

    } catch (error) {
        return res.status(500).json({success:false , message:error.message})
    }
}

export const verifyEmail = async (req,res) => {
    const {userId,otp} = req.body;
    
    try {
       const user = await userModel.findById(userId);
       if(!userId || !otp){
        return res.status(400).json({success: false , message: 'User not found or Invalid OTP !!'})
       } 
       if(!user || user.verifyOtp ==='' || user.verifyOtp !== otp){
        return res.status(400).json({success: false , message: 'User not found or Invalid OTP !!'})
       }

       if(user.verifyOtpExpireAt < Date.now()){
        //invalid or incorrect data - 400
        return res.status(400).json({success:false , message:'OTP Expired'});
       }

       user.isAccountVerified = true ;
       user.verifyOtp = '';
       user.verifyOtpExpireAt = 0;

       await user.save();

       return res.status(200).json({ success: true, message: `Your Email: ${user.email} verified successfully` });

    } catch (error) {
        //catch block error ekak nm internal server side error - 500
        return res.status(500).json({success:false , message:error.message})
    }
}

//user authencitation
export const isAuthenticated = async (req,res) =>{
    try {
        res.status(200).json({success:true })
    } catch (error) {
        res.status(500).json({success:false ,message:error.message })
    }
}

//Send password reset OTP
export const sendResetOtp = async (req,res) => {
    const {email} = req.body;

    if(!email){
        return res.status(400).json({success:false , message:"Email is required"})
    }
    try {
        const user =await userModel.findOne({email});
        if(!user){
            return res.status(400).json({success:false , message:"User not Found"})
        }

        //re-create an otp
        const otp = String(Math.floor(100000 + Math.random() * 900000))

        user.resetOtp = otp;
        user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000;
        await user.save();

        const mailOption = {
            from:process.env.SENDER_EMAIL,
            to:user.email,
            subject:'Password Reset OTP',
            text:`Your:${user.email} password reset OTP is:${otp} `
        }
        await transporter.sendMail(mailOption);

        return res.status(200).json({success:true , message:`OTP sent to your Email:${user.email}`})


    } catch (error) {
        res.status(500).json({success:false ,message:error.message })
    }
}

//Reset Password
export const resetPassword = async (req,res) => {
    const{email,otp,newPassword} = req.body;

    if(!email || !otp || !newPassword){
        return res.status(400).json({success:false , message:"Email , OTP and New Password are required."})
    }

    try {
        const user =await userModel.findOne({email});
        if(!user){
            return res.status(400).json({success:false , message:"User not Found"})
        }
        
        if(user.resetOtp ==="" || user.resetOtp !==otp){
            return res.status(400).json({ success:false , message:"Invalid OTP."})
        }

        if(user.resetOtpExpireAt<Date.now()){
            return res.status(400).json({success:false,message:"OTP is Expired."})
        }

        const hashedPassword = await bcrypt.hash(newPassword,10);

        user.password = hashedPassword;
        user.resetOtp ='';
        user.resetOtpExpireAt = 0;

        await user.save();

        return res.status(200).json({success:true,message:`Your ${email} Password has been reset Successfully`})

    } catch (error) {
        res.status(500).json({success:false ,message:error.message })
    }
}

//Routes hdgnnona
