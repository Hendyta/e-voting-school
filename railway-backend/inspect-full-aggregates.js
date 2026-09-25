const { db } = require("./firebase-admin");

async function main() {
  const paths = [
    // GLOBAL
    "aggregates/election-2026/global/summary",

    // ROLE
    "aggregates/election-2026/roles/student",
    "aggregates/election-2026/roles/teacher",

    // GENDER
    "aggregates/election-2026/gender/L",
    "aggregates/election-2026/gender/P",

    // KELAS
    "aggregates/election-2026/classes/X.1",
    "aggregates/election-2026/classes/X.2",
    "aggregates/election-2026/classes/XI.1",
    "aggregates/election-2026/classes/XI.2",
    "aggregates/election-2026/classes/XII.1",
    "aggregates/election-2026/classes/XII.2",

    // KANDIDAT
    "aggregates/election-2026/candidates/candidate-001",
    "aggregates/election-2026/candidates/candidate-002",
    "aggregates/election-2026/candidates/candidate-003",
  ];

  for (const path of paths) {
    const doc = await db.doc(path).get();

    console.log("\n================================");
    console.log(path);
    console.log("================================");

    if (!doc.exists) {
      console.log("TIDAK ADA");
      continue;
    }

    console.log(doc.data());
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});