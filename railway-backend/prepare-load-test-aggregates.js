const { db } = require("./firebase-admin");

const ELECTION_ID = "election-2026";
const allClasses = [
  "X.1", "X.2", "X.3", "X.4", "X.5", "X.6", "X.7", "X.8", "X.9", "X.10",
  "XI.1", "XI.2", "XI.3", "XI.4", "XI.5", "XI.6", "XI.7", "XI.8", "XI.9", "XI.10",
  "XII.1", "XII.2", "XII.3", "XII.4", "XII.5", "XII.6", "XII.7", "XII.8", "XII.9", "XII.10", "XII.11",
  "Guru"
];

async function prepareLoadTestAggregates() {
  try {
    console.log("Menyiapkan dokumen subcollection aggregates untuk load test...");

    const batch = db.batch();
    const aggDocRef = db.collection("aggregates").doc(ELECTION_ID);

    // 1. Candidates (candidate-001, candidate-002, candidate-003)
    ["candidate-001", "candidate-002", "candidate-003"].forEach((cId) => {
      batch.set(aggDocRef.collection("candidates").doc(cId), { totalVotes: 0 }, { merge: true });
    });

    // 2. Global summary
    batch.set(aggDocRef.collection("global").doc("summary"), { totalVoters: 1031, totalVoted: 31, totalNotVoted: 1000 }, { merge: true });

    // 3. Roles
    batch.set(aggDocRef.collection("roles").doc("student"), { totalVoters: 1025, totalVoted: 25, totalNotVoted: 1000 }, { merge: true });
    batch.set(aggDocRef.collection("roles").doc("teacher"), { totalVoters: 6, totalVoted: 6, totalNotVoted: 0 }, { merge: true });

    // 4. Gender
    batch.set(aggDocRef.collection("gender").doc("L"), { totalVoters: 515, totalVoted: 15, totalNotVoted: 500 }, { merge: true });
    batch.set(aggDocRef.collection("gender").doc("P"), { totalVoters: 516, totalVoted: 16, totalNotVoted: 500 }, { merge: true });

    // 5. Classes (Seluruh kelas X, XI, XII & Guru)
    allClasses.forEach((className) => {
      batch.set(aggDocRef.collection("classes").doc(className), { totalVoters: 100, totalVoted: 0, totalNotVoted: 100 }, { merge: true });
    });

    await batch.commit();
    console.log("BERHASIL! Seluruh subcollection aggregates (global, candidates, roles, gender, classes) telah disiapkan.");
    process.exit(0);
  } catch (error) {
    console.error("Gagal menyiapkan aggregates:", error);
    process.exit(1);
  }
}

prepareLoadTestAggregates();