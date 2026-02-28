import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    if (req.cookies.get('admin')?.value !== 'true') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!email || !password || !supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const client = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
        return NextResponse.json({ error: 'Auth failed' }, { status: 401 });
    }

    return NextResponse.json({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
    });
}
