const { db } = require("./firebase-admin");

async function main() {
  const doc = await db
    .collection("elections")
    .doc("election-2026")
    .get();

  if (!doc.exists) {
    console.log("ELECTION_TIDAK_ADA");
    process.exit(0);
  }

  const data = doc.data();

  console.log("status :", data.status);

  console.log(
    "startAt:",
    data.startAt?.toDate
      ? data.startAt.toDate().toString()
      : data.startAt
  );

  console.log(
    "endAt  :",
    data.endAt?.toDate
      ? data.endAt.toDate().toString()
      : data.endAt
  );

  process.exit(0);
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});