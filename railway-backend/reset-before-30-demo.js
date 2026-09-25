const { db } = require("./firebase-admin");

const ELECTION_ID = "election-2026";

async function main() {
  console.log("==============================");
  console.log("RESET SEBELUM DEMO 30 PESERTA");
  console.log("==============================");

  const batch = db.batch();

  let voterCount = 0;
  let voteCount = 0;
  let aggregateCount = 0;

  // VOTERS
  const voters = await db
    .collection("voters")
    .where("electionId", "==", ELECTION_ID)
    .get();

  voters.forEach((doc) => {
    batch.delete(doc.ref);
    voterCount++;
  });

  // VOTES
  const votes = await db
    .collection("votes")
    .where("electionId", "==", ELECTION_ID)
    .get();

  votes.forEach((doc) => {
    batch.delete(doc.ref);
    voteCount++;
  });

  // AGGREGATES
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

    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
      aggregateCount++;
    });
  }

  console.log("");
  console.log("Voters akan dihapus    :", voterCount);
  console.log("Votes akan dihapus     :", voteCount);
  console.log(
    "Aggregates akan dihapus:",
    aggregateCount
  );

  console.log(
    "TOTAL                 :",
    voterCount + voteCount + aggregateCount
  );

  // Kondisi aman sebelum membuat ulang baseline demo:
  // 30 voter, 0 vote, dan 15 dokumen aggregate.
  if (
    voterCount !== 30 ||
    voteCount !== 0 ||
    aggregateCount !== 15
  ) {
    throw new Error(
      "RESET DIBATALKAN. Kondisi database tidak sesuai baseline demo 30 peserta."
    );
  }

  console.log("");
  console.log(
    "Kondisi baseline sesuai. Memulai reset..."
  );

  await batch.commit();

  console.log("");
  console.log("RESET_BERHASIL");
  console.log("Voters demo     : 0");
  console.log("Votes demo      : 0");
  console.log("Aggregates demo : 0");

  console.log("");
  console.log("TIDAK DIHAPUS:");
  console.log("- candidates");
  console.log("- elections/election-2026");
  console.log("- akun admin");

  process.exit(0);
}

main().catch((error) => {
  console.error("");
  console.error("RESET_GAGAL");
  console.error("ERROR:", error.message);
  process.exit(1);
});