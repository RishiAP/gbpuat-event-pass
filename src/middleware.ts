import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getUserFromHeader } from './helpers/common_func';

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  if(request.nextUrl.pathname.startsWith('/admin-login')){
    try{
      const admin=await getUserFromHeader(request,true);
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    catch(err: any){
      return NextResponse.next();
    }
  }
  else if(request.nextUrl.pathname.startsWith('/admin')){
    try{
      const admin=await getUserFromHeader(request,true);
      return NextResponse.next();
    }
    catch(err: any){
      return NextResponse.redirect(new URL('/admin-login', request.url));
    }
  }
  else if(request.nextUrl.pathname.startsWith('/verifier-login')){
    try{
      const verifier=await getUserFromHeader(request,false);
      return NextResponse.redirect(new URL('/verifier', request.url));
    }
    catch(err: any){
      return NextResponse.next();
    }
  }
  else if(request.nextUrl.pathname.startsWith('/verifier')){
    try{
      const verifier=await getUserFromHeader(request,false);
      return NextResponse.next();
    }
    catch(err: any){
      return NextResponse.redirect(new URL('/verifier-login', request.url));
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
        '/admin-login',
        '/verifier',
        '/verifier-login'
    ],
};