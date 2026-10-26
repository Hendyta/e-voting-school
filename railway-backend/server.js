const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const crypto = require("crypto");
const { rateLimit } = require("express-rate-limit");

const { admin, db } = require("./firebase-admin");
const createSubmitVoteRoute = require("./submit-vote");

const app = express();

app.disable("x-powered-by");

// =========================
// 1. KONFIGURASI CORS
// =========================
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://192.168.1.16:5173",
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/+$/, ""));
}

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origin tidak diizinkan oleh CORS."));
  },
};

app.use(cors(corsOptions));

// =========================
// 2. MIDDLEWARE PARSING BODY
// =========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================
// 3. STATIS FILE (FRONTEND)
// =========================
const srcPath = path.join(__dirname, "src");

// Sajikan file statis langsung (CSS, JS, Gambar)
app.use(express.static(srcPath));
app.use("/css", express.static(path.join(srcPath, "css")));
app.use("/js", express.static(path.join(srcPath, "js")));

// Rute utama menyajikan index.html
app.get("/", (req, res) => {
  const indexPath = path.join(srcPath, "index.html");
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).send(`Debug Path Error: File index.html tidak ditemukan di path: ${indexPath}`);
});

// =========================
// 4. RATE LIMITER & UTILS
// =========================
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Terlalu banyak percobaan login. Silakan coba lagi sebentar.",
  },
});

function normalizeVoterCode(code) {
  return String(code || "").trim().toUpperCase();
}

function hashVoterCode(code) {
  const secret = process.env.VOTER_CODE_HMAC_SECRET;
  if (!secret) {
    throw new Error("VOTER_CODE_HMAC_SECRET belum tersedia.");
  }
  return crypto
    .createHmac("sha256", secret)
    .update(normalizeVoterCode(code))
    .digest("hex");
}

// =========================
// 5. RUTE API BACKEND
// =========================
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
  });
});

app.post("/login", loginLimiter, async (req, res) => {
  try {
    const code = req.body?.code;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Kode voter wajib diisi.",
      });
    }

    const normalizedCode = normalizeVoterCode(code);
    const codePattern = /^[SG]-[A-Z2-9]{6}$/;

    if (!codePattern.test(normalizedCode)) {
      return res.status(400).json({
        success: false,
        message: "Format kode voter tidak valid.",
      });
    }

    const codeHash = hashVoterCode(normalizedCode);

    const voterSnapshot = await db
      .collection("voters")
      .where("codeHash", "==", codeHash)
      .limit(1)
      .get();

    if (voterSnapshot.empty) {
      return res.status(401).json({
        success: false,
        message: "Kode voter tidak valid.",
      });
    }

    const voterDoc = voterSnapshot.docs[0];
    const voterData = voterDoc.data();

    if (voterData.isActive !== true) {
      return res.status(401).json({
        success: false,
        message: "Kode voter tidak valid.",
      });
    }

    if (voterData.hasVoted === true) {
      return res.status(403).json({
        success: false,
        message: "Kode ini sudah digunakan untuk voting.",
      });
    }

    const electionId = voterData.electionId;

    if (!electionId) {
      return res.status(403).json({
        success: false,
        message: "Kode voter tidak dapat digunakan.",
      });
    }

    const electionDoc = await db
      .collection("elections")
      .doc(electionId)
      .get();

    if (!electionDoc.exists) {
      return res.status(403).json({
        success: false,
        message: "Pemilihan tidak tersedia.",
      });
    }

    const electionData = electionDoc.data();
    const startAt = electionData.startAt?.toDate?.();
    const endAt = electionData.endAt?.toDate?.();
    const now = new Date();

    if (
      electionData.status !== "active" ||
      !startAt ||
      !endAt ||
      now < startAt ||
      now > endAt
    ) {
      return res.status(403).json({
        success: false,
        message: "Pemilihan belum dibuka atau sudah ditutup.",
      });
    }

    const customToken = await admin.auth().createCustomToken(
      voterDoc.id,
      {
        role: voterData.role,
        electionId: voterData.electionId,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login berhasil.",
      token: customToken,
      voter: {
        role: voterData.role,
        class: voterData.class,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server.",
    });
  }
});

const submitVoteRoute = createSubmitVoteRoute({ admin, db });
app.post("/submit-vote", submitVoteRoute);

