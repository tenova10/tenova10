import { NextResponse } from "next/server";

export async function POST(req) {
    const { password } = await req.json();

    if (password !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json(
            { error: "Invalid password" },
            { status: 401 }
        );
    }

    const response = NextResponse.json({
        success: true
    });

    response.cookies.set("admin-session", "logged-in", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 8,
        path: "/"
    });

    return response;
}