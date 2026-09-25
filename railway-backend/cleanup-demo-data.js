const { db } = require("./firebase-admin");

const ELECTION_ID = "election-2026";

async function main() {
  console.log("==============================");
  console.log("CLEANUP DATA DEMO - DRY RUN");
  console.log("==============================");

  const detail = {};

  const voters = await db
    .collection("voters")
    .where("electionId", "==", ELECTION_ID)
    .get();

  detail.voters = voters.size;

  const votes = await db
    .collection("votes")
    .where("electionId", "==", ELECTION_ID)
    .get();

  detail.votes = votes.size;

  const aggregateRoot = db
    .collection("aggregates")
    .doc(ELECTION_ID);

  const subcollections = [
    "global",
    "roles",
    "gender",
    "classes",
    "candidates",
  ];

  for (const name of subcollections) {
    const snapshot = await aggregateRoot
      .collection(name)
      .get();

    detail[name] = snapshot.size;
  }

  console.log("");
  console.log("Voters              :", detail.voters);
  console.log("Votes               :", detail.votes);
  console.log("Aggregate global    :", detail.global);
  console.log("Aggregate roles     :", detail.roles);
  console.log("Aggregate gender    :", detail.gender);
  console.log("Aggregate classes   :", detail.classes);
  console.log(
    "Aggregate candidates:",
    detail.candidates
  );

  const total =
    detail.voters +
    detail.votes +
    detail.global +
    detail.roles +
    detail.gender +
    detail.classes +
    detail.candidates;

  console.log("");
  console.log("TOTAL AKAN DIHAPUS :", total);

  console.log("");
  console.log("Kandidat utama     : TIDAK DIHAPUS");
  console.log("Election           : TIDAK DIHAPUS");
  console.log("Akun admin         : TIDAK DIHAPUS");

  console.log("");
  console.log("MODE: DRY RUN");
  console.log("BELUM ADA DATA YANG DIHAPUS.");

  process.exit(0);
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});