require("dotenv").config({ path: require("path").join(__dirname, "../functions/.env.local") });
const fs = require("fs");
const path = require("path");

const RAW_URL = process.env.BACKEND_URL || "http://localhost:3000";
const BACKEND_URL = RAW_URL.trim().replace(/\/+$|\s+/g, "");
const CODES_FILE = path.join(__dirname, "load-test-1000-codes.local.json");
const CANDIDATES = ["candidate-001", "candidate-002", "candidate-003"];

let FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;

if (!FIREBASE_API_KEY) {
  const configPath = path.join(__dirname, "../src/js/firebase-config.js");
  if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, "utf8");
    const match = configContent.match(/apiKey:\s*["']([^"']+)["']/);
    if (match) FIREBASE_API_KEY = match[1];
  }
}

async function exchangeCustomTokenForIdToken(customToken) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Gagal tukar custom token ke ID token");
  return data.idToken;
}

async function submitVoteWithRetry(idToken, candidateId, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${BACKEND_URL}/submit-vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ electionId: "election-2026", candidateId })
      });
      if (res.ok) return true;
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 200 * attempt)); // Delay bertahap jika gagal
  }
  return false;
}

async function runFull1000Test() {
  console.log("==========================================");
  console.log("MEMULAI VOTING FULL 1.000 VOTER (Target 100% Sukses)");
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log("==========================================");

  const voters = JSON.parse(fs.readFileSync(CODES_FILE, "utf8"));
  const BATCH_SIZE = 5; // Ukuran gelombang aman agar Firestore tidak mengalami contention lock
  let totalSuccess = 0;

  for (let i = 0; i < voters.length; i += BATCH_SIZE) {
    const chunk = voters.slice(i, i + BATCH_SIZE);

    await Promise.all(
      chunk.map(async (voter) => {
        try {
          const lRes = await fetch(`${BACKEND_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: voter.code, voterCode: voter.code })
          });
          const lData = await lRes.json();
          if (!lRes.ok) return;

          const idToken = await exchangeCustomTokenForIdToken(lData.customToken || lData.token);
          const candidateId = CANDIDATES[Math.floor(Math.random() * CANDIDATES.length)];

          const isSuccess = await submitVoteWithRetry(idToken, candidateId);
          if (isSuccess) totalSuccess++;
        } catch (err) {}
      })
    );

    const currentTotal = Math.min(i + BATCH_SIZE, voters.length);
    if (currentTotal % 100 === 0 || currentTotal === voters.length) {
      console.log(`[Progres] ${currentTotal}/${voters.length} voter terproses... (Total Vote Ter-record: ${totalSuccess})`);
    }
  }

  console.log("\n================ SELESAI ================");
  console.log(`Total Voter: 1000`);
  console.log(`Total Suara Masuk & Tersimpan Perfections: ${totalSuccess}/1000`);
  console.log("=========================================");
  process.exit(0);
}

runFull1000Test().catch(console.error);