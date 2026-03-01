import { NextResponse } from "next/server";
import { getAuthUser } from "../../../../lib/auth";
import { query } from "../../../../lib/db";

export async function PATCH(req, { params }) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  try {
    const { title, status } = await req.json();
    if (!title && !status) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (title) {
      fields.push(`title = $${idx++}`);
      values.push(title);
    }
    if (status) {
      fields.push(`status = $${idx++}`);
      values.push(status);
    }

    fields.push(`updated_at = NOW()`);
    values.push(user.id);
    values.push(id);

    const sql = `UPDATE questions SET ${fields.join(", ")} WHERE user_id = $${idx++} AND id = $${idx++} RETURNING id, question_id, title, phase, level, status, created_at, updated_at`;
    const result = await query(sql, values);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = result.rows[0];

    if (status === "Completed") {
      await query(
        "INSERT INTO strike (user_id, day, question_id) VALUES ($1, CURRENT_DATE, $2) ON CONFLICT DO NOTHING",
        [user.id, updated.question_id]
      );
    }

    return NextResponse.json({ question: updated });
  } catch (err) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  const result = await query("DELETE FROM questions WHERE user_id = $1 AND id = $2", [user.id, id]);
  if (result.rowCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
