const admin = require("firebase-admin");
const voterCodes = require("./voter-codes.local.json");

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

admin.initializeApp({
  projectId: "e-voting-school-2026",
});

const db = admin.firestore();

const voterData = [
  {
    voterId: "voter-001",
    role: "student",
    class: "X-1",
    gender: "L",
    hasVoted: false,
  },
  {
    voterId: "voter-002",
    role: "student",
    class: "X-2",
    gender: "P",
    hasVoted: false,
  },
  {
    voterId: "voter-003",
    role: "student",
    class: "XI-1",
    gender: "L",
    hasVoted: true,
  },
  {
    voterId: "voter-004",
    role: "student",
    class: "XI-2",
    gender: "P",
    hasVoted: false,
  },
  {
    voterId: "voter-005",
    role: "student",
    class: "XII-1",
    gender: "L",
    hasVoted: true,
  },
  {
    voterId: "voter-006",
    role: "student",
    class: "XII-2",
    gender: "P",
    hasVoted: false,
  },
  {
    voterId: "voter-007",
    role: "teacher",
    class: "Guru",
    gender: "L",
    hasVoted: true,
  },
  {
    voterId: "voter-008",
    role: "teacher",
    class: "Guru",
    gender: "P",
    hasVoted: false,
  },
];

async function seedVoters() {
  for (const voter of voterData) {
    const codeRecord = voterCodes.find(
      (item) => item.voterId === voter.voterId
    );

    if (!codeRecord) {
      throw new Error(
        `CodeHash untuk ${voter.voterId} tidak ditemukan.`
      );
    }

    await db.collection("voters").doc(voter.voterId).set({
      electionId: "election-2026",
      codeHash: codeRecord.codeHash,
      role: voter.role,
      class: voter.class,
      gender: voter.gender,
      hasVoted: voter.hasVoted,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`${voter.voterId} berhasil dibuat.`);
  }

  console.log("Semua voter dummy berhasil dimasukkan ke Emulator.");
}

seedVoters()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Gagal memasukkan voter dummy:", error);
    process.exit(1);
  });