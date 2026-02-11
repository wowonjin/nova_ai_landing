import { NextRequest, NextResponse } from "next/server";
import getFirebaseAdmin from "@/lib/firebaseAdmin";
import { getTierLimit } from "@/lib/tierLimits";
import {
    buildUsageResetFields,
    inferPaidPlanFromPayment,
    needsUsageResetFromPayment,
    resolveEffectiveUsagePlan,
} from "@/lib/aiUsage";

/**
 * Increment AI usage counter
 * POST /api/ai/increment-usage
 * Body: { userId: string }
 */
export async function POST(request: NextRequest) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { error: "userId is required" },
                { status: 400 }
            );
        }

        const admin = await getFirebaseAdmin();
        const db = admin.firestore();
        const userRef = db.collection("users").doc(userId);
        const result = await db.runTransaction(async (tx) => {
            const userDoc = await tx.get(userRef);
            const nowIso = new Date().toISOString();
            let plan: "free" | "plus" | "pro" = "free";
            let inferredResetAt: string | undefined;
            let userData: Record<string, any> = {};

            const inferPlanFromPayments = async () => {
                try {
                    const paymentsQuery = userRef
                        .collection("payments")
                        .orderBy("approvedAt", "desc")
                        .limit(20);
                    const paymentsSnap = await tx.get(paymentsQuery);
                    for (const paymentDoc of paymentsSnap.docs) {
                        const paymentData = paymentDoc.data() as any;
                        const inferred = inferPaidPlanFromPayment(paymentData);
                        if (inferred !== "free") {
                            if (typeof paymentData?.approvedAt === "string") {
                                inferredResetAt = paymentData.approvedAt;
                            }
                            return inferred;
                        }
                    }
                } catch (orderedQueryError) {
                    const paymentsQuery = userRef.collection("payments").limit(50);
                    const paymentsSnap = await tx.get(paymentsQuery);
                    for (const paymentDoc of paymentsSnap.docs) {
                        const paymentData = paymentDoc.data() as any;
                        const inferred = inferPaidPlanFromPayment(paymentData);
                        if (inferred !== "free") {
                            if (typeof paymentData?.approvedAt === "string") {
                                inferredResetAt = paymentData.approvedAt;
                            }
                            return inferred;
                        }
                    }
                }
                return "free" as const;
            };

            if (!userDoc.exists) {
                plan = await inferPlanFromPayments();
                const limit = getTierLimit(plan);
                if (limit <= 0) {
                    return {
                        exceeded: true as const,
                        plan,
                        currentUsage: 0,
                        limit,
                    };
                }
                tx.set(
                    userRef,
                    {
                        plan,
                        tier: plan,
                        aiCallUsage: 1,
                        lastAiCallAt: nowIso,
                        usageResetAt: inferredResetAt || nowIso,
                        createdAt: nowIso,
                        updatedAt: nowIso,
                    },
                    { merge: true },
                );
                return {
                    exceeded: false as const,
                    plan,
                    currentUsage: 1,
                    limit,
                };
            }

            userData = (userDoc.data() || {}) as Record<string, any>;
            plan = resolveEffectiveUsagePlan(userData);
            if (plan === "free") {
                plan = await inferPlanFromPayments();
            }
            const limit = getTierLimit(plan);
            let currentUsage = Number(userData.aiCallUsage || 0);

            const resetDecision = needsUsageResetFromPayment(
                userData as Record<string, any>,
                plan,
            );
            const resetFields = resetDecision.shouldReset
                ? buildUsageResetFields(resetDecision.resetAt || inferredResetAt)
                : {};

            if (resetDecision.shouldReset) {
                currentUsage = 0;
            }

            if (currentUsage >= limit) {
                return {
                    exceeded: true as const,
                    plan,
                    currentUsage,
                    limit,
                };
            }

            const newUsage = currentUsage + 1;
            tx.update(userRef, {
                ...resetFields,
                aiCallUsage: newUsage,
                lastAiCallAt: new Date().toISOString(),
            });

            return {
                exceeded: false as const,
                plan,
                currentUsage: newUsage,
                limit,
            };
        });

        if (result.exceeded) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Usage limit exceeded",
                    plan: result.plan,
                    currentUsage: result.currentUsage,
                    limit: result.limit,
                },
                { status: 429 },
            );
        }

        return NextResponse.json({
            success: true,
            plan: result.plan,
            currentUsage: result.currentUsage,
            limit: result.limit,
            remaining: Math.max(0, result.limit - result.currentUsage),
        });
    } catch (error) {
        console.error("Error incrementing AI usage:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
