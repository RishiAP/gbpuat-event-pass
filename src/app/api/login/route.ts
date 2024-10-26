import { Admin } from "@/models/Admin";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";
import { connect } from "@/config/database/mongoDBConfig";
import { Verifier } from "@/models/Verifier";
connect();

export async function POST(req:NextRequest){
    try{
        const {email,password,type}=await req.json();
        let token,serialized;
        if(type==="admin"){
            const admin=await Admin.findOne({$or:[{email},{username:email}]});
            if(admin==null || !bcrypt.compareSync(password,admin.password)){
                return NextResponse.json({error:"Invalid credentials"},{status:401});
            }
            token=jwt.sign({_id:admin._id,sessionToken:admin.sessionToken},String(process.env.JWT_ADMIN_SECRET));
            serialized=serialize("jwtAccessToken",token,{
                httpOnly:true,
                secure:process.env.NODE_ENV=="production",
                // secure:false,
                sameSite:"strict",
                maxAge:60*60*24*30,
                path:"/"
            })
            return NextResponse.json({message:"Logged in successfully"}, { status: 200,
                headers: {'Set-Cookie': serialized}
            });
        }
        else if(type==="verifier"){
            const verifier=await Verifier.findOne({username:email});
            if(verifier==null || jwt.verify(verifier.password,String(process.env.JWT_VERIFIER_PASSWORD_ENCRYPTION_SECRET))!=password){
                return NextResponse.json({error:"Invalid credentials"},{status:401});
            }
            token=jwt.sign({_id:verifier._id,sessionToken:verifier.sessionToken},String(process.env.JWT_VERIFIER_SECRET));
            serialized=serialize("jwtAccessToken",token,{
                httpOnly:true,
                secure:process.env.NODE_ENV=="production",
                // secure:false,
                sameSite:"strict",
                maxAge:60*60*24*30,
                path:"/"
            })
            return NextResponse.json({message:"Logged in successfully"}, { status: 200,
                headers: {'Set-Cookie': serialized}
            });
        }
    }
    catch(error){
        console.log(error);
        return NextResponse.json({error},{status:500});
    }
}