require("dotenv").config({ path: require("path").join(__dirname, "../functions/.env.local") });
const fs = require("fs");
const path = require("path");

const RAW_URL = process.env.BACKEND_URL || "https://ashley-ate-saved-stevens.trycloudflare.com";
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
  if (!customToken) {
    throw new Error("Custom token tidak valid atau tidak ditemukan saat login.");
  }
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Gagal tukar custom token ke ID token");
  }
  return data.idToken;
}

async function runConcurrencyTest() {
  console.log("==========================================");
  console.log("TEST CONCURRENCY VOTE VIA PUBLIC URL (8 TERMINALS)");
  console.log(`Target URL: ${BACKEND_URL}`);
  console.log("==========================================");

  if (!fs.existsSync(CODES_FILE)) {
    console.error("File load-test-1000-codes.local.json tidak ditemukan!");
    process.exit(1);
  }

  const rawData = fs.readFileSync(CODES_FILE, "utf8");
  const voters = JSON.parse(rawData);
  const testVoters = voters.slice(0, 8);

  console.log("\n[1/3] Melakukan login & penukaran ID Token paralel untuk 8 voter...");
  const authSessions = await Promise.all(
    testVoters.map(async (voter, idx) => {
      const loginRes = await fetch(`${BACKEND_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: voter.code, voterCode: voter.code })
      });
      const loginData = await loginRes.json();
      
      if (!loginRes.ok || !loginData.success) {
        throw new Error(`Login voter ${voter.code} gagal: ${loginData.message || loginRes.statusText}`);
      }

      const customToken = loginData.token || loginData.customToken;
      const idToken = await exchangeCustomTokenForIdToken(customToken);

      return {
        code: voter.code,
        idToken: idToken,
        candidateId: CANDIDATES[idx % CANDIDATES.length]
      };
    })
  );

  console.log("[2/3] Mengirimkan 8 vote SERENTAK via Public Tunnel...");
  const startTime = Date.now();

  const voteResults = await Promise.all(
    authSessions.map(async (session, idx) => {
      const vStart = Date.now();
      try {
        const res = await fetch(`${BACKEND_URL}/submit-vote`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.idToken}`
          },
          body: JSON.stringify({
            electionId: "election-2026",
            candidateId: session.candidateId
          })
        });

        const duration = Date.now() - vStart;
        const resData = await res.json().catch(() => ({}));

        return {
          voter: idx + 1,
          code: session.code,
          status: res.status,
          time: duration,
          success: res.ok,
          message: resData.message || resData.error || res.statusText
        };
      } catch (err) {
        return {
          voter: idx + 1,
          code: session.code,
          status: 500,
          time: Date.now() - vStart,
          success: false,
          message: err.message
        };
      }
    })
  );

  const totalTime = Date.now() - startTime;
  let successVotes = 0;

  console.log("\n================ HASIL SUBMISI VOTE VIA PUBLIC URL ================");
  voteResults.forEach((r) => {
    if (r.success) successVotes++;
    console.log(`Voter #${r.voter} [${r.code}] | Status: ${r.status} | Latency: ${r.time} ms | Result: ${r.message}`);
  });

  console.log("\n================ RINGKASAN PUBLIC CONCURRENCY =============");
  console.log(`Total Request Serentak : ${voteResults.length}`);
  console.log(`Vote Berhasil          : ${successVotes}`);
  console.log(`Vote Gagal             : ${voteResults.length - successVotes}`);
  console.log(`Total Waktu Eksekusi   : ${totalTime} ms`);
  console.log("==========================================================");

  process.exit(0);
}

runConcurrencyTest().catch((err) => {
  console.error("Gagal pengujian konkurensi:", err);
  process.exit(1);
});