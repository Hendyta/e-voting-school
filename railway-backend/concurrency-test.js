const fs = require("fs");
const path = require("path");
const readline = require("readline");

const BACKEND_URL = "http://127.0.0.1:3000";
const CANDIDATE_ID = "candidate-001";

// ----------------------------------------
// READ FIREBASE WEB API KEY LOCALLY
// ----------------------------------------

function getFirebaseApiKey() {
  const configPath = path.join(
    __dirname,
    "../src/js/firebase-config.js"
  );

  const configText =
    fs.readFileSync(configPath, "utf8");

  const match = configText.match(
    /apiKey\s*:\s*["']([^"']+)["']/
  );

  if (!match || !match[1]) {
    throw new Error(
      "Firebase API key tidak ditemukan di firebase-config.js."
    );
  }

  return match[1];
}

// ----------------------------------------
// ASK VOTER CODE
// ----------------------------------------

function askVoterCode() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      "Masukkan kode SECURITY TEST voter: ",
      (answer) => {
        rl.close();

        resolve(
          answer.trim().toUpperCase()
        );
      }
    );
  });
}

async function parseResponse(response) {
  let data;

  try {
    data = await response.json();
  } catch {
    data = {
      message: "Response bukan JSON.",
    };
  }

  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

// ----------------------------------------
// EXCHANGE CUSTOM TOKEN → ID TOKEN
// ----------------------------------------

async function exchangeCustomToken(
  customToken,
  apiKey
) {
  const response = await fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken" +
      `?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: customToken,
        returnSecureToken: true,
      }),
    }
  );

  const result =
    await parseResponse(response);

  if (!result.ok) {
    throw new Error(
      result.data?.error?.message ||
        "Gagal menukar custom token menjadi ID token."
    );
  }

  const idToken =
    result.data?.idToken;

  if (!idToken) {
    throw new Error(
      "Firebase tidak mengembalikan ID token."
    );
  }

  return idToken;
}

// ----------------------------------------
// SUBMIT VOTE
// ----------------------------------------

async function submitVote(idToken) {
  const response = await fetch(
    `${BACKEND_URL}/submit-vote`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        candidateId: CANDIDATE_ID,
      }),
    }
  );

  return parseResponse(response);
}

// ----------------------------------------
// MAIN
// ----------------------------------------

async function main() {
  console.log("==============================");
  console.log("CONCURRENCY / DOUBLE-VOTE TEST");
  console.log("==============================");
  console.log("");
  console.log(
    `Kandidat test: ${CANDIDATE_ID}`
  );
  console.log("");

  const apiKey = getFirebaseApiKey();

  const code = await askVoterCode();

  if (!code) {
    throw new Error(
      "Kode voter tidak boleh kosong."
    );
  }

  // --------------------------------------
  // LOGIN TO LOCAL BACKEND
  // --------------------------------------

  const loginResponse = await fetch(
    `${BACKEND_URL}/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
      }),
    }
  );

  const loginResult =
    await parseResponse(loginResponse);

  if (!loginResult.ok) {
    console.log("");
    console.log("LOGIN GAGAL");
    console.log(
      "HTTP:",
      loginResult.status
    );
    console.log(
      "Pesan:",
      loginResult.data?.message ||
        "Tidak diketahui"
    );

    process.exit(1);
  }

  const customToken =
    loginResult.data?.token;

  if (!customToken) {
    throw new Error(
      "Login berhasil tetapi custom token tidak ditemukan."
    );
  }

  console.log(
    "Login security voter: BERHASIL"
  );

  // --------------------------------------
  // CUSTOM TOKEN → FIREBASE ID TOKEN
  // --------------------------------------

  const idToken =
    await exchangeCustomToken(
      customToken,
      apiKey
    );

  console.log(
    "Firebase ID token: BERHASIL DIPEROLEH"
  );

  console.log(
    "Token hanya disimpan di memory."
  );

  console.log("");
  console.log(
    "Mengirim 2 request vote secara paralel..."
  );

  // --------------------------------------
  // REAL CONCURRENCY TEST
  // --------------------------------------

  const results =
    await Promise.allSettled([
      submitVote(idToken),
      submitVote(idToken),
    ]);

  console.log("");
  console.log("==============================");
  console.log("HASIL CONCURRENCY TEST");
  console.log("==============================");

  results.forEach((result, index) => {
    console.log("");
    console.log(
      `REQUEST ${index + 1}`
    );

    if (result.status === "fulfilled") {
      console.log(
        "HTTP:",
        result.value.status
      );

      console.log(
        "Success:",
        result.value.data?.success
      );

      console.log(
        "Message:",
        result.value.data?.message ||
          "-"
      );
    } else {
      console.log(
        "REQUEST ERROR:",
        result.reason?.message ||
          "Unknown error"
      );
    }
  });

  console.log("");
  console.log(
    "PENTING: hasil Firestore tetap harus diaudit."
  );
}

main().catch((error) => {
  console.error("");
  console.error(
    "TEST ERROR:",
    error.message
  );

  process.exit(1);
});