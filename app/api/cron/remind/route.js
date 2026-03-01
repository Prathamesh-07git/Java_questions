import { NextResponse } from "next/server";
import { Resend } from "resend";
import { query } from "../../../../lib/db";

export const runtime = "nodejs";

export async function GET(req) {
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Secure the cron endpoint with a secret header
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Find all users who have unsolved Today questions
        const result = await query(`
      SELECT u.id, u.email, COUNT(q.id) as today_count,
             STRING_AGG(q.title, '||' ORDER BY q.question_id) as titles
      FROM users u
      INNER JOIN questions q ON q.user_id = u.id
      WHERE q.status = 'Today'
      GROUP BY u.id, u.email
    `);

        if (result.rowCount === 0) {
            return NextResponse.json({ message: "No users with Today questions", sent: 0 });
        }

        let sent = 0;
        const errors = [];

        for (const row of result.rows) {
            const titles = row.titles ? row.titles.split("||") : [];
            const count = parseInt(row.today_count);

            const questionList = titles
                .map((t, i) => `<li style="padding: 6px 0; border-bottom: 1px solid #2a2a3a;">${i + 1}. ${t}</li>`)
                .join("");

            const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:'Segoe UI',sans-serif;color:#e2e8f0;">
  <div style="max-width:560px;margin:40px auto;background:#131325;border-radius:16px;overflow:hidden;border:1px solid #1e1e3a;">
    
    <div style="background:linear-gradient(135deg,#6366f1,#a855f7);padding:32px 28px;">
      <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.5px;">⚡ Logic Master Tracker</div>
      <div style="color:rgba(255,255,255,0.8);margin-top:4px;font-size:14px;">Your Daily Practice Reminder</div>
    </div>
    
    <div style="padding:28px;">
      <h2 style="margin:0 0 8px 0;font-size:20px;color:#fff;">
        🔔 You have <span style="color:#f97316;">${count} question${count > 1 ? "s" : ""}</span> to solve today!
      </h2>
      <p style="color:#94a3b8;margin:0 0 20px 0;font-size:14px;">
        Don't break your streak — complete these questions before midnight!
      </p>
      
      <div style="background:#0d0d1a;border-radius:10px;padding:16px;margin-bottom:24px;">
        <div style="font-size:13px;font-weight:600;color:#6366f1;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">Today's Questions</div>
        <ul style="margin:0;padding-left:16px;color:#cbd5e1;font-size:14px;line-height:1.8;">
          ${questionList}
        </ul>
      </div>
      
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://java-questions.vercel.app"}/dashboard"
           style="display:inline-block;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
          🚀 Open Dashboard & Solve Now
        </a>
      </div>
      
      <div style="border-top:1px solid #1e1e3a;padding-top:16px;text-align:center;font-size:12px;color:#475569;">
        Logic Master Tracker — Before DSA Practice Tracker<br>
        You're getting this because you marked questions for today.
      </div>
    </div>
  </div>
</body>
</html>`;

            try {
                await resend.emails.send({
                    from: "Logic Master Tracker <onboarding@resend.dev>",
                    to: row.email,
                    subject: `⚡ ${count} question${count > 1 ? "s" : ""} pending today — Don't miss your practice!`,
                    html
                });
                sent++;
            } catch (e) {
                errors.push({ email: row.email, error: e.message });
            }
        }

        return NextResponse.json({ message: "Reminders sent", sent, errors });
    } catch (err) {
        console.error("Cron error:", err);
        return NextResponse.json({ error: "Cron failed", detail: err.message }, { status: 500 });
    }
}
