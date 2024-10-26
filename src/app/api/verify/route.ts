import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { User } from "@/models/User";
import { connect } from "@/config/database/mongoDBConfig";
import { Department } from "@/models/Department";
import { College } from "@/models/College";
import { getUserFromHeader } from "@/helpers/common_func";
import { Verifier } from "@/models/Verifier";
import { Event } from "@/models/Event";
import mongoose from "mongoose";
connect();

Department;
College;
Verifier;

function pause(milliseconds:number) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function findAndLockUser(email: string, event: string) {
let retries = 5;
while (retries > 0) {
    const user = await User.findOneAndUpdate(
    { email, [`events.${event}`]: { $exists: true }, locked: { $ne: true } }, 
    { $set: { locked: true } }, // Try to lock the user
    { new: true } // Return the updated document
    );

    if (user) {
    return user; // If successful, return the user document
    }

    // Wait for 1 second before retrying
    await pause(1000);

    retries--;
}

// If all retries failed, return null
return null;
}

export async function POST(req:NextRequest){
    try{
        const verifier=await getUserFromHeader(req);
        if(verifier==null){
            return NextResponse.json({message:"Unauthorized"},{status:401});
        }
        const {qrData,event}=await req.json();
        if(qrData==null || event==null)
            return NextResponse.json({message:"Invalid Request"},{status:400});
        let user:any;
        try{
            user=jwt.verify(qrData,String(process.env.JWT_USER_QR_SECRET));
        }
        catch(error){
            return NextResponse.json({message:"Invalid QR Code"},{status:403});
        }
        if(user.event!=event)
            return NextResponse.json({message:"QR Code belongs to some other event"},{status:403});
        user=await User.findOne({email:user.email});
        if(user==null)
            return NextResponse.json({message:"User not found please retry"},{status:404});
        if(user.events.get(event)==null)
            return NextResponse.json({message:"User not registered for this event"},{status:404});
        user=await findAndLockUser(user.email,event);
        if(user==null)
            return NextResponse.json({message:"User is locked by another verifier"},{status:423});
        if(user.events.get(event).status){
            user=await User.findByIdAndUpdate(user._id,{$set:{locked:false}},{new:true}).populate('department').populate(`events.${event}.verifier`).populate('college');
            return NextResponse.json({user,same_gate:verifier._id==user.events.get(event).verifier.toString()},{status:409});
        }
        const session=await mongoose.startSession();
        session.startTransaction();
        try{
            if(verifier._id!=user.events.get(event).verifier.toString()){
                user=await User.findByIdAndUpdate(user._id,{$set:{locked:false}},{new:true}).populate('department').populate(`events.${event}.verifier`).populate('college');
                return NextResponse.json({user,same_gate:false},{status:200});
            }
            const verifyingEvent=await Event.findByIdAndUpdate(event,{$inc:{attended:1}},{new:true,session});
            user=await User.findByIdAndUpdate(user._id,{$set:{locked:false,[`events.${event}.status`]:true,[`events.${event}.entry_time`]:new Date()}},{new:true,session}).populate('department').populate(`events.${event}.verifier`).populate('college');
            await session.commitTransaction();
        }
        catch(error){
            await session.abortTransaction();
            return NextResponse.json({message:"Internal Server Error"},{status:500});
        }
        finally{
            session.endSession();
        }
        return NextResponse.json({user,same_gate:true},{status:200});
    }
    catch(error){
        console.log(error);
        return NextResponse.json({error},{status:500});
    }
}