const { db } = require("./firebase-admin");

async function main() {
  const snapshot = await db
    .collection("candidates")
    .get();

  console.log("\n==============================");
  console.log("DATA KANDIDAT");
  console.log("==============================");

  if (snapshot.empty) {
    console.log("TIDAK ADA KANDIDAT");
    process.exit(0);
  }

  snapshot.forEach((doc) => {
    console.log("\nID:", doc.id);
    console.log(doc.data());
  });

  process.exit(0);
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});