import { NextResponse } from "next/server";
import { getAuthUser } from "../../../../lib/auth";
import { getClient } from "../../../../lib/db";

export async function POST(req) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { items } = await req.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "No items" }, { status: 400 });
  }

  const client = await getClient();
  try {
    await client.query("BEGIN");
    const created = [];

    for (const item of items) {
      const title = String(item.title || "").trim();
      const phase = Number(item.phase);
      const level = Number(item.level);
      if (!title || !phase || !level) {
        throw new Error("Invalid item");
      }

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
        "INSERT INTO questions (user_id, question_id, title, phase, level, status) VALUES ($1, $2, $3, $4, $5, 'Pending') RETURNING id, question_id, title, phase, level, status, created_at, updated_at",
        [user.id, questionId, title, phase, level]
      );
      created.push(insertRes.rows[0]);
    }

    await client.query("COMMIT");
    return NextResponse.json({ questions: created });
  } catch (err) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Bulk create failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
