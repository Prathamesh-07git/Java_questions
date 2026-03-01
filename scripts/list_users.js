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

(async () => {
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const res = await client.query("SELECT email FROM users ORDER BY created_at DESC");
    if (res.rows.length === 0) {
      console.log("No users");
    } else {
      console.log(res.rows.map((r) => r.email).join("\n"));
    }
  } finally {
    await client.end();
  }
})();
