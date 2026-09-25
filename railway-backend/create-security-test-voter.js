require("dotenv").config({
  path: require("path").join(
    __dirname,
    "../functions/.env.local"
  ),
});

const crypto = require("crypto");
const { admin, db } = require("./firebase-admin");

const ELECTION_ID = "election-2026";

function generateRandomPart(length = 6) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex =
      crypto.randomInt(0, chars.length);

    result += chars[randomIndex];
  }

  return result;
}

function hashVoterCode(code) {
  const secret =
    process.env.VOTER_CODE_HMAC_SECRET;

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
  console.log("SECURITY TEST VOTER");
  console.log("==============================");

  // Baseline wajib 31 voter + 31 vote.
  const votersSnapshot =
    await db.collection("voters").get();

  const votesSnapshot = await db
    .collection("votes")
    .where("electionId", "==", ELECTION_ID)
    .get();

  if (
    votersSnapshot.size !== 31 ||
    votesSnapshot.size !== 31
  ) {
    throw new Error(
      "DIBATALKAN: baseline harus tepat 31 voter dan 31 vote."
    );
  }

  // Jangan membuat security-test voter kedua.
  const existingTestSnapshot = await db
    .collection("voters")
    .where("isSecurityTest", "==", true)
    .limit(1)
    .get();

  if (!existingTestSnapshot.empty) {
    throw new Error(
      "DIBATALKAN: security test voter sudah ada."
    );
  }

  let voterCode;
  let codeHash;

  while (true) {
    voterCode =
      `S-${generateRandomPart(6)}`;

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

  const voterRef =
    db.collection("voters").doc();

  const globalRef = db.doc(
    `aggregates/${ELECTION_ID}/global/summary`
  );

  const studentRef = db.doc(
    `aggregates/${ELECTION_ID}/roles/student`
  );

  const maleRef = db.doc(
    `aggregates/${ELECTION_ID}/gender/L`
  );

  const classRef = db.doc(
    `aggregates/${ELECTION_ID}/classes/X.2`
  );

  await db.runTransaction(
    async (transaction) => {
      const [
        globalDoc,
        studentDoc,
        maleDoc,
        classDoc,
      ] = await Promise.all([
        transaction.get(globalRef),
        transaction.get(studentRef),
        transaction.get(maleRef),
        transaction.get(classRef),
      ]);

      if (
        !globalDoc.exists ||
        !studentDoc.exists ||
        !maleDoc.exists ||
        !classDoc.exists
      ) {
        throw new Error(
          "Aggregate baseline tidak lengkap."
        );
      }

      transaction.set(voterRef, {
        codeHash,
        role: "student",
        class: "X.2",
        gender: "L",
        hasVoted: false,
        isActive: true,
        electionId: ELECTION_ID,
        isSecurityTest: true,
        createdAt:
          admin.firestore.FieldValue
            .serverTimestamp(),
      });

      const aggregates = [
        {
          ref: globalRef,
          data: globalDoc.data(),
        },
        {
          ref: studentRef,
          data: studentDoc.data(),
        },
        {
          ref: maleRef,
          data: maleDoc.data(),
        },
        {
          ref: classRef,
          data: classDoc.data(),
        },
      ];

      aggregates.forEach(({ ref, data }) => {
        const totalVoters =
          Number(data.totalVoters) + 1;

        const totalVoted =
          Number(data.totalVoted);

        const totalNotVoted =
          totalVoters - totalVoted;

        const participationRate =
          totalVoters > 0
            ? Number(
                (
                  (totalVoted /
                    totalVoters) *
                  100
                ).toFixed(2)
              )
            : 0;

        transaction.update(ref, {
          totalVoters,
          totalVoted,
          totalNotVoted,
          participationRate,
          updatedAt:
            admin.firestore.FieldValue
              .serverTimestamp(),
        });
      });
    }
  );

  console.log("");
  console.log(
    "SECURITY TEST VOTER BERHASIL DIBUAT"
  );
  console.log("Role   : student");
  console.log("Kelas  : X.2");
  console.log("Gender : L");
  console.log("");
  console.log("KODE LOGIN SECURITY TEST:");
  console.log(voterCode);
  console.log("");
  console.log(
    "RAHASIA: jangan kirim kode ini ke ChatGPT."
  );

  process.exit(0);
}

main().catch((error) => {
  console.error("");
  console.error("ERROR:", error.message);
  process.exit(1);
});