import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const authPassword = process.env.AUTH_PASSWORD;

    // If no password is set, allow access (or you could fail closed)
    if (!authPassword) {
        return NextResponse.next();
    }

    const authCookie = request.cookies.get('auth_session');
    const { pathname } = request.nextUrl;

    // Allow access to login page and public assets
    if (
        pathname === '/login' ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/static') ||
        pathname.includes('.') // Files like favicon.ico, manifest.json, sw.js
    ) {
        // If user is already authenticated and tries to go to login, redirect to home
        if (pathname === '/login' && authCookie?.value === 'authenticated') {
            return NextResponse.redirect(new URL('/', request.url));
        }
        return NextResponse.next();
    }

    // Check if user is authenticated
    if (authCookie?.value !== 'authenticated') {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
