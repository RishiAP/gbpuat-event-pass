import { connect } from "@/config/database/mongoDBConfig";
import { Event } from "@/models/Event";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

connect();

export async function GET(req: NextRequest) {
    const _id=new URL(req.url).searchParams.get("_id");
    const event = await Event.findById(_id);
    if (!event) {
        return NextResponse.json(
            { message: "Event not found" },
            {
                status: 404,
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                    Pragma: "no-cache",
                    Expires: "0",
                },
            }
        );
    }
    return NextResponse.json(event,{
        status:200,
        headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
        },
    });
}

export async function POST(req:NextRequest){
    return NextResponse.json({message:"Method not allowed"},{status:405});
}