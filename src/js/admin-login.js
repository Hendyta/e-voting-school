import {
  loginAdmin,
  testAdminAggregateAccess,
} from "./admin-auth.js";

const form =
  document.getElementById("adminLoginForm");

const emailInput =
  document.getElementById("email");

const passwordInput =
  document.getElementById("password");

const loginButton =
  document.getElementById("loginButton");

const message =
  document.getElementById("message");

function showMessage(text, type = "error") {
  message.textContent = text;
  message.className = type;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  message.className = "";
  message.textContent = "";

  loginButton.disabled = true;
  loginButton.textContent = "MEMERIKSA...";

  try {
    await loginAdmin(
      emailInput.value,
      passwordInput.value
    );

    // Membuktikan Security Rules benar-benar
    // mengizinkan akun admin membaca aggregate.
    await testAdminAggregateAccess();

    showMessage(
      "Login admin berhasil.",
      "success"
    );

    setTimeout(() => {
      window.location.href =
        "/admin-dashboard.html";
    }, 700);

  } catch (error) {
    console.error(
      "Login admin gagal:",
      error
    );

    let text =
      "Login admin gagal. Periksa email dan password.";

    if (
      error.message ===
      "Akun ini tidak memiliki akses administrator."
    ) {
      text =
        "Akun ini tidak memiliki akses administrator.";
    }

    if (
      error.message ===
      "Aggregate global tidak ditemukan."
    ) {
      text =
        "Login berhasil, tetapi data dashboard tidak ditemukan.";
    }

    showMessage(text, "error");

    loginButton.disabled = false;
    loginButton.textContent = "MASUK ADMIN";
  }
});