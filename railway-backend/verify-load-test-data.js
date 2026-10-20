const { db } = require("./firebase-admin");

async function verifyData() {
  const globalDoc = await db.collection("aggregates").doc("election-2026").collection("global").doc("summary").get();
  const candidatesSnap = await db.collection("aggregates").doc("election-2026").collection("candidates").get();
  
  let totalCandidateVotes = 0;
  console.log("=== PEROLEHAN SUARA KANDIDAT ===");
  candidatesSnap.forEach(doc => {
    console.log(`${doc.id}: ${doc.data().totalVotes || 0} vote`);
    totalCandidateVotes += (doc.data().totalVotes || 0);
  });

  const globalData = globalDoc.data() || {};
  console.log("\n=== GLOBAL AGGREGATE ===");
  console.log(`Total Voted di Global: ${globalData.totalVoted}`);
  console.log(`Total Akumulasi Candidate Votes: ${totalCandidateVotes}`);

  if (globalData.totalVoted === totalCandidateVotes) {
    console.log("\nDATA KONSISTEN 100%! Tidak ada selisih antara kandidat dan global summary.");
  } else {
    console.log("\nTERJADI SELISIH DATA!");
  }
  process.exit(0);
}

verifyData();