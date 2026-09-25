const {
  admin,
  db,
} = require("./firebase-admin");

const ELECTION_ID = "election-2026";

async function main() {
  console.log("==============================");
  console.log("RESTORE JADWAL RESMI");
  console.log("==============================");

  // 30 September 2026
  // 08:00 - 12:00 WITA
  // WITA = UTC+8

  const startAt = new Date(
    "2026-09-30T08:00:00+08:00"
  );

  const endAt = new Date(
    "2026-09-30T12:00:00+08:00"
  );
  await db
    .collection("elections")
    .doc(ELECTION_ID)
    .update({
      status: "scheduled",

      startAt:
        admin.firestore.Timestamp.fromDate(
          startAt
        ),

      endAt:
        admin.firestore.Timestamp.fromDate(
          endAt
        ),
    });

  console.log("");
  console.log("RESTORE_BERHASIL");
  console.log("Status  : scheduled");
  console.log(
    "Mulai   : 30 September 2026 08:00 WITA"
  );
  console.log(
    "Selesai : 30 September 2026 12:00 WITA"
  );

  process.exit(0);
}

main().catch((error) => {
  console.error("");
  console.error("RESTORE_GAGAL");
  console.error("ERROR:", error.message);
  process.exit(1);
});