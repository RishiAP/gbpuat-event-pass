import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getUserFromHeader } from './helpers/common_func';

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  if(request.nextUrl.pathname.startsWith('/admin')){
    try{
      const admin=await getUserFromHeader(request,true);
      console.log(admin);
      return NextResponse.next();
    }
    catch(err: any){
      return NextResponse.redirect(new URL('/admin-login', request.url));
    }
  }
  else{
    return NextResponse.next();
  }
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
        '/admin',
    ],
};