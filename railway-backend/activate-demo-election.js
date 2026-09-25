const {
  admin,
  db,
} = require("./firebase-admin");

const ELECTION_ID = "election-2026";

async function main() {
  const now = new Date();

  const startAt = new Date(
    now.getTime() - 10 * 60 * 1000
  );

  const endAt = new Date(
    now.getTime() + 6 * 60 * 60 * 1000
  );

  await db
    .collection("elections")
    .doc(ELECTION_ID)
    .update({
      status: "active",

      startAt:
        admin.firestore.Timestamp.fromDate(
          startAt
        ),

      endAt:
        admin.firestore.Timestamp.fromDate(
          endAt
        ),
    });

  console.log("==============================");
  console.log("DEMO ELECTION DIAKTIFKAN");
  console.log("==============================");
  console.log("Status : active");
  console.log(
    "Mulai  :",
    startAt.toLocaleString("id-ID")
  );
  console.log(
    "Selesai:",
    endAt.toLocaleString("id-ID")
  );
  console.log("");
  console.log(
    "Election aktif sementara selama 6 jam."
  );

  process.exit(0);
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});