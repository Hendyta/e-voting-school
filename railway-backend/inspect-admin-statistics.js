const { db } = require("./firebase-admin");

async function printCollection(path) {
  console.log("\n================================");
  console.log(path);
  console.log("================================");

  const snapshot =
    await db.collection(path).get();

  if (snapshot.empty) {
    console.log("KOSONG");
    return;
  }

  snapshot.forEach((doc) => {
    console.log("\nID:", doc.id);
    console.log(doc.data());
  });
}

async function main() {
  await printCollection(
    "aggregates/election-2026/roles"
  );

  await printCollection(
    "aggregates/election-2026/gender"
  );

  await printCollection(
    "aggregates/election-2026/classes"
  );

  process.exit(0);
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});