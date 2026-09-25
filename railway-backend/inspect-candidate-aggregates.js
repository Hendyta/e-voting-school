const { db } = require("./firebase-admin");

const ELECTION_ID = "election-2026";

async function main() {
  console.log("==============================");
  console.log("AUDIT AGGREGATE KANDIDAT");
  console.log("==============================");

  const snapshot = await db
    .collection("aggregates")
    .doc(ELECTION_ID)
    .collection("candidates")
    .get();

  console.log("");
  console.log(
    "Jumlah dokumen kandidat:",
    snapshot.size
  );

  if (snapshot.empty) {
    console.log("");
    console.log(
      "PERINGATAN: aggregate kandidat kosong."
    );

    process.exit(0);
  }

  snapshot.forEach((doc) => {
    console.log("");
    console.log("ID:", doc.id);
    console.log(doc.data());
  });

  process.exit(0);
}

main().catch((error) => {
  console.error("");
  console.error("AUDIT_GAGAL");
  console.error("ERROR:", error.message);
  process.exit(1);
});