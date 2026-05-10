const inputs = document.querySelectorAll(".input-field");
const toggle_btn = document.querySelectorAll(".toggle");
const main = document.querySelector("main");
const bullets = document.querySelectorAll(".bullets span");
const images = document.querySelectorAll(".image");

inputs.forEach((inp) => {
  inp.addEventListener("focus", () => {
    inp.classList.add("active");
  });
  inp.addEventListener("blur", () => {
    if (inp.value != "") return;
    inp.classList.remove("active");
  });
});

toggle_btn.forEach((btn) => {
  btn.addEventListener("click", () => {
    main.classList.toggle("sign-up-mode");
  });
});

function validateLogin() {
  const emailInput = document.querySelector(".email-input");
  const passwordInput = document.querySelector(".password-input");
  const alertContainer = document.getElementById("alert-container"); 

  emailInput.classList.remove("invalid");
  passwordInput.classList.remove("invalid");

  if (emailInput.value === "") {
    emailInput.classList.add("invalid");
    emailInput.focus();
    return false;
  }

  if (passwordInput.value === "") {
    passwordInput.classList.add("invalid");
    passwordInput.focus(); 
    return false;
  }

  fetch("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: emailInput.value, 
      password: passwordInput.value, 
    }),
  })
    .then((res) => res.json())
    .then((result) => {
      if (result.status === "success") {
        window.location.href = "/"; // Arahkan ke halaman utama
      } else {
        alertContainer.innerHTML = `
        <div class="alert-danger">
          <p>${result.message}</p>
        </div>
      `;
        alertContainer.style.display = "block";
      }
    })
    .catch((err) => {
      console.error("Login error:", err);
      alertContainer.innerHTML = `
      <div class="alert-danger">
        <p>Something went wrong. Please try again in a moment</p>
      </div>
    `;
      alertContainer.style.display = "block";
    });

  return false; // prevent form submit
}

function validateRegister() {
  const username = document.querySelector(".username-input");
  const email = document.querySelector(".email2-input");
  const password = document.querySelector(".password2-input");
  const dangerAlert = document.getElementById("danger-alert");

  // Reset validasi visual
  username.classList.remove("invalid");
  email.classList.remove("invalid");
  password.classList.remove("invalid");
  dangerAlert.style.display = "none";


  if (username.value === "") {
    username.classList.add("invalid");
    username.focus();
    return false;
  } else if (username.value.trim().length < 3) {
    username.classList.add("invalid");
    username.focus();
    dangerAlert.innerHTML = `
      <div class="alert-danger">
        <p>Username must be at least 3 characters</p>
      </div>
    `;
    dangerAlert.style.display = "block";

    return false;
  }

  if (email.value === "") {
    email.classList.add("invalid");
    email.focus();
    return false;
  } else if (!email.value.trim().endsWith("@gmail.com")) {
    email.classList.add("invalid");
    email.focus();

    dangerAlert.innerHTML = `
    <div class="alert-danger">
      <p>Email must end with @gmail.com</p>
    </div>
    `;
    dangerAlert.style.display = "block";
    return false;
  }

  if (password.value === "") {
    password.classList.add("invalid");
    password.focus();
    return false;
  } else if (password.value.trim().length < 8) {
    password.classList.add("invalid");
    password.focus();

    dangerAlert.innerHTML = `
    <div class="alert-danger">
      <p>Password must be 8 characters long</p>
    </div>
    `;
    dangerAlert.style.display = "block";
    return false;
  }

  // Kirim data pakai fetch
  fetch("/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: username.value,
      email: email.value,
      password: password.value,
    }),
  })
    .then((res) => res.text())
    .then((result) => {
      if (result === "success") {
        // Slide ke form login
        document.querySelector("main").classList.remove("sign-up-mode");

        // Tampilkan pesan sukses dengan animasi
        const alertContainer = document.getElementById("alert-container");
        alertContainer.innerHTML = `
        <div class="alert-success">
          <p>Registered successfully. Log in</p>
        </div>
      `;

        // Menampilkan alert dengan transisi
        alertContainer.style.display = "block";
        dangerAlert.style.display = "none";
      } else {
        dangerAlert.innerHTML = `
        <div class="alert-danger">
          <p>${result}</p>
        </div>
      `;
        dangerAlert.style.display = "block";
      }
    })
    .catch((err) => {
      console.error("Error saat register:", err);
      dangerAlert.innerHTML = `
      <div class="alert-danger">
        <p>Something went wrong. Please try again in a moment</p>
      </div>
    `;
    dangerAlert.style.display = "block";
    });

  return false; // Prevent form submit biasa
}

document.querySelectorAll(".input-field").forEach((input) => {
  input.addEventListener("input", () => {
    input.classList.remove("invalid");
  });
});

function togglePassword() {
  const passwordInputs = document.querySelectorAll(
    ".password-input, .password2-input, .pass2-input"
  );
  const eyeIcons = document.querySelectorAll(".eye-icon");

  passwordInputs.forEach((passwordInput, index) => {
    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      eyeIcons[index].classList.remove("bx-hide");
      eyeIcons[index].classList.add("bx-show");
    } else {
      passwordInput.type = "password";
      eyeIcons[index].classList.remove("bx-show");
      eyeIcons[index].classList.add("bx-hide");
    }
  });
}

