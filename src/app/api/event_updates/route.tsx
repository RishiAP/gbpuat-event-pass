import { connect } from "@/config/database/mongoDBConfig";
import { getUserFromHeader } from "@/helpers/common_func";
import { Event } from "@/models/Event";
import { User } from "@/models/User";
import { Verifier } from "@/models/Verifier";
import { NextRequest, NextResponse } from "next/server";
Verifier;
connect();

export async function GET(req: NextRequest) {
    const admin=await getUserFromHeader(req,true);
    if(admin==null)
        return NextResponse.json({message:"Unauthorized"},{status:401});
    const _id=new URL(req.url).searchParams.get("_id");
    const event = JSON.parse(JSON.stringify(await Event.findById(_id).populate({
        path:"verifiers.verifier",
        select:"name _id username"
    })));
    if (!event) {
        return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }
    for(let i=0;i<event.verifiers.length;i++){
        event.verifiers[i].attended=await User.find({[`events.${event._id}.verifier`]:event.verifiers[i].verifier._id,[`events.${event._id}.status`]:true}).countDocuments();
    }
    return NextResponse.json(event,{status:200});
}