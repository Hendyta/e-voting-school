const admin = require("firebase-admin");

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

admin.initializeApp({
  projectId: "e-voting-school-2026",
});

const db = admin.firestore();

async function seedElectionAndCandidates() {
  const now = admin.firestore.FieldValue.serverTimestamp();

  // =========================
  // ELECTION
  // =========================

  await db
    .collection("elections")
    .doc("election-2026")
    .set({
      name: "Pemilihan Ketua OSIS 2026",

      // Untuk pengujian submitVote lokal.
      status: "active",

      timezone: "Asia/Jakarta",

      startAt: admin.firestore.Timestamp.fromDate(
        new Date("2026-08-01T00:00:00+07:00")
      ),

      endAt: admin.firestore.Timestamp.fromDate(
        new Date("2026-12-31T23:59:59+07:00")
      ),

      createdAt: now,
      updatedAt: now,
    });

  console.log("election-2026 berhasil dibuat.");

  // =========================
  // CANDIDATE 001
  // =========================

  await db
    .collection("candidates")
    .doc("candidate-001")
    .set({
      electionId: "election-2026",
      number: 1,
      name: "Kandidat 1",
      class: "XI-1",
      photoUrl: "placeholder",

      vision:
        "Mewujudkan OSIS yang aktif, kreatif, dan inspiratif.",

      mission: [
        "Meningkatkan partisipasi siswa dalam kegiatan sekolah.",
        "Mengembangkan kegiatan yang kreatif dan edukatif.",
        "Meningkatkan komunikasi antara siswa dan OSIS.",
      ],

      workPrograms: [
        {
          title: "Jumat Bersih",
          description:
            "Program kebersihan lingkungan sekolah yang dilaksanakan secara berkala.",
        },
        {
          title: "Kotak Aspirasi Digital",
          description:
            "Media bagi siswa untuk menyampaikan aspirasi dan saran kepada OSIS.",
        },
        {
          title: "Pekan Kreativitas Siswa",
          description:
            "Kegiatan untuk memberikan ruang kepada siswa dalam menampilkan karya dan kreativitas.",
        },
      ],

      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

  console.log("candidate-001 berhasil dibuat.");

  // =========================
  // CANDIDATE 002
  // =========================

  await db
    .collection("candidates")
    .doc("candidate-002")
    .set({
      electionId: "election-2026",
      number: 2,
      name: "Kandidat 2",
      class: "XI-2",
      photoUrl: "placeholder",

      vision:
        "Mewujudkan OSIS yang responsif, inovatif, dan berorientasi pada kebutuhan siswa.",

      mission: [
        "Meningkatkan keterlibatan siswa dalam kegiatan sekolah.",
        "Mendorong program yang inovatif dan bermanfaat.",
        "Memperkuat komunikasi antara siswa dan pengurus OSIS.",
      ],

      workPrograms: [
        {
          title: "Forum Aspirasi Siswa",
          description:
            "Forum berkala untuk menampung dan membahas aspirasi siswa.",
        },
        {
          title: "Bulan Prestasi",
          description:
            "Program apresiasi dan pengembangan prestasi akademik maupun nonakademik.",
        },
        {
          title: "Digitalisasi Informasi OSIS",
          description:
            "Penyampaian informasi kegiatan OSIS secara lebih cepat dan terstruktur.",
        },
      ],

      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

  console.log("candidate-002 berhasil dibuat.");

  // =========================
  // CANDIDATE 003
  // =========================

  await db
    .collection("candidates")
    .doc("candidate-003")
    .set({
      electionId: "election-2026",
      number: 3,
      name: "Kandidat 3",
      class: "XI-3",
      photoUrl: "placeholder",

      vision:
        "Mewujudkan lingkungan sekolah yang kolaboratif, disiplin, dan berprestasi.",

      mission: [
        "Meningkatkan rasa kebersamaan antarsiswa.",
        "Mendukung pengembangan bakat dan minat siswa.",
        "Meningkatkan kedisiplinan dalam kegiatan organisasi.",
      ],

      workPrograms: [
        {
          title: "Pekan Kolaborasi",
          description:
            "Kegiatan kolaboratif antarkelas untuk meningkatkan kebersamaan siswa.",
        },
        {
          title: "Ruang Bakat",
          description:
            "Program untuk memberikan ruang bagi siswa menampilkan dan mengembangkan bakat.",
        },
        {
          title: "Gerakan Disiplin Positif",
          description:
            "Program pembiasaan disiplin dengan pendekatan yang edukatif dan positif.",
        },
      ],

      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

  console.log("candidate-003 berhasil dibuat.");

  console.log(
    "Election dan semua kandidat berhasil dimasukkan ke Firestore Emulator."
  );
}

seedElectionAndCandidates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed gagal:", error);
    process.exit(1);
  });