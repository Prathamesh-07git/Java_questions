import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";

export const runtime = "nodejs";

// This cron runs at midnight IST (18:30 UTC) every day.
// It resets any questions still marked as "Today" (not solved) back to "Pending".
export async function GET(req) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Reset questions that are still "Today" — user didn't solve them before midnight
        const result = await query(
            `UPDATE questions SET status = 'Pending', updated_at = NOW()
       WHERE status = 'Today'
       RETURNING question_id`
        );

        return NextResponse.json({
            message: "Daily reset complete",
            reset: result.rowCount,
            ids: result.rows.map((r) => r.question_id)
        });
    } catch (err) {
        console.error("Midnight reset error:", err);
        return NextResponse.json({ error: "Reset failed" }, { status: 500 });
    }
}
