import {
  loginWithVoterCode,
  observeAuthState,
} from "./auth.js";

const loginForm =
  document.getElementById("loginForm");

const voterCodeInput =
  document.getElementById("voterCode");

const loginButton =
  document.getElementById("loginButton");

const message =
  document.getElementById("message");

let isLoggingIn = false;

function setMessage(text, type = "") {
  message.textContent = text;

  message.classList.remove(
    "success",
    "error",
    "loading"
  );

  if (type) {
    message.classList.add(type);
  }
}

function setLoginLoading(isLoading) {
  isLoggingIn = isLoading;

  loginButton.disabled = isLoading;
  voterCodeInput.disabled = isLoading;

  loginButton.textContent =
    isLoading
      ? "MEMPROSES..."
      : "MASUK";
}

observeAuthState((user) => {
  if (!user) {
    return;
  }

  window.location.replace(
    "/candidates.html"
  );
});

voterCodeInput.addEventListener(
  "input",
  () => {
    voterCodeInput.value =
      voterCodeInput.value
        .toUpperCase()
        .replace(/\s+/g, "");

    setMessage("");
  }
);

loginForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    if (isLoggingIn) {
      return;
    }

    const code =
      voterCodeInput.value
        .trim()
        .toUpperCase();

    if (!code) {
      setMessage(
        "Kode voting wajib diisi.",
        "error"
      );

      voterCodeInput.focus();
      return;
    }

    try {
      setLoginLoading(true);

      setMessage(
        "Memeriksa kode voting...",
        "loading"
      );

      await loginWithVoterCode(code);

      setMessage(
        "Login berhasil. Mengarahkan...",
        "success"
      );

    } catch (error) {
      console.error(
        "Login voter gagal:",
        error
      );

      setMessage(
        error.message ||
          "Login gagal. Silakan coba kembali.",
        "error"
      );

      setLoginLoading(false);

      voterCodeInput.focus();
    }
  }
);