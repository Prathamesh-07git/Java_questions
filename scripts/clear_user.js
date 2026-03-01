const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const envPath = path.join(process.cwd(), ".env.local");
const env = fs.readFileSync(envPath, "utf8");
const match = env.match(/DATABASE_URL="([^"]+)"/);
if (!match) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}
const url = match[1];
const email = "topg45330@gmail.com";

(async () => {
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query("BEGIN");
    const u = await client.query("SELECT id FROM users WHERE email = $1", [email]);
    if (u.rowCount === 0) throw new Error("User not found: " + email);
    const userId = u.rows[0].id;
    await client.query("DELETE FROM strike WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM questions WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM counters WHERE user_id = $1", [userId]);
    await client.query("COMMIT");
    console.log(`Cleared all data for ${email}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
