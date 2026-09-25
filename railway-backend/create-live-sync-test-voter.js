require("dotenv").config({
  path: require("path").join(__dirname, "../functions/.env.local"),
});

const crypto = require("crypto");
const { admin, db } = require("./firebase-admin");

const ELECTION_ID = "election-2026";

function generateRandomPart(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    result += chars[randomIndex];
  }

  return result;
}

function hashVoterCode(code) {
  const secret = process.env.VOTER_CODE_HMAC_SECRET;

  if (!secret) {
    throw new Error(
      "VOTER_CODE_HMAC_SECRET belum tersedia."
    );
  }

  return crypto
    .createHmac("sha256", secret)
    .update(code.trim().toUpperCase())
    .digest("hex");
}

async function main() {
  console.log("==============================");
  console.log("LIVE SYNC TEST VOTER");
  console.log("==============================");

  // ----------------------------------------
  // SAFETY CHECK
  // ----------------------------------------

  const votersSnapshot = await db
    .collection("voters")
    .get();

  const votesSnapshot = await db
    .collection("votes")
    .where("electionId", "==", ELECTION_ID)
    .get();

  if (
    votersSnapshot.size !== 30 ||
    votesSnapshot.size !== 30
  ) {
    throw new Error(
      "DIBATALKAN: baseline harus tepat 30 voter dan 30 vote."
    );
  }

  const existingTestSnapshot = await db
    .collection("voters")
    .where("isLiveSyncTest", "==", true)
    .limit(1)
    .get();

  if (!existingTestSnapshot.empty) {
    throw new Error(
      "DIBATALKAN: live sync test voter sudah pernah dibuat."
    );
  }

  // ----------------------------------------
  // GENERATE UNIQUE VOTER CODE
  // ----------------------------------------

  let voterCode;
  let codeHash;

  while (true) {
    voterCode = `S-${generateRandomPart(6)}`;
    codeHash = hashVoterCode(voterCode);

    const duplicateSnapshot = await db
      .collection("voters")
      .where("codeHash", "==", codeHash)
      .limit(1)
      .get();

    if (duplicateSnapshot.empty) {
      break;
    }
  }

  // ID acak Firestore.
  const voterRef = db.collection("voters").doc();

  const globalRef = db.doc(
    `aggregates/${ELECTION_ID}/global/summary`
  );

  const studentRef = db.doc(
    `aggregates/${ELECTION_ID}/roles/student`
  );

  const femaleRef = db.doc(
    `aggregates/${ELECTION_ID}/gender/P`
  );

  const classRef = db.doc(
    `aggregates/${ELECTION_ID}/classes/X.1`
  );

  // ----------------------------------------
  // ATOMIC TRANSACTION
  // ----------------------------------------

  await db.runTransaction(async (transaction) => {
    const [
      globalDoc,
      studentDoc,
      femaleDoc,
      classDoc,
    ] = await Promise.all([
      transaction.get(globalRef),
      transaction.get(studentRef),
      transaction.get(femaleRef),
      transaction.get(classRef),
    ]);

    if (
      !globalDoc.exists ||
      !studentDoc.exists ||
      !femaleDoc.exists ||
      !classDoc.exists
    ) {
      throw new Error(
        "Aggregate baseline tidak lengkap. Operasi dibatalkan."
      );
    }

    transaction.set(voterRef, {
      codeHash,
      role: "student",
      class: "X.1",
      gender: "P",
      hasVoted: false,
      isActive: true,
      electionId: ELECTION_ID,

      // Penanda khusus supaya mudah dibersihkan nanti.
      isLiveSyncTest: true,

      createdAt:
        admin.firestore.FieldValue.serverTimestamp(),
    });

    const aggregateRefs = [
      {
        ref: globalRef,
        data: globalDoc.data(),
      },
      {
        ref: studentRef,
        data: studentDoc.data(),
      },
      {
        ref: femaleRef,
        data: femaleDoc.data(),
      },
      {
        ref: classRef,
        data: classDoc.data(),
      },
    ];

    aggregateRefs.forEach(({ ref, data }) => {
      const newTotalVoters =
        (data.totalVoters || 0) + 1;

      const totalVoted =
        data.totalVoted || 0;

      const newTotalNotVoted =
        newTotalVoters - totalVoted;

      const newParticipationRate =
        newTotalVoters > 0
          ? (totalVoted / newTotalVoters) * 100
          : 0;

      transaction.update(ref, {
        totalVoters: newTotalVoters,
        totalVoted,
        totalNotVoted: newTotalNotVoted,
        participationRate: newParticipationRate,
        updatedAt:
          admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  });

  console.log("");
  console.log("LIVE SYNC TEST VOTER BERHASIL DIBUAT");
  console.log("--------------------------------");
  console.log("Role   : student");
  console.log("Kelas  : X.1");
  console.log("Gender : P");
  console.log("");
  console.log("KODE LOGIN TEST:");
  console.log(voterCode);
  console.log("");
  console.log(
    "Simpan kode ini hanya untuk pengujian live sync."
  );

  process.exit(0);
}

main().catch((error) => {
  console.error("");
  console.error("ERROR:", error.message);
  process.exit(1);
});