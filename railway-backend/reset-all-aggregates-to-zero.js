const { db } = require("./firebase-admin");

async function resetToZero() {
  console.log("==========================================");
  console.log("RESETTING ALL AGGREGATES & CANDIDATES TO 0");
  console.log("==========================================");

  const electionRef = db.collection("aggregates").doc("election-2026");

  // 1. Reset Global Summary
  await electionRef.collection("global").doc("summary").set({
    totalVoters: 1000,
    totalVoted: 0,
    totalNotVoted: 1000,
    updatedAt: new Date().toISOString()
  });

  // 2. Reset Candidates
  const candidates = ["candidate-001", "candidate-002", "candidate-003"];
  for (const cId of candidates) {
    await electionRef.collection("candidates").doc(cId).set({
      totalVotes: 0,
      updatedAt: new Date().toISOString()
    });
  }

  // 3. Reset Roles
  await electionRef.collection("roles").doc("siswa").set({
    totalVoters: 1000,
    totalVoted: 0,
    totalNotVoted: 1000,
    updatedAt: new Date().toISOString()
  });

  // 4. Reset Gender
  await electionRef.collection("gender").doc("L").set({
    totalVoters: 500,
    totalVoted: 0,
    totalNotVoted: 500,
    updatedAt: new Date().toISOString()
  });
  await electionRef.collection("gender").doc("P").set({
    totalVoters: 500,
    totalVoted: 0,
    totalNotVoted: 500,
    updatedAt: new Date().toISOString()
  });

  console.log("BERHASIL! Seluruh aggregate & suara kandidat telah di-reset ke 0.");
  process.exit(0);
}

resetToZero().catch((err) => {
  console.error("Gagal reset:", err);
  process.exit(1);
});