const { db } = require("./firebase-admin");

async function main() {
  const paths = [
    "aggregates/election-2026/global/summary",
    "aggregates/election-2026/roles/student",
    "aggregates/election-2026/gender/L",
    "aggregates/election-2026/classes/X.1",
    "aggregates/election-2026/candidates/candidate-003",
  ];

  for (const path of paths) {
    const doc = await db.doc(path).get();

    console.log("\n" + path);

    if (!doc.exists) {
      console.log("TIDAK ADA");
      continue;
    }

    const data = doc.data();

    console.log("totalVoters     :", data.totalVoters);
    console.log("totalVoted      :", data.totalVoted);
    console.log("totalNotVoted   :", data.totalNotVoted);
    console.log("participationRate:", data.participationRate);
    console.log("totalVotes      :", data.totalVotes);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});