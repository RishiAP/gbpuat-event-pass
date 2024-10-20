import { NextRequest, NextResponse } from "next/server";
import { serialize } from 'cookie';

export async function GET(req: NextRequest) {
    try {
        // Clear the jwtAccessToken cookie by setting it with a past expiration date
        const serialized = serialize("jwtAccessToken", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV == "production",
            sameSite: "strict",
            maxAge: -1, // Set the cookie expiration to a past date
            path: "/"
        });
        
        return NextResponse.json({ message: "Logged out successfully" }, {
            status: 200,
            headers: { 'Set-Cookie': serialized }
        });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}