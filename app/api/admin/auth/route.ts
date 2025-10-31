import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;
    
    // Get the admin password from environment variable
    const expectedPassword = process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
    
    if (!expectedPassword) {
      return NextResponse.json(
        { error: 'Admin password not configured' },
        { status: 500 }
      );
    }
    
    if (password === expectedPassword) {
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json(
      { error: 'Invalid password' },
      { status: 401 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to authenticate', message: err?.message || String(err) },
      { status: 500 }
    );
  }
}

