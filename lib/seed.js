export const demoQuestions = [
  { title: "If else ladder decision tree", phase: 1, level: 1, status: "Pending" },
  { title: "Max of three with conditions", phase: 1, level: 1, status: "Completed" },
  { title: "Number sign classifier", phase: 1, level: 2, status: "Easy" },
  { title: "Leap year rules", phase: 1, level: 2, status: "Hard" },
  { title: "Grade evaluator", phase: 1, level: 3, status: "Pending" },

  { title: "Star pyramid pattern", phase: 2, level: 1, status: "Pending" },
  { title: "Number triangle", phase: 2, level: 1, status: "Completed" },
  { title: "Hollow rectangle", phase: 2, level: 2, status: "Easy" },
  { title: "Floyd triangle variant", phase: 2, level: 3, status: "Pending" },
  { title: "Diamond pattern", phase: 2, level: 4, status: "Hard" },

  { title: "Factorial recursion", phase: 3, level: 1, status: "Completed" },
  { title: "Sum of digits recursion", phase: 3, level: 2, status: "Easy" },
  { title: "Fibonacci recursion", phase: 3, level: 3, status: "Hard" },
  { title: "Power function recursion", phase: 3, level: 2, status: "Pending" },
  { title: "GCD recursion", phase: 3, level: 4, status: "Pending" },

  { title: "Reverse array", phase: 4, level: 1, status: "Pending" },
  { title: "Find max in array", phase: 4, level: 1, status: "Completed" },
  { title: "Rotate array", phase: 4, level: 2, status: "Easy" },
  { title: "Count occurrences", phase: 4, level: 2, status: "Hard" },
  { title: "Second largest", phase: 4, level: 3, status: "Pending" },

  { title: "Check palindrome", phase: 5, level: 1, status: "Completed" },
  { title: "Count vowels", phase: 5, level: 1, status: "Easy" },
  { title: "String compression", phase: 5, level: 3, status: "Hard" },
  { title: "Remove duplicates", phase: 5, level: 2, status: "Pending" },
  { title: "Anagram checker", phase: 5, level: 3, status: "Pending" },

  { title: "Mixed number puzzle", phase: 6, level: 1, status: "Pending" },
  { title: "Clock angle logic", phase: 6, level: 2, status: "Hard" },
  { title: "Minimum steps", phase: 6, level: 3, status: "Pending" },
  { title: "Greedy coin logic", phase: 6, level: 4, status: "Completed" },
  { title: "Logical maze", phase: 6, level: 5, status: "Easy" }
];

export async function seedQuestionsForUser(client, userId) {
  const counterMap = {};

  for (const q of demoQuestions) {
    const key = `${q.phase}-${q.level}`;
    const next = (counterMap[key] || 0) + 1;
    counterMap[key] = next;
    const questionId = `P${q.phase}-L${q.level}-Q${String(next).padStart(2, "0")}`;

    await client.query(
      "INSERT INTO questions (user_id, question_id, title, phase, level, status) VALUES ($1, $2, $3, $4, $5, $6)",
      [userId, questionId, q.title, q.phase, q.level, q.status]
    );
  }

  for (const key of Object.keys(counterMap)) {
    const [phase, level] = key.split("-").map(Number);
    const last = counterMap[key];
    await client.query(
      "INSERT INTO counters (user_id, phase, level, last_number) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, phase, level) DO UPDATE SET last_number = EXCLUDED.last_number",
      [userId, phase, level, last]
    );
  }
}
