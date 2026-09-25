const { db } = require("./firebase-admin");

async function main() {
  const electionId = "election-2026";

  const paths = [
    `aggregates/${electionId}/global/summary`,
    `aggregates/${electionId}/candidates/candidate-001`,
    `aggregates/${electionId}/candidates/candidate-002`,
    `aggregates/${electionId}/candidates/candidate-003`,
    `aggregates/${electionId}/roles/student`,
    `aggregates/${electionId}/gender/L`,
    `aggregates/${electionId}/classes/X.1`,
  ];

  for (const path of paths) {
    const doc = await db.doc(path).get();

    console.log(
      `${path} -> ${doc.exists ? "ADA" : "TIDAK ADA"}`
    );
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});