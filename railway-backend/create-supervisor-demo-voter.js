require("dotenv").config({
  path: require("path").join(
    __dirname,
    "../functions/.env.local"
  ),
});

const crypto = require("crypto");
const { admin, db } = require("./firebase-admin");

const SECRET = process.env.VOTER_CODE_HMAC_SECRET;

if (!SECRET) {
  console.error("VOTER_CODE_HMAC_SECRET tidak ditemukan.");
  process.exit(1);
}

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "";

  for (let i = 0; i < 6; i++) {
    result += chars[
      crypto.randomInt(0, chars.length)
    ];
  }

  return `S-${result}`;
}

function hashCode(code) {
  return crypto
    .createHmac("sha256", SECRET)
    .update(code.trim().toUpperCase())
    .digest("hex");
}

async function main() {
  const code = randomCode();
  const codeHash = hashCode(code);

  const voterRef = db.collection("voters").doc();

  const globalRef =
    db.doc("aggregates/election-2026/global/summary");

  const studentRef =
    db.doc("aggregates/election-2026/roles/student");

  const genderPRef =
    db.doc("aggregates/election-2026/gender/P");

  const classRef =
    db.doc("aggregates/election-2026/classes/X.2");

  await db.runTransaction(async (transaction) => {
    const globalDoc = await transaction.get(globalRef);
    const studentDoc = await transaction.get(studentRef);
    const genderPDoc = await transaction.get(genderPRef);
    const classDoc = await transaction.get(classRef);

    if (
      !globalDoc.exists ||
      !studentDoc.exists ||
      !genderPDoc.exists
    ) {
      throw new Error(
        "Aggregate dasar tidak lengkap."
      );
    }

    const global = globalDoc.data();
    const student = studentDoc.data();
    const genderP = genderPDoc.data();

    const newGlobalTotal = global.totalVoters + 1;
    const newStudentTotal = student.totalVoters + 1;

    /*
     * gender/P masih mungkin mempunyai field format lama:
     * total / voted / notVoted.
     */
    const genderTotal =
      Number.isInteger(genderP.totalVoters)
        ? genderP.totalVoters
        : genderP.total;

    const genderVoted =
      Number.isInteger(genderP.totalVoted)
        ? genderP.totalVoted
        : genderP.voted;

    const genderNotVoted =
      Number.isInteger(genderP.totalNotVoted)
        ? genderP.totalNotVoted
        : genderP.notVoted;

    if (
      !Number.isInteger(genderTotal) ||
      !Number.isInteger(genderVoted) ||
      !Number.isInteger(genderNotVoted)
    ) {
      throw new Error(
        "Aggregate gender P tidak valid."
      );
    }

    const timestamp =
      admin.firestore.Timestamp.now();

    transaction.set(voterRef, {
      codeHash,
      role: "student",
      class: "X.2",
      gender: "P",
      hasVoted: false,
      isActive: true,
      electionId: "election-2026",
      createdAt: timestamp,
    });

    transaction.update(globalRef, {
      totalVoters: newGlobalTotal,
      totalNotVoted: global.totalNotVoted + 1,
      participationRate: Number(
        (
          (global.totalVoted / newGlobalTotal) *
          100
        ).toFixed(2)
      ),
      updatedAt: timestamp,
    });

    transaction.update(studentRef, {
      totalVoters: newStudentTotal,
      totalNotVoted: student.totalNotVoted + 1,
      participationRate: Number(
        (
          (student.totalVoted /
            newStudentTotal) *
          100
        ).toFixed(2)
      ),
      updatedAt: timestamp,
    });

    const newGenderTotal = genderTotal + 1;
    const newGenderNotVoted = genderNotVoted + 1;

    transaction.update(genderPRef, {
      totalVoters: newGenderTotal,
      totalVoted: genderVoted,
      totalNotVoted: newGenderNotVoted,
      participationRate: Number(
        (
          (genderVoted / newGenderTotal) *
          100
        ).toFixed(2)
      ),
      updatedAt: timestamp,
    });

    if (classDoc.exists) {
      const c = classDoc.data();

      transaction.update(classRef, {
        totalVoters: c.totalVoters + 1,
        totalNotVoted: c.totalNotVoted + 1,
        participationRate: Number(
          (
            (c.totalVoted /
              (c.totalVoters + 1)) *
            100
          ).toFixed(2)
        ),
        updatedAt: timestamp,
      });
    } else {
      transaction.set(classRef, {
        totalVoters: 1,
        totalVoted: 0,
        totalNotVoted: 1,
        participationRate: 0,
        updatedAt: timestamp,
      });
    }
  });

  console.log("");
  console.log(
    "DEMO_PEMBINA_BERHASIL_DIBUAT"
  );
  console.log("");
  console.log("KODE DEMO PEMBINA:");
  console.log(code);
  console.log("");
  console.log(
    "Simpan kode ini secara pribadi."
  );
  console.log(
    "Jangan kirim kode tersebut ke GitHub."
  );

  process.exit(0);
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});