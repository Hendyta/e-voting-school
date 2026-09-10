import {
  observeAuthState,
  logoutVoter,
} from "./auth.js";

const logoutButton = document.getElementById("logoutButton");

observeAuthState((user) => {
  if (!user) {
    window.location.replace("/");
    return;
  }

  console.log("Akses halaman diizinkan.");
  console.log("UID:", user.uid);
});

logoutButton.addEventListener("click", async () => {
  try {
    await logoutVoter();

    window.location.replace("/");
  } catch (error) {
    console.error("Logout gagal:", error);
  }
});