const { db } = require("./firebase-admin");

async function main() {
  const snapshot = await db
    .collection("voters")
    .get();

  console.log("==============================");
  console.log("RINGKASAN VOTERS");
  console.log("==============================");

  console.log("Total dokumen:", snapshot.size);

  const summary = {
    student: 0,
    teacher: 0,
    voted: 0,
    notVoted: 0,
    active: 0,
    inactive: 0,
  };

  const classes = {};

  snapshot.forEach((doc) => {
    const data = doc.data();

    if (data.role === "student") {
      summary.student++;
    }

    if (data.role === "teacher") {
      summary.teacher++;
    }

    if (data.hasVoted === true) {
      summary.voted++;
    } else {
      summary.notVoted++;
    }

    if (data.isActive === true) {
      summary.active++;
    } else {
      summary.inactive++;
    }

    const className =
      data.class ??
      data.kelas ??
      "TIDAK_ADA";

    classes[className] =
      (classes[className] || 0) + 1;
  });

  console.log("");
  console.log("Siswa        :", summary.student);
  console.log("Guru         :", summary.teacher);
  console.log("Sudah voting :", summary.voted);
  console.log("Belum voting :", summary.notVoted);
  console.log("Aktif        :", summary.active);
  console.log("Nonaktif     :", summary.inactive);

  console.log("");
  console.log("PER KELAS:");

  Object.keys(classes)
    .sort((a, b) =>
      a.localeCompare(
        b,
        undefined,
        { numeric: true }
      )
    )
    .forEach((className) => {
      console.log(
        `${className}: ${classes[className]}`
      );
    });

  console.log("");
  console.log("==============================");
  console.log("CONTOH STRUKTUR (TANPA RAHASIA)");
  console.log("==============================");

  let shown = 0;

  snapshot.forEach((doc) => {
    if (shown >= 3) {
      return;
    }

    const data = doc.data();

    console.log({
      role: data.role,
      class: data.class ?? data.kelas,
      gender: data.gender,
      hasVoted: data.hasVoted,
      isActive: data.isActive,
      electionId: data.electionId,
    });

    shown++;
  });

  process.exit(0);
}

main().catch((error) => {
  console.error(
    "ERROR:",
    error.message
  );

  process.exit(1);
});