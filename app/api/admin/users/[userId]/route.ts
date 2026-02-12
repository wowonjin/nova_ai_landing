export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, admin } from "@/lib/adminAuth";
import { getTierLimit } from "@/lib/tierLimits";
import { resolveEffectiveUsagePlan } from "@/lib/aiUsage";

const db = admin.firestore();

/**
 * PATCH /api/admin/users/[userId]
 * Updates user's remaining AI usage for current cycle/day.
 * Body: { remainingUsage: number }
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> },
) {
    const adminUser = await verifyAdmin(request.headers.get("Authorization"));

    if (!adminUser) {
        return NextResponse.json(
            { error: "Unauthorized - Admin access required" },
            { status: 403 },
        );
    }

    const { userId } = await params;
    if (!userId) {
        return NextResponse.json(
            { error: "User ID is required" },
            { status: 400 },
        );
    }

    try {
        const body = (await request.json()) as { remainingUsage?: unknown };
        const remainingUsage = Number(body?.remainingUsage);

        if (!Number.isFinite(remainingUsage) || remainingUsage < 0) {
            return NextResponse.json(
                { error: "remainingUsage must be a non-negative number" },
                { status: 400 },
            );
        }

        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();
        const userData = (userDoc.data() || {}) as Record<string, any>;
        const plan = resolveEffectiveUsagePlan(userData);
        const usageLimit = getTierLimit(plan);

        if (remainingUsage > usageLimit) {
            return NextResponse.json(
                {
                    error: `remainingUsage cannot exceed current plan limit (${usageLimit})`,
                },
                { status: 400 },
            );
        }

        const nextUsage = Math.max(0, usageLimit - Math.floor(remainingUsage));
        await userRef.set(
            {
                aiCallUsage: nextUsage,
                updatedAt: new Date().toISOString(),
            },
            { merge: true },
        );

        return NextResponse.json({
            success: true,
            usage: {
                today: nextUsage,
                limit: usageLimit,
                remaining: Math.max(0, usageLimit - nextUsage),
            },
        });
    } catch (error) {
        console.error("Update user usage error:", error);
        return NextResponse.json(
            {
                error: "Failed to update user usage",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

/**
 * DELETE /api/admin/users/[userId]
 * Deletes a user from Firebase Auth and Firestore (including payments subcollection)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> },
) {
    const adminUser = await verifyAdmin(request.headers.get("Authorization"));

    if (!adminUser) {
        return NextResponse.json(
            { error: "Unauthorized - Admin access required" },
            { status: 403 },
        );
    }

    const { userId } = await params;

    if (!userId) {
        return NextResponse.json(
            { error: "User ID is required" },
            { status: 400 },
        );
    }

    // Prevent admin from deleting themselves
    if (userId === adminUser.uid) {
        return NextResponse.json(
            { error: "Cannot delete your own account" },
            { status: 400 },
        );
    }

    try {
        // 1) Delete from Firebase Auth first so we don't report success while auth user still exists.
        let deletedAuthUser = false;
        try {
            await admin.auth().getUser(userId);
            await admin.auth().deleteUser(userId);
            deletedAuthUser = true;
        } catch (authError: any) {
            if (authError?.code !== "auth/user-not-found") {
                console.error("Failed to delete user from Auth:", authError);
                return NextResponse.json(
                    {
                        error: "Failed to delete Firebase Auth user",
                        details:
                            authError instanceof Error
                                ? authError.message
                                : String(authError),
                    },
                    { status: 500 },
                );
            }
        }

        // 2) Delete payments subcollection first
        const paymentsRef = db
            .collection("users")
            .doc(userId)
            .collection("payments");
        const paymentsSnapshot = await paymentsRef.get();

        const batch = db.batch();
        paymentsSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        // 3) Delete user document from Firestore
        batch.delete(db.collection("users").doc(userId));

        await batch.commit();

        return NextResponse.json({
            success: true,
            message: "User deleted successfully",
            deletedAuthUser,
            deletedPayments: paymentsSnapshot.size,
        });
    } catch (error) {
        console.error("Delete user error:", error);
        return NextResponse.json(
            {
                error: "Failed to delete user",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
