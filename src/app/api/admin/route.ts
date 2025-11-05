import { connect } from "@/config/database/mongoDBConfig";
import { getUserFromHeader } from "@/helpers/common_func";
import { Event } from "@/models/Event";
import { Verifier } from "@/models/Verifier";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
connect();

export async function GET(req:NextRequest){
    let admin=await getUserFromHeader(req,true);
    if(admin==null){
        return NextResponse.json({error:"Unauthorized"},{status:401});
    }
    const params=new URL(req.url).searchParams;
    const query=params.get("query");
    if(query=="verifier_pass"){
        const _id=params.get("_id");
        if(_id==null){
            return NextResponse.json({error:"_id required"},{status:400});
        }
        const verifier=await Verifier.findById(_id);
        if(verifier==null){
            return NextResponse.json({error:"Verifier not found"},{status:404});
        }
        return NextResponse.json({password:jwt.verify(verifier.password,String(process.env.JWT_VERIFIER_PASSWORD_ENCRYPTION_SECRET))},{status:200});
    }
}

export async function POST(req:NextRequest){
    try{
        let admin=await getUserFromHeader(req,true);
        if(admin==null){
            return NextResponse.json({error:"Unauthorized"},{status:401});
        }
        const data=await req.json();
        const {type}=data;
        if(type=="event"){
            const {title,description,date,location}=data;
            const event=new Event({title,description,date,location,status:"active"});
            await event.save();
            return NextResponse.json(event,{status:200});
        }
        else if(type=="verifier"){
            const {name,username,password}=data;
            const encryptedPassword=jwt.sign(password,String(process.env.JWT_VERIFIER_PASSWORD_ENCRYPTION_SECRET));
            let verifier=new Verifier({name,password:encryptedPassword,username,sessionToken:randomBytes(32).toString('hex')});
            verifier =await verifier.save();
            return NextResponse.json({_id:verifier._id},{status:200});
        }
        return NextResponse.json({error:"Invalid request. Prop 'type' required."},{status:400});
    }
    catch(error){
        console.log(error);
        return NextResponse.json({error},{status:500});
    }
}

export async function PUT(req:NextRequest){
    try{
        let admin=await getUserFromHeader(req,true);
        if(admin==null){
            return NextResponse.json({error:"Unauthorized"},{status:401});
        }
        const data=await req.json();
        const {type}=data;
        if(type=="event"){
            const {title,description,date,location,_id,status}=data;
            const event=await Event.findById(_id);
            if(event==null){
                return NextResponse.json({error:"Event not found"},{status:404});
            }
            event.title=title;
            event.description=description;
            event.date=date;
            event.location=location;
            event.status=status;
            await event.save();
            return NextResponse.json(event,{status:200});
        }
        else if(type=="verifier"){
            const {name,username,password,_id}=data;
            const verifier=await Verifier.findById(_id);
            if(verifier==null){
                return NextResponse.json({error:"Verifier not found"},{status:404});
            }
            const encryptedPassword=jwt.sign(password,String(process.env.JWT_VERIFIER_PASSWORD_ENCRYPTION_SECRET));
            verifier.name=name;
            verifier.username=username;
            verifier.password=encryptedPassword;
            await verifier.save();
            return NextResponse.json(verifier,{status:200});
        }
        return NextResponse.json({error:"Invalid request. Prop 'type' required."},{status:400});
    }
    catch(error){
        console.log(error);
        return NextResponse.json({error},{status:500});
    }
}