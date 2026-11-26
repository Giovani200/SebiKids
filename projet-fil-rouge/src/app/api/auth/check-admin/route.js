import { NextResponse } from 'next/server';
import { requireAdmin } from '@/server/auth';

export async function GET() {
    const { user, errorResponse } = await requireAdmin();
    if (errorResponse) return errorResponse;

    return NextResponse.json({ isAdmin: true, user: { firstName: user.firstName } });
}
