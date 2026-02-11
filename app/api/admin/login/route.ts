export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createAdminSessionToken } from "@/lib/adminAuth";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "@/lib/adminPortal";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => null);
        const email = String(body?.email ?? "").trim().toLowerCase();
        const password = String(body?.password ?? "");

        if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
            return NextResponse.json(
                { error: "Invalid admin credentials" },
                { status: 401 },
            );
        }

        const token = createAdminSessionToken();
        return NextResponse.json({
            success: true,
            token,
            admin: { email: ADMIN_EMAIL },
        });
    } catch {
        return NextResponse.json(
            { error: "Failed to sign in as admin" },
            { status: 500 },
        );
    }
}
