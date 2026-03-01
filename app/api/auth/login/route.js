import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "../../../../lib/db";
import { signToken, setAuthCookie } from "../../../../lib/auth";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const emailNorm = String(email || "").trim().toLowerCase();
    const passwordNorm = String(password || "");
    if (!emailNorm || !passwordNorm) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const result = await query("SELECT id, email, password_hash FROM users WHERE LOWER(TRIM(email)) = $1", [emailNorm]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(passwordNorm, user.password_hash);
    if (!match) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = signToken({ id: user.id, email: user.email });
    setAuthCookie(token);

    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
