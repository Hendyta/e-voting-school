const { admin, db } = require("./firebase-admin");

async function main() {
  const ref = db
    .collection("aggregates")
    .doc("election-2026")
    .collection("classes")
    .doc("X.1");

  const existing = await ref.get();

  if (existing.exists) {
    console.log("AGGREGATE_X1_SUDAH_ADA");
    process.exit(0);
  }

  await ref.set({
    totalVoters: 1,
    totalVoted: 0,
    totalNotVoted: 1,
    participationRate: 0,
    updatedAt: admin.firestore.Timestamp.now(),
  });

  console.log("AGGREGATE_X1_BERHASIL_DIBUAT");
  process.exit(0);
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});