import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getClient } from "../../../../lib/db";
import { signToken, setAuthCookieOnResponse } from "../../../../lib/auth";

export async function POST(req) {
  let client;
  try {
    client = await getClient();
    const { email, password } = await req.json();
    const emailNorm = String(email || "").trim().toLowerCase();
    const passwordNorm = String(password || "");
    if (!emailNorm || !passwordNorm) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    await client.query("BEGIN");

    const existing = await client.query("SELECT id FROM users WHERE LOWER(TRIM(email)) = $1", [emailNorm]);
    if (existing.rowCount > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(passwordNorm, 8);
    const result = await client.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [emailNorm, passwordHash]
    );

    const user = result.rows[0];
    await client.query("COMMIT");

    const token = signToken({ id: user.id, email: user.email });
    const response = NextResponse.json({ user });
    return setAuthCookieOnResponse(response, token);
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("Register error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
