import { NextRequest, NextResponse } from "next/server";

export function GET(req:NextRequest){
    const {searchParams}=new URL(req.url);
    const theme=searchParams.get("theme");
    if(theme==null)
        return NextResponse.json({message:"Please provide theme"},{status:400});
    if(!["light","dark"].includes(theme))
        return NextResponse.json({message:"Theme not found"},{status:404});
    const response= NextResponse.json({message:"ok"},{status:200});
    response.cookies.set('theme',theme,{
        path:"/",
        maxAge:60*60*24*365
    });
    return response;
}