const readline = require("readline");
const { auth } = require("./firebase-admin");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Masukkan email akun admin: ", async (email) => {
  try {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new Error("Email tidak boleh kosong.");
    }

    const user = await auth.getUserByEmail(normalizedEmail);

    await auth.setCustomUserClaims(user.uid, {
      ...(user.customClaims || {}),
      admin: true,
    });

    const updatedUser = await auth.getUser(user.uid);

    console.log("");
    console.log("ADMIN_CLAIM_BERHASIL_DITAMBAHKAN");
    console.log(
      "admin:",
      updatedUser.customClaims?.admin
    );
  } catch (error) {
    console.error("");
    console.error("ERROR:", error.message);
  } finally {
    rl.close();
  }
});