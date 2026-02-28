import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
    const secret = process.env.ADMIN_SECRET;
    const res = NextResponse.next();
    if (secret && req.nextUrl.searchParams.get('admin') === secret) {
        res.cookies.set('admin', 'true', { sameSite: 'strict', path: '/' });
    }
    return res;
}

export const config = {
    matcher: '/',
};
