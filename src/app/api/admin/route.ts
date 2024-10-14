import { connect } from "@/config/database/mongoDBConfig";
import { Admin } from "@/models/Admin";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
connect();

export async function POST(req:NextRequest){
    try{
        const {username,password,email}=await req.json();
        const saltRounds=10;
        const salt = bcrypt.genSaltSync(saltRounds);
        const hash = bcrypt.hashSync(password, salt);
        let admin=new Admin({username,password:hash,email,sessionToken:randomBytes(16).toString('hex')});
        admin=await admin.save();
        return NextResponse.json(admin,{status:201});
    }
    catch(error){
        return NextResponse.json({error},{status:500});
    }
}