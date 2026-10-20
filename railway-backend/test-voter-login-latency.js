const fs = require("fs");
const path = require("path");

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";
const CODES_FILE = path.join(__dirname, "load-test-1000-codes.local.json");

async function testLoginLatency() {
  console.log("==========================================");
  console.log("TEST VOTER LOGIN LATENCY");
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log("==========================================");

  if (!fs.existsSync(CODES_FILE)) {
    console.error("File load-test-1000-codes.local.json tidak ditemukan!");
    process.exit(1);
  }

  const rawData = fs.readFileSync(CODES_FILE, "utf8");
  const voters = JSON.parse(rawData);

  const sampleVoters = voters.slice(0, 10);
  const latencies = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < sampleVoters.length; i++) {
    const voter = sampleVoters[i];
    const startTime = Date.now();

    try {
      const response = await fetch(`${BACKEND_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: voter.code,
          voterCode: voter.code
        })
      });

      const duration = Date.now() - startTime;
      latencies.push(duration);

      if (response.ok) {
        successCount++;
        console.log(`[${i + 1}/${sampleVoters.length}] Code: ${voter.code} | Status: ${response.status} | Time: ${duration} ms | SUCCESS`);
      } else {
        failCount++;
        const errData = await response.json().catch(() => ({}));
        console.log(`[${i + 1}/${sampleVoters.length}] Code: ${voter.code} | Status: ${response.status} | Time: ${duration} ms | FAIL: ${errData.error || errData.message || response.statusText}`);
      }
    } catch (err) {
      const duration = Date.now() - startTime;
      failCount++;
      console.log(`[${i + 1}/${sampleVoters.length}] Code: ${voter.code} | ERROR: ${err.message} | Time: ${duration} ms`);
    }
  }

  const avgLatency = latencies.length > 0 ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2) : 0;
  
  console.log("\n==========================================");
  console.log("RINGKASAN TES LOGIN LATENCY");
  console.log(`Total Pengujian : ${sampleVoters.length}`);
  console.log(`Berhasil        : ${successCount}`);
  console.log(`Gagal           : ${failCount}`);
  console.log(`Rata-rata Waktu : ${avgLatency} ms`);
  console.log("==========================================");

  process.exit(0);
}

testLoginLatency();