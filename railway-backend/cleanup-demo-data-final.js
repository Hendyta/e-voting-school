const { db } = require("./firebase-admin");

const ELECTION_ID = "election-2026";

async function main() {
  console.log("==============================");
  console.log("CLEANUP DATA DEMO - FINAL");
  console.log("==============================");

  const batch = db.batch();
  let totalDeletes = 0;

  // -----------------------------
  // 1. VOTERS
  // -----------------------------
  const voters = await db
    .collection("voters")
    .where("electionId", "==", ELECTION_ID)
    .get();

  voters.forEach((doc) => {
    batch.delete(doc.ref);
    totalDeletes++;
  });

  // -----------------------------
  // 2. VOTES
  // -----------------------------
  const votes = await db
    .collection("votes")
    .where("electionId", "==", ELECTION_ID)
    .get();

  votes.forEach((doc) => {
    batch.delete(doc.ref);
    totalDeletes++;
  });

  // -----------------------------
  // 3. AGGREGATES
  // -----------------------------
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
      totalDeletes++;
    });
  }

  console.log("");
  console.log(
    "Total dokumen yang akan dihapus:",
    totalDeletes
  );

  if (totalDeletes !== 28) {
    throw new Error(
      `Cleanup dibatalkan. Diharapkan 28 dokumen, tetapi ditemukan ${totalDeletes}.`
    );
  }

  console.log("");
  console.log("Jumlah sesuai audit: 28");
  console.log("Memulai penghapusan...");

  await batch.commit();

  console.log("");
  console.log("CLEANUP_BERHASIL");
  console.log(`${totalDeletes} dokumen dihapus.`);

  console.log("");
  console.log("TIDAK DIHAPUS:");
  console.log("- candidates");
  console.log("- elections/election-2026");
  console.log("- akun Firebase Authentication");
  console.log("- akun admin");

  process.exit(0);
}

main().catch((error) => {
  console.error("");
  console.error("CLEANUP_GAGAL");
  console.error("ERROR:", error.message);
  process.exit(1);
});