app.get("/spreadsheet-summary", async (req, res) => {
  try {
    const spreadsheetApiKey = process.env.SPREADSHEET_API_KEY;
    const providedApiKey = req.get("X-Spreadsheet-Key");

    if (!spreadsheetApiKey) {
      console.error("SPREADSHEET_API_KEY belum tersedia di server.");
      return res.status(500).json({
        success: false,
        message: "Konfigurasi Spreadsheet belum tersedia.",
      });
    }

    if (!providedApiKey || providedApiKey !== spreadsheetApiKey) {
      return res.status(401).json({
        success: false,
        message: "Akses tidak diizinkan.",
      });
    }

    const electionId = "election-2026";

    const [
      electionDoc,
      globalDoc,
      studentDoc,
      teacherDoc,
      candidate1Doc,
      candidate2Doc,
      candidate3Doc,
    ] = await Promise.all([
      db.doc(`elections/${electionId}`).get(),
      db.doc(`aggregates/${electionId}/global/summary`).get(),
      db.doc(`aggregates/${electionId}/roles/student`).get(),
      db.doc(`aggregates/${electionId}/roles/teacher`).get(),
      db.doc(`aggregates/${electionId}/candidates/candidate-001`).get(),
      db.doc(`aggregates/${electionId}/candidates/candidate-002`).get(),
      db.doc(`aggregates/${electionId}/candidates/candidate-003`).get(),
    ]);

    if (!electionDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Data pemilihan tidak ditemukan.",
      });
    }

    const classNames = [
      "X.1", "X.2", "X.3", "X.4", "X.5", "X.6", "X.7", "X.8", "X.9", "X.10",
      "XI.1", "XI.2", "XI.3", "XI.4", "XI.5", "XI.6", "XI.7", "XI.8", "XI.9", "XI.10",
      "XII.1", "XII.2", "XII.3", "XII.4", "XII.5", "XII.6", "XII.7", "XII.8", "XII.9", "XII.10", "XII.11",
    ];

    const classDocs = await Promise.all(
      classNames.map((className) =>
        db.doc(`aggregates/${electionId}/classes/${className}`).get()
      )
    );

    const classes = {};
    classNames.forEach((className, index) => {
      const doc = classDocs[index];
      const data = doc.exists ? doc.data() : {};
      classes[className] = {
        totalVoters: data.totalVoters || 0,
        voted: data.totalVoted || 0,
        notVoted: data.totalNotVoted || 0,
        participationRate: data.participationRate || 0,
      };
    });

    const election = electionDoc.data();
    const global = globalDoc.exists ? globalDoc.data() : {};
    const student = studentDoc.exists ? studentDoc.data() : {};
    const teacher = teacherDoc.exists ? teacherDoc.data() : {};

    const candidate1 = candidate1Doc.exists ? candidate1Doc.data() : {};
    const candidate2 = candidate2Doc.exists ? candidate2Doc.data() : {};
    const candidate3 = candidate3Doc.exists ? candidate3Doc.data() : {};

    return res.status(200).json({
      success: true,
      election: {
        id: electionId,
        status: election.status || null,
        startAt: election.startAt ? election.startAt.toDate().toISOString() : null,
        endAt: election.endAt ? election.endAt.toDate().toISOString() : null,
      },
      global: {
        totalVoters: global.totalVoters || 0,
        voted: global.totalVoted || 0,
        notVoted: global.totalNotVoted || 0,
        participationRate: global.participationRate || 0,
      },
      roles: {
        student: {
          totalVoters: student.totalVoters || 0,
          voted: student.totalVoted || 0,
          notVoted: student.totalNotVoted || 0,
          participationRate: student.participationRate || 0,
        },
        teacher: {
          totalVoters: teacher.totalVoters || 0,
          voted: teacher.totalVoted || 0,
          notVoted: teacher.totalNotVoted || 0,
          participationRate: teacher.participationRate || 0,
        },
      },
      classes,
      candidates: {
        "candidate-001": { totalVotes: candidate1.totalVotes || 0 },
        "candidate-002": { totalVotes: candidate2.totalVotes || 0 },
        "candidate-003": { totalVotes: candidate3.totalVotes || 0 },
      },
    });
  } catch (error) {
    console.error("Spreadsheet summary error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data rekap.",
    });
  }
});

// =========================
// 6. ERROR HANDLER
// =========================
app.use((error, req, res, next) => {
  if (error && error.message === "Origin tidak diizinkan oleh CORS.") {
    return res.status(403).json({
      success: false,
      message: "Origin tidak diizinkan.",
    });
  }

  console.error("Unhandled server error:", error);
  return res.status(500).json({
    success: false,
    message: "Terjadi kesalahan pada server.",
  });
});

// =========================
// 7. LISTEN & EXPORT
// =========================
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// PERBAIKAN FATAL: Diletakkan di paling akhir file
module.exports = app;