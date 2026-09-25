require("dotenv").config({
  path: require("path").join(
    __dirname,
    "../functions/.env.local"
  ),
});

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const {
  admin,
  db,
} = require("./firebase-admin");

const ELECTION_ID = "election-2026";

const SECRET =
  process.env.VOTER_CODE_HMAC_SECRET;

if (!SECRET) {
  console.error(
    "VOTER_CODE_HMAC_SECRET tidak ditemukan."
  );
  process.exit(1);
}

function generateCode(prefix) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let value = "";

  for (let i = 0; i < 6; i++) {
    value +=
      chars[
        crypto.randomInt(
          0,
          chars.length
        )
      ];
  }

  return `${prefix}-${value}`;
}

function hashCode(code) {
  return crypto
    .createHmac("sha256", SECRET)
    .update(code.trim().toUpperCase())
    .digest("hex");
}

function makeAggregate(total) {
  return {
    totalVoters: total,
    totalVoted: 0,
    totalNotVoted: total,
    participationRate: 0,
    updatedAt:
      admin.firestore.Timestamp.now(),
  };
}

async function main() {
  console.log("==============================");
  console.log("BASELINE DEMO 30 PESERTA");
  console.log("==============================");

  // --------------------------
  // SAFETY CHECK
  // --------------------------

  const existingVoters = await db
    .collection("voters")
    .where("electionId", "==", ELECTION_ID)
    .get();

  const existingVotes = await db
    .collection("votes")
    .where("electionId", "==", ELECTION_ID)
    .get();

  if (
    !existingVoters.empty ||
    !existingVotes.empty
  ) {
    throw new Error(
      "Pembuatan dibatalkan. Voters/votes belum kosong."
    );
  }

  // --------------------------
  // KOMPOSISI 30 PESERTA
  // --------------------------

  const participants = [];

  function addStudent(
    className,
    gender,
    amount
  ) {
    for (let i = 0; i < amount; i++) {
      participants.push({
        role: "student",
        className,
        gender,
        prefix: "S",
      });
    }
  }

  function addTeacher(gender, amount) {
    for (let i = 0; i < amount; i++) {
      participants.push({
        role: "teacher",
        className: "Guru",
        gender,
        prefix: "G",
      });
    }
  }

  // Kelas X = 8
  addStudent("X.1", "L", 2);
  addStudent("X.1", "P", 2);
  addStudent("X.2", "L", 2);
  addStudent("X.2", "P", 2);

  // Kelas XI = 8
  addStudent("XI.1", "L", 2);
  addStudent("XI.1", "P", 2);
  addStudent("XI.2", "L", 2);
  addStudent("XI.2", "P", 2);

  // Kelas XII = 8
  addStudent("XII.1", "L", 2);
  addStudent("XII.1", "P", 2);
  addStudent("XII.2", "L", 2);
  addStudent("XII.2", "P", 2);

  // Guru = 6
  addTeacher("L", 3);
  addTeacher("P", 3);

  if (participants.length !== 30) {
    throw new Error(
      `Jumlah peserta bukan 30: ${participants.length}`
    );
  }

  // --------------------------
  // GENERATE UNIQUE CODES
  // --------------------------

  const usedCodes = new Set();

  const generated = participants.map(
    (participant, index) => {
      let code;

      do {
        code =
          generateCode(
            participant.prefix
          );
      } while (usedCodes.has(code));

      usedCodes.add(code);

      return {
        no: index + 1,
        ...participant,
        code,
        codeHash: hashCode(code),
      };
    }
  );

  if (usedCodes.size !== 30) {
    throw new Error(
      "Kode demo tidak unik."
    );
  }

  const batch = db.batch();

  // --------------------------
  // VOTERS
  // --------------------------

  generated.forEach((voter) => {
    const voterRef =
      db.collection("voters").doc();

    batch.set(voterRef, {
      codeHash: voter.codeHash,
      role: voter.role,
      class: voter.className,
      gender: voter.gender,
      hasVoted: false,
      isActive: true,
      electionId: ELECTION_ID,
    });
  });

  // --------------------------
  // GLOBAL
  // --------------------------

  batch.set(
    db.doc(
      `aggregates/${ELECTION_ID}/global/summary`
    ),
    makeAggregate(30)
  );

  // --------------------------
  // ROLES
  // --------------------------

  batch.set(
    db.doc(
      `aggregates/${ELECTION_ID}/roles/student`
    ),
    makeAggregate(24)
  );

  batch.set(
    db.doc(
      `aggregates/${ELECTION_ID}/roles/teacher`
    ),
    makeAggregate(6)
  );

  // --------------------------
  // GENDER
  // --------------------------

  batch.set(
    db.doc(
      `aggregates/${ELECTION_ID}/gender/L`
    ),
    makeAggregate(15)
  );

  batch.set(
    db.doc(
      `aggregates/${ELECTION_ID}/gender/P`
    ),
    makeAggregate(15)
  );

  // --------------------------
  // CLASSES
  // --------------------------

  const classNames = [
    "X.1",
    "X.2",
    "XI.1",
    "XI.2",
    "XII.1",
    "XII.2",
    "Guru",
  ];

  for (const className of classNames) {
    const total =
      generated.filter(
        (voter) =>
          voter.className === className
      ).length;

    batch.set(
      db.doc(
        `aggregates/${ELECTION_ID}/classes/${className}`
      ),
      makeAggregate(total)
    );
  }

  // --------------------------
  // CANDIDATE RESULTS
  // --------------------------

  for (const candidateId of [
    "candidate-001",
    "candidate-002",
    "candidate-003",
  ]) {
    batch.set(
      db.doc(
        `aggregates/${ELECTION_ID}/candidates/${candidateId}`
      ),
      {
        totalVotes: 0,
        updatedAt:
          admin.firestore.Timestamp.now(),
      }
    );
  }

  await batch.commit();

  // --------------------------
  // LOCAL CSV
  // --------------------------

  const csvLines = [
    "No,Kode,Peran,Kelas,Gender",
  ];

  generated.forEach((voter) => {
    csvLines.push(
      [
        voter.no,
        voter.code,
        voter.role === "student"
          ? "Siswa"
          : "Guru",
        voter.className,
        voter.gender,
      ].join(",")
    );
  });

  const outputPath = path.join(
    __dirname,
    "demo-30-voter-codes.local.csv"
  );

  fs.writeFileSync(
    outputPath,
    csvLines.join("\n"),
    "utf8"
  );

  console.log("");
  console.log("BASELINE_30_BERHASIL");
  console.log("Total peserta : 30");
  console.log("Siswa         : 24");
  console.log("Guru          : 6");
  console.log("L             : 15");
  console.log("P             : 15");
  console.log("Sudah memilih : 0");
  console.log("Belum memilih : 30");
  console.log("Votes         : 0");

  console.log("");
  console.log(
    "30 kode unik berhasil dibuat."
  );

  console.log(
    "File lokal:"
  );

  console.log(
    "demo-30-voter-codes.local.csv"
  );

  console.log("");
  console.log(
    "JANGAN commit/share seluruh file kode."
  );

  process.exit(0);
}

main().catch((error) => {
  console.error("");
  console.error("BASELINE_30_GAGAL");
  console.error("ERROR:", error.message);
  process.exit(1);
});