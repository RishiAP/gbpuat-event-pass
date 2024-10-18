import { getUserFromHeader } from "@/helpers/common_func";
import { User } from "@/models/User";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const user = await getUserFromHeader(req, true);
        if (user == null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const {event_id}=await req.json();
        const users=await User.find({[`events.${event_id}`]: { $exists: true }});
        return NextResponse.json(users,{status:200});
    } catch (error) {
        session.endSession();
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}