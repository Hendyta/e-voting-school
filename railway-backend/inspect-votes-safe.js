const { db } = require("./firebase-admin");

async function main() {
  const snapshot = await db
    .collection("votes")
    .where(
      "electionId",
      "==",
      "election-2026"
    )
    .get();

  console.log("==============================");
  console.log("AUDIT VOTES");
  console.log("==============================");

  console.log(
    "Total dokumen vote:",
    snapshot.size
  );

  const candidates = {};

  snapshot.forEach((doc) => {
    const data = doc.data();

    const candidateId =
      data.candidateId ?? "TIDAK_ADA";

    candidates[candidateId] =
      (candidates[candidateId] || 0) + 1;
  });

  console.log("");
  console.log("PER KANDIDAT:");

  Object.entries(candidates)
    .sort()
    .forEach(([candidateId, total]) => {
      console.log(
        `${candidateId}: ${total}`
      );
    });

  console.log("");
  console.log(
    "Tidak menampilkan ID vote atau data voter."
  );

  process.exit(0);
}

main().catch((error) => {
  console.error(
    "ERROR:",
    error.message
  );

  process.exit(1);
});