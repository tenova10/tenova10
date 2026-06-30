import { NextResponse } from "next/server";
import { createAdminSessionToken, getAdminCookieOptions } from "@/lib/adminAuth";

export async function POST(req) {
    const { password } = await req.json();

    const adminPassword = process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

    if (!adminPassword || password !== adminPassword) {
        return NextResponse.json(
            { error: "Invalid password" },
            { status: 401 }
        );
    }

    const response = NextResponse.json({
        success: true
    });

    response.cookies.set(
        "admin-session",
        createAdminSessionToken(),
        getAdminCookieOptions()
    );

    return response;
}
