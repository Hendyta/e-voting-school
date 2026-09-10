const admin = require("firebase-admin");

process.env.FIRESTORE_EMULATOR_HOST =
  "127.0.0.1:8080";

admin.initializeApp({
  projectId: "e-voting-school-2026",
});

const db = admin.firestore();

const electionId = "election-2026";

async function seedAggregates() {
  const now =
    admin.firestore.Timestamp.now();

  const aggregateRef = db
    .collection("aggregates")
    .doc(electionId);

  // =========================
  // PARENT
  // =========================

  await aggregateRef.set({
    updatedAt: now,
  });

  // =========================
  // GLOBAL
  // =========================

  await aggregateRef
    .collection("global")
    .doc("summary")
    .set({
      totalVoters: 8,
      totalVoted: 3,
      totalNotVoted: 5,
      participationRate: 37.5,
      updatedAt: now,
    });

  // =========================
  // ROLES
  // =========================

  await aggregateRef
    .collection("roles")
    .doc("student")
    .set({
      totalVoters: 6,
      totalVoted: 2,
      totalNotVoted: 4,
      participationRate: 33.33,
      updatedAt: now,
    });

  await aggregateRef
    .collection("roles")
    .doc("teacher")
    .set({
      totalVoters: 2,
      totalVoted: 1,
      totalNotVoted: 1,
      participationRate: 50.0,
      updatedAt: now,
    });

  // =========================
  // GENDER
  // =========================

  await aggregateRef
    .collection("gender")
    .doc("L")
    .set({
      totalVoters: 4,
      totalVoted: 3,
      totalNotVoted: 1,
      participationRate: 75.0,
      updatedAt: now,
    });

  await aggregateRef
    .collection("gender")
    .doc("P")
    .set({
      totalVoters: 4,
      totalVoted: 0,
      totalNotVoted: 4,
      participationRate: 0.0,
      updatedAt: now,
    });

  // =========================
  // CLASSES
  // =========================

const studentClasses = [
  "X.1",
  "X.2",
  "X.3",
  "X.4",
  "X.5",
  "X.6",
  "X.7",
  "X.8",
  "X.9",
  "X.10",

  "XI.1",
  "XI.2",
  "XI.3",
  "XI.4",
  "XI.5",
  "XI.6",
  "XI.7",
  "XI.8",
  "XI.9",
  "XI.10",

  "XII.1",
  "XII.2",
  "XII.3",
  "XII.4",
  "XII.5",
  "XII.6",
  "XII.7",
  "XII.8",
  "XII.9",
  "XII.10",
  "XII.11",
];


for (const className of studentClasses) {

  await aggregateRef
    .collection("classes")
    .doc(className)
    .set({
      totalVoters: 0,
      totalVoted: 0,
      totalNotVoted: 0,
      participationRate: 0.0,
      updatedAt: now,
    });
}


// =========================
// TEACHER CLASS
// =========================

await aggregateRef
  .collection("classes")
  .doc("Guru")
  .set({
    totalVoters: 0,
    totalVoted: 0,
    totalNotVoted: 0,
    participationRate: 0.0,
    updatedAt: now,
  });

  // =========================
  // CANDIDATES
  // =========================

  const candidateIds = [
    "candidate-001",
    "candidate-002",
    "candidate-003",
  ];

  for (const candidateId of candidateIds) {
    await aggregateRef
      .collection("candidates")
      .doc(candidateId)
      .set({
        totalVotes: 0,
        percentage: 0.0,
        updatedAt: now,
      });
  }

  console.log(
    "Semua aggregate dummy berhasil dibuat."
  );
}

seedAggregates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      "Gagal membuat aggregate:",
      error
    );

    process.exit(1);
  });