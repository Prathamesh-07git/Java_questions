import { NextResponse } from "next/server";
import { getAuthUser } from "../../../lib/auth";
import { getClient } from "../../../lib/db";
import { seedQuestionsForUser } from "../../../lib/seed";

export async function POST(req) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mode } = await req.json().catch(() => ({}));
  const empty = mode === "empty";

  const client = await getClient();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM strike WHERE user_id = $1", [user.id]);
    await client.query("DELETE FROM questions WHERE user_id = $1", [user.id]);
    await client.query("DELETE FROM counters WHERE user_id = $1", [user.id]);
    if (!empty) {
      await seedQuestionsForUser(client, user.id);
    }
    await client.query("COMMIT");

    return NextResponse.json({ ok: true, empty });
  } catch (err) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
