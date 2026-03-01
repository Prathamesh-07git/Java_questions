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

const questions = [
  { title: "Take a number and print whether it is positive, negative, or zero.", phase: 1, level: 1 },
  { title: "Check if a number is even or odd.", phase: 1, level: 1 },
  { title: "Check if a number is divisible by 5.", phase: 1, level: 1 },
  { title: "Check if a number is divisible by both 3 and 5.", phase: 1, level: 1 },
  { title: "Check if a given year is a leap year.", phase: 1, level: 1 },
  { title: "Take two numbers and print the larger one.", phase: 1, level: 1 },
  { title: "Take three numbers and print the largest.", phase: 1, level: 1 },
  { title: "Take a temperature value and print Cold, Warm, or Hot using range conditions.", phase: 1, level: 1 },
  { title: "Take a character and check if it is a vowel or consonant.", phase: 1, level: 1 },
  { title: "Take a character and check whether it is uppercase, lowercase, a digit, or a special character.", phase: 1, level: 1 },
  { title: "Take three sides and check if they form a valid triangle.", phase: 1, level: 2 },
  { title: "If valid, determine whether the triangle is equilateral, isosceles, or scalene.", phase: 1, level: 2 },
  { title: "Take marks (0-100) and print the corresponding grade (A/B/C/D/F).", phase: 1, level: 2 },
  { title: "Check if one of two given numbers is a multiple of the other.", phase: 1, level: 2 },
  { title: "Take the hour (0-23) and print Good Morning/Afternoon/Evening/Night.", phase: 1, level: 2 },
  { title: "Check voting eligibility for a given age (18+).", phase: 1, level: 2 },
  { title: "Take two numbers and determine whether both are even, both are odd, or mixed.", phase: 1, level: 2 },
  { title: "Check if an alphabet character lies between a-m or n-z.", phase: 1, level: 2 },
  { title: "Take a day number (1-7) and print the corresponding day name.", phase: 1, level: 2 },
  { title: "Take a month number (1-12) and print number of days (ignore leap years).", phase: 1, level: 2 },
  { title: "Take a 3-digit number and check if all digits are distinct.", phase: 1, level: 3 },
  { title: "Determine if the middle digit is largest, smallest, or neither.", phase: 1, level: 3 },
  { title: "Take a 4-digit number and check if the first and last digits are equal.", phase: 1, level: 3 },
  { title: "Check whether an integer is single-digit, double-digit, or multi-digit.", phase: 1, level: 3 },
  { title: "Check if a number is a multiple of 7 or ends with 7.", phase: 1, level: 3 },
  { title: "Take coordinates (x, y) and determine which quadrant the point lies in.", phase: 1, level: 3 },
  { title: "Check if an amount can be evenly divided into 2000, 500, and 100 notes.", phase: 1, level: 3 },
  { title: "Check if a number lies within the range [100, 999].", phase: 1, level: 3 },
  { title: "Take two angles of a triangle and compute the third angle.", phase: 1, level: 3 },
  { title: "Check whether a number is a perfect square without using sqrt.", phase: 1, level: 3 },
  { title: "Take a character and check if it is a letter, a digit, or neither.", phase: 1, level: 4 },
  { title: "Print Fizz/Buzz/FizzBuzz based on divisibility by 3 and 5.", phase: 1, level: 4 },
  { title: "Take three numbers and print the median value.", phase: 1, level: 4 },
  { title: "Take 24-hour time and print whether it is AM or PM.", phase: 1, level: 4 },
  { title: "Take income and age and check tax eligibility (age > 18 and income > 5L).", phase: 1, level: 4 },
  { title: "Check if both numbers are positive and their sum is less than 100.", phase: 1, level: 4 },
  { title: "Take a digit (0-9) and print its word form.", phase: 1, level: 4 },
  { title: "Take a weekday number (1-7) and determine weekday or weekend.", phase: 1, level: 4 },
  { title: "Calculate electricity bill as per slabs using if-else.", phase: 1, level: 4 },
  { title: "Check password rules: length >= 8 and contains at least one digit.", phase: 1, level: 4 },
  { title: "Check if point lies on X-axis, Y-axis, or origin.", phase: 1, level: 5 },
  { title: "Check if three numbers form a Pythagorean triplet.", phase: 1, level: 5 },
  { title: "Check if day and month form a valid date (ignore leap years).", phase: 1, level: 5 },
  { title: "Compute smaller angle between hour and minute hands.", phase: 1, level: 5 },
  { title: "Check if three numbers are in arithmetic progression.", phase: 1, level: 5 },
  { title: "Check if three numbers are in geometric progression.", phase: 1, level: 5 },
  { title: "Check if sum of first and last digit equals middle digit (3-digit).", phase: 1, level: 5 },
  { title: "Check if sum of digits is greater than product of digits (1-9999).", phase: 1, level: 5 },
  { title: "Take two dates and determine which comes first in the calendar.", phase: 1, level: 5 },
  { title: "Take a year and print the corresponding century.", phase: 1, level: 5 }
];

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

    const counterMap = {};
    for (const q of questions) {
      const key = `${q.phase}-${q.level}`;
      const next = (counterMap[key] || 0) + 1;
      counterMap[key] = next;
      const qid = `P${q.phase}-L${q.level}-Q${String(next).padStart(2, "0")}`;
      await client.query(
        "INSERT INTO questions (user_id, question_id, title, phase, level, status) VALUES ($1, $2, $3, $4, $5, 'Pending')",
        [userId, qid, q.title, q.phase, q.level]
      );
    }

    for (const key of Object.keys(counterMap)) {
      const [phase, level] = key.split("-").map(Number);
      const last = counterMap[key];
      await client.query(
        "INSERT INTO counters (user_id, phase, level, last_number) VALUES ($1, $2, $3, $4)",
        [userId, phase, level, last]
      );
    }

    await client.query("COMMIT");
    console.log(`Imported ${questions.length} questions for ${email}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
