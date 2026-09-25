const { admin, db } = require("./firebase-admin");

async function main() {
  const timestamp = admin.firestore.Timestamp.now();

  const globalRef = db.doc(
    "aggregates/election-2026/global/summary"
  );

  const studentRef = db.doc(
    "aggregates/election-2026/roles/student"
  );

  const genderLRef = db.doc(
    "aggregates/election-2026/gender/L"
  );

  await db.runTransaction(async (transaction) => {
    const globalDoc = await transaction.get(globalRef);
    const studentDoc = await transaction.get(studentRef);
    const genderLDoc = await transaction.get(genderLRef);

    if (
      !globalDoc.exists ||
      !studentDoc.exists ||
      !genderLDoc.exists
    ) {
      throw new Error(
        "Aggregate dasar tidak lengkap."
      );
    }

    const global = globalDoc.data();
    const student = studentDoc.data();
    const genderL = genderLDoc.data();

    // Hanya izinkan baseline dummy lama yang sudah kita periksa.
    if (
      global.totalVoters !== 8 ||
      global.totalVoted !== 3 ||
      global.totalNotVoted !== 5
    ) {
      throw new Error(
        "Baseline global berubah. Operasi dibatalkan."
      );
    }

    if (
      student.total !== 6 ||
      student.voted !== 2 ||
      student.notVoted !== 4
    ) {
      throw new Error(
        "Baseline student berubah. Operasi dibatalkan."
      );
    }

    if (
      genderL.total !== 4 ||
      genderL.voted !== 3 ||
      genderL.notVoted !== 1
    ) {
      throw new Error(
        "Baseline gender L berubah. Operasi dibatalkan."
      );
    }

    transaction.update(globalRef, {
      totalVoters: 9,
      totalVoted: 3,
      totalNotVoted: 6,
      participationRate: 33.33,
      updatedAt: timestamp,
    });

    transaction.update(studentRef, {
      totalVoters: 7,
      totalVoted: 2,
      totalNotVoted: 5,
      participationRate: 28.57,
      updatedAt: timestamp,
    });

    transaction.update(genderLRef, {
      totalVoters: 5,
      totalVoted: 3,
      totalNotVoted: 2,
      participationRate: 60,
      updatedAt: timestamp,
    });
  });

  console.log(
    "BASELINE_DEMO_BERHASIL_DISINKRONKAN"
  );

  process.exit(0);
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});