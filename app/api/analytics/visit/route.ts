export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/adminAuth";

const db = admin.firestore();

function getDateKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const page = String(body?.page || "/").slice(0, 200);
        const dateKey = getDateKey();
        const docRef = db.collection("analyticsDaily").doc(dateKey);

        await db.runTransaction(async (tx) => {
            const snap = await tx.get(docRef);
            const prev = snap.exists ? snap.data() : {};
            const pageViews = (prev?.pageViews ?? {}) as Record<string, number>;
            const nextPageViews = {
                ...pageViews,
                [page]: (pageViews[page] || 0) + 1,
            };

            tx.set(
                docRef,
                {
                    date: dateKey,
                    visitors: (prev?.visitors || 0) + 1,
                    pageViews: nextPageViews,
                    updatedAt: Date.now(),
                },
                { merge: true },
            );
        });

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false, skipped: true });
    }
}
