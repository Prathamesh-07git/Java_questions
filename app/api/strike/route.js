import { NextResponse } from "next/server";
import { getAuthUser } from "../../../lib/auth";
import { query } from "../../../lib/db";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayRes = await query(
    "SELECT question_id FROM strike WHERE user_id = $1 AND day = CURRENT_DATE ORDER BY created_at DESC",
    [user.id]
  );

  const heatmapRes = await query(
    "SELECT TO_CHAR(day, 'YYYY-MM-DD') as day, COUNT(*)::int AS count FROM strike WHERE user_id = $1 GROUP BY day",
    [user.id]
  );

  return NextResponse.json({
    ids: todayRes.rows.map((r) => r.question_id),
    heatmap: heatmapRes.rows
  });
}