function validateSendEmail() {
  const emailInput = document.querySelector(".email-input");
  const alertContainer = document.getElementById("alert-container");
  const succes = document.getElementById("useremail");

  // Reset tampilan validasi
  emailInput.classList.remove("invalid");
  alertContainer.style.display = "none";

  if (emailInput.value.trim() === "") {
    emailInput.classList.add("invalid");
    emailInput.focus();
    return false;
  }

  // Kirim email ke backend
  fetch("/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: emailInput.value }),
  })
    .then((res) => res.json())
    .then((result) => {
      if (result.status === "success") {
        document.querySelector("main").classList.add("sign-up-mode");
        succes.innerHTML = `${result.message}`;
        startResendCountdown();
      } else {
        alertContainer.innerHTML = `
        <div class="alert-danger">
          <p>${result.message}</p>
        </div>`;
        alertContainer.style.display = "block";
      }

   

    })
    .catch((err) => {
      console.error("Error:", err);
      alertContainer.innerHTML = `
      <div class="alert-danger">
        <p>Something went wrong. Please try again in a moment</p>
      </div>`;
      alertContainer.style.display = "block";
    });

  return false; // Mencegah submit form bawaan
}





let resendInterval; // agar bisa clearInterval jika perlu

function startResendCountdown() {
  const countdownEl = document.getElementById("countdown");
  const resendBtn = document.getElementById("resend-btn");
  let timeLeft = 30;

  // Disable tombol
  resendBtn.classList.add("disabled");
  resendBtn.setAttribute("disabled", "true");
  countdownEl.textContent = timeLeft;

  resendInterval = setInterval(() => {
    timeLeft--;
    countdownEl.textContent = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(resendInterval);
      resendBtn.classList.remove("disabled");
      resendBtn.removeAttribute("disabled");
      countdownEl.textContent = "0";
    }
  }, 1000);
}

function resendOTP() {
  validateSendEmail(); // Gunakan ulang saja
}




const inputOtp = document.querySelectorAll(".otp-input input");

inputOtp.forEach((input, index) => {
  input.addEventListener("input", (e) => {
    if (e.target.value.length > 1) {
      e.target.value = e.target.value.slice(0, 1);
    }
    if (e.target.value.length === 1) {
      if (index < inputOtp.length - 1) {
        inputOtp[index + 1].focus();
      }
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !e.target.value) {
      if (index > 0) {
        inputOtp[index - 1].focus();
      }
    }
    if (e.key === "e") {
      e.preventDefault();
    }
  });
});



function validateOTP() {
  const otpInputs = document.querySelectorAll('.otp-input input');
  const alertContainer = document.getElementById("danger-container");
  let isValid = true;
  let otpValue = '';

  otpInputs.forEach(input => {
    input.classList.remove('invalid');

    if (input.value.trim() === '') {
      input.classList.add('invalid');
      if (isValid) input.focus(); // Fokus hanya ke input kosong pertama
      isValid = false;
    } else {
      otpValue += input.value;
    }
  });

  if (!isValid) return false;

  // Kirim OTP ke server (contoh menggunakan fetch POST)
  fetch('/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ otp: otpValue })
  })
  .then(res => res.json())
  .then(result => {
    if (result.status === 'success') {
      window.location.href = result.redirectTo;
    } else {
      alertContainer.innerHTML = `
        <div class="alert-danger">
          <p>${result.message}</p>
        </div>`;
      alertContainer.style.display = "block";

    }
  })
  .catch(err => {
    console.error(err);
    alertContainer.innerHTML = `
    <div class="alert-danger">
      <p>Something went wrong. Please try again in a moment</p>
    </div>`;
    alertContainer.style.display = "block";

  });

  return false; // Mencegah submit form bawaan
}



function validateReset() {
  const pass1 = document.querySelector(".pass1-input");
  const pass2 = document.querySelector(".pass2-input");
  const alertContainer = document.getElementById("alert-container");

  pass1.classList.remove("invalid");
  pass2.classList.remove("invalid");
  alertContainer.style.display = "none";
  alertContainer.innerHTML = "";

  if (pass1.value === "") {
    pass1.classList.add("invalid");
    pass1.focus();
    return false;
  }

  if (pass2.value === "") {
    pass2.classList.add("invalid");
    pass2.focus();
    return false;
  }

  if (pass1.value !== pass2.value) {
    pass1.classList.add("invalid");
    pass2.classList.add("invalid");
    alertContainer.innerHTML = `
      <div class="alert-danger">
        <p>Passwords do not match.</p>
      </div>`;
    alertContainer.style.display = "block";
    return false;
  }

  else if (pass1.value.trim().length < 8 || pass2.value.trim().length < 8) {
    alertContainer.innerHTML = `
      <div class="alert-danger">
        <p>Password must be 8 characters long</p>
      </div>
    `;
    alertContainer.style.display = "block";
    return false;
  }

  // Pass validation, submit form
  return true;
}