import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { JwtPayload } from "jsonwebtoken";
import { parse } from 'cookie';

export async function getUserFromHeader(req: NextRequest,isAdmin:boolean=false): Promise<JwtPayload | null> {
    const cookies = parse(req.headers.get('cookie') || '');
    if (cookies.jwtAccessToken && cookies.jwtAccessToken.length > 0) {
        try {
            const secret = new TextEncoder().encode(isAdmin?process.env.JWT_ADMIN_SECRET:process.env.JWT_VALIDATOR_SECRET);
            const verify=await jwtVerify(cookies.jwtAccessToken, secret);
            return verify.payload;
        } catch (err) {
            console.error('JWT verification failed:', err);
        }
    }
    throw new Error('Invalid token');
}