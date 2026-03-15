import { NextResponse } from "next/server";
import { getAuthUser } from "../../../lib/auth";
import { getClient, query } from "../../../lib/db";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await query(
    "SELECT id, question_id, title, phase, level, status, is_hard, solve_count, created_at, updated_at FROM questions WHERE user_id = $1 ORDER BY created_at DESC",
    [user.id]
  );

  return NextResponse.json({ questions: result.rows });
}

export async function POST(req) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, phase, level } = await req.json();
    if (!title || !phase || !level) {
      return NextResponse.json({ error: "Title, phase, and level required" }, { status: 400 });
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");
      const counterRes = await client.query(
        "SELECT last_number FROM counters WHERE user_id = $1 AND phase = $2 AND level = $3 FOR UPDATE",
        [user.id, phase, level]
      );

      let nextNumber = 1;
      if (counterRes.rowCount > 0) {
        nextNumber = counterRes.rows[0].last_number + 1;
        await client.query(
          "UPDATE counters SET last_number = $1 WHERE user_id = $2 AND phase = $3 AND level = $4",
          [nextNumber, user.id, phase, level]
        );
      } else {
        await client.query(
          "INSERT INTO counters (user_id, phase, level, last_number) VALUES ($1, $2, $3, $4)",
          [user.id, phase, level, nextNumber]
        );
      }

      const questionId = `P${phase}-L${level}-Q${String(nextNumber).padStart(2, "0")}`;

      const insertRes = await client.query(
        "INSERT INTO questions (user_id, question_id, title, phase, level, status) VALUES ($1, $2, $3, $4, $5, 'Pending') RETURNING id, question_id, title, phase, level, status, is_hard, created_at, updated_at",
        [user.id, questionId, title, phase, level]
      );

      await client.query("COMMIT");

      return NextResponse.json({ question: insertRes.rows[0] });
    } catch (err) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Create failed" }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (err) {
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
