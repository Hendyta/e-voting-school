require("dotenv").config({ path: require("path").join(__dirname, "../functions/.env.local") });
const fs = require("fs");
const path = require("path");

const BACKEND_URL = process.env.BACKEND_URL || "https://ashley-ate-saved-stevens.trycloudflare.com";
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

async function runFull1000LoadTest() {
  console.log("==========================================");
  console.log("TEST SKALA PENUH: 1.000 VOTER (LOGIN & VOTE)");
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log("==========================================");

  if (!fs.existsSync(CODES_FILE)) {
    console.error("File load-test-1000-codes.local.json tidak ditemukan!");
    process.exit(1);
  }

  const voters = JSON.parse(fs.readFileSync(CODES_FILE, "utf8"));
  console.log(`\nBerhasil membaca ${voters.length} voter dari file lokal.`);

  const BATCH_SIZE = 20; // 20 request serentak per gelombang
  let successLogins = 0;
  let successVotes = 0;
  let failedLogins = 0;
  let failedVotes = 0;

  const loginLatencies = [];
  const voteLatencies = [];

  const overallStart = Date.now();

  console.log(`\nMemulai eksekusi dalam gelombang (${BATCH_SIZE} voter per batch)...\n`);

  for (let i = 0; i < voters.length; i += BATCH_SIZE) {
    const chunk = voters.slice(i, i + BATCH_SIZE);
    
    // Process Login & Token Exchange for Batch
    const batchAuth = await Promise.all(
      chunk.map(async (voter) => {
        const lStart = Date.now();
        try {
          const lRes = await fetch(`${BACKEND_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: voter.code, voterCode: voter.code })
          });
          const lDuration = Date.now() - lStart;
          const lData = await lRes.json();

          if (!lRes.ok) throw new Error(lData.message || "Login gagal");

          const idToken = await exchangeCustomTokenForIdToken(lData.customToken || lData.token);
          loginLatencies.push(lDuration);
          successLogins++;

          return { code: voter.code, idToken, candidateId: CANDIDATES[Math.floor(Math.random() * CANDIDATES.length)] };
        } catch (err) {
          failedLogins++;
          return null;
        }
      })
    );

    const validSessions = batchAuth.filter(Boolean);

    // Process Submit Vote for Batch
    await Promise.all(
      validSessions.map(async (session) => {
        const vStart = Date.now();
        try {
          const vRes = await fetch(`${BACKEND_URL}/submit-vote`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.idToken}`
            },
            body: JSON.stringify({ electionId: "election-2026", candidateId: session.candidateId })
          });
          const vDuration = Date.now() - vStart;
          if (vRes.ok) {
            voteLatencies.push(vDuration);
            successVotes++;
          } else {
            failedVotes++;
          }
        } catch (err) {
          failedVotes++;
        }
      })
    );

    const currentTotal = Math.min(i + BATCH_SIZE, voters.length);
    if (currentTotal % 200 === 0 || currentTotal === voters.length) {
      console.log(`[Progres] ${currentTotal}/${voters.length} voter diproses...`);
    }
  }

  const totalTimeSec = ((Date.now() - overallStart) / 1000).toFixed(2);
  const avgLoginLatency = loginLatencies.length ? (loginLatencies.reduce((a, b) => a + b, 0) / loginLatencies.length).toFixed(2) : 0;
  const avgVoteLatency = voteLatencies.length ? (voteLatencies.reduce((a, b) => a + b, 0) / voteLatencies.length).toFixed(2) : 0;

  console.log("\n================ RINGKASAN LOAD TEST 1.000 VOTER ================");
  console.log(`Total Voter Uji Coba : ${voters.length}`);
  console.log(`Login Sukses         : ${successLogins} | Login Gagal: ${failedLogins}`);
  console.log(`Vote Sukses          : ${successVotes} | Vote Gagal : ${failedVotes}`);
  console.log(`Rata-rata Latency Login : ${avgLoginLatency} ms`);
  console.log(`Rata-rata Latency Vote  : ${avgVoteLatency} ms`);
  console.log(`Total Waktu Eksekusi    : ${totalTimeSec} detik`);
  console.log("================================================================");

  process.exit(0);
}

runFull1000LoadTest().catch((err) => {
  console.error("Gagal load test:", err);
  process.exit(1);
});