import { connect } from "@/config/database/mongoDBConfig";
import { Event } from "@/models/Event";
import { NextRequest, NextResponse } from "next/server";
connect();

export async function GET(req: NextRequest) {
    const _id=new URL(req.url).searchParams.get("_id");
    const event = await Event.findById(_id);
    if (!event) {
        return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }
    return NextResponse.json(event,{status:200});
}

export async function POST(req:NextRequest){
    return NextResponse.json({message:"Method not allowed"},{status:405});
}