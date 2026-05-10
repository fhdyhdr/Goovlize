const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { db } = require("../db");
const { sendOTPEmail } = require("../config/mailer");
const passport = require("passport");
const initializePassport = require("../config/passport-config");
initializePassport();

router.use(passport.initialize());
router.use(passport.session());

router.get("/login", (req, res) => {
  res.render("login");
});

router.get("/forgot", (req, res) => {
  res.render("forgot/forgot-password");
});

router.get('/resetpassword', (req, res) => {
  res.render('forgot/reset-password');
});

router.get("/logout", (req, res) => {
  // PERBAIKAN: Simpan session admin terlebih dahulu
  const adminSession = req.session.admin;
  
  // Logout Passport dengan callback
  req.logout((err) => {
    if (err) {
      console.error("Gagal logout passport:", err);
    }
    
    // Hapus HANYA session user
    delete req.session.user_id;
    delete req.session.otp;
    delete req.session.email;
    delete req.session.otpExpires;
    
    // Kembalikan session admin jika ada
    if (adminSession) {
      req.session.admin = adminSession;
      console.log('Session admin dikembalikan setelah user logout');
    }
    
    // Redirect ke halaman utama
    res.redirect("/");
  });
});

router.get(
  "/auth/google",
  (req, res, next) => {
    console.log('Google Auth route accessed');
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/auth/google/callback",
  (req, res, next) => {
    console.log('Google Callback route accessed');
    console.log('Query params:', req.query);
    console.log('Error params:', req.query.error);
    
    // Simpan session admin sebelum authentication
    req._savedAdminSession = req.session.admin;
    next();
  },
  passport.authenticate("google", { 
    failureRedirect: "/login",
    failureMessage: true 
  }),
  (req, res) => {
    console.log('Authentication successful, user:', req.user);
    const userId = req.user.id_user;

    if (!userId) {
      console.error("User ID tidak ditemukan di session");
      return res.redirect("/login");
    }

    // Set user session
    req.session.user_id = userId;
    
    // Kembalikan session admin jika ada
    if (req._savedAdminSession) {
      req.session.admin = req._savedAdminSession;
      console.log('Session admin dikembalikan setelah Google login');
    }
    
    console.log('Session set, redirecting to /');
    res.redirect("/");
  }
);

function checkEmailForgot(email, callback) {
  const query = "SELECT * FROM users WHERE email_user = ?";
  db.query(query, [email], (err, results) => {
    if (err) return callback(err, null);

    if (results.length === 0) {
      return callback(null, null); // User not found
    }

    const user = results[0];

    // Check if the email is a Google email and if it has a google_id
    if (user.email_user.includes("@gmail.com") && user.google_id) {
      return callback(null, { googleEmail: true }); // Indicate that it's a Google email
    }

    // Return the user if it's not a Google email or the user doesn't have a google_id
    callback(null, user);
  });
}

function checkEmailExists(email, callback) {
  const query = "SELECT id_user FROM users WHERE email_user = ?";
  db.execute(query, [email], (err, results) => {
    if (err) return callback(err);
    callback(null, results.length > 0);
  });
}

function insertUser(
  username,
  email,
  hashedPassword,
  profile_default,
  callback
) {
  const query =
    "INSERT INTO users (name_user, email_user, password_user, profile_user) VALUES (?, ?, ?, ?)";
  db.execute(
    query,
    [username, email, hashedPassword, profile_default],
    (err, results) => {
      if (err) return callback(err);
      callback(null, results);
    }
  );
}

function loginUser(email, callback) {
  const query = "SELECT * FROM users WHERE email_user = ?";
  db.query(query, [email], (err, results) => {
    if (err) return callback(err, null);
    if (results.length === 0) return callback(null, null);

    // Log the user to debug
    console.log(results[0]);

    return callback(null, results[0]);
  });
}

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  loginUser(email, (err, user) => {
    if (err) {
      console.error(err);
      return res.json({ status: "error", message: "Internal server error" });
    }

    if (!user) {
      return res.json({ status: "fail", message: "Email not found" });
    }

    // Pastikan user.password_user ada dan valid sebelum melakukan perbandingan
    if (!user.password_user) {
      return res.json({ status: "fail", message: "Password not set for user" });
    }

    const isPasswordMatch = bcrypt.compareSync(password, user.password_user);

    if (!isPasswordMatch) {
      return res.json({ status: "fail", message: "Incorrect password" });
    }

    // Jika login berhasil, simpan user_id dalam sesi
    req.session.user_id = user.id_user;

    // Kirim respons sukses ke client
    return res.json({ status: "success" });
  });
});

router.post("/register", (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const profile_default = "/uploads/profile/default/default_pp.jpg";

  checkEmailExists(email, (err, emailExists) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Internal server error");
    }

    if (emailExists) {
      return res.send("This email has already been taken");
    }

    insertUser(
      username,
      email,
      hashedPassword,
      profile_default,
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Failed to register");
        }

        // Jangan redirect, kirim teks 'success' untuk fetch
        return res.send("success");
      }
    );
  });
});

router.post("/send-email", (req, res) => {
  const { email } = req.body;

  checkEmailForgot(email, (err, user) => {
    if (err) {
      console.error(err);
      return res.json({
        status: "error",
        message:
          "Something went wrong with the database. Please try again later",
      });
    }

    if (!user) {
      return res.json({ status: "fail", message: "Email not found" });
    }

    // Check if it's a Google email
    if (user.googleEmail) {
      return res.json({ status: "fail", message: "Email not found" });
    }

    const otp = Math.floor(10000 + Math.random() * 90000); // Generate OTP (5 digits)

    sendOTPEmail(email, otp, (err, info) => {
      if (err) {
        console.error("Failed to send email:", err);
        return res.json({
          status: "error",
          message: "Failed to send OTP to email",
        });
      }

      console.log("Email sent:", info.response);

      // Save OTP and expiration time to the session
      req.session.otp = otp;
      req.session.email = email;
      req.session.otpExpires = Date.now() + 5 * 60 * 1000;

      return res.json({ status: "success", message: `${email}` });
    });
  });
});

router.post("/verify-otp", (req, res) => {
    const { otp } = req.body;
  
    const sessionOtp = req.session.otp;
    const otpExpires = req.session.otpExpires;
  
    // Cek apakah session OTP tersedia
    if (!sessionOtp || !otpExpires) {
      return res.json({
        status: "fail",
        reason: "no-session",
        message: "Session has expired or OTP is missing.",
      });
    }
  
    // Cek apakah OTP kadaluarsa
    if (Date.now() > otpExpires) {
      delete req.session.otp;
      delete req.session.otpExpires;
      return res.json({
        status: "fail",
        reason: "expired",
        message: "OTP code has expired",
      });
    }
  
    // Cek kecocokan OTP
    if (otp === sessionOtp.toString()) {
      delete req.session.otp;
      delete req.session.otpExpires;
      return res.json({ 
        status: "success",
        redirectTo: '/resetpassword' 
      });
    }
  
    return res.json({
      status: "fail",
      reason: "incorrect",
      message: "Kode OTP salah.",
    });
  });

router.post('/reset-password', (req, res) => {
    const { password1, password2 } = req.body;
    const email = req.session.email; // Ambil email dari session yang sudah ada setelah OTP valid
  
    // Cek jika session email tidak ada
    if (!email) {
      return res.redirect('/login'); // Redirect ke login jika tidak ada session email
    }
  
    if (password1 !== password2) {
      return res.json({ status: 'fail', message: 'Passwords do not match.' });
    }
  
    if (password1.length < 8) {
      return res.json({ status: 'fail', message: 'Password must be at least 8 characters.' });
    }
  
    // Hash password baru menggunakan bcrypt
    bcrypt.hash(password1, 10, (err, hashedPassword) => {
      if (err) {
        console.error(err);
        return res.json({ status: 'error', message: 'Something went wrong. Please try again.' });
      }
  
      // Update password di database
      const query = 'UPDATE users SET password_user = ? WHERE email_user = ?';
      db.query(query, [hashedPassword, email], (err, result) => {
        if (err) {
          console.error(err);
          return res.json({ status: 'error', message: 'Failed to update password.' });
        }
  
        // Password berhasil diupdate, hapus session OTP
        delete req.session.otp;
        delete req.session.email;
        delete req.session.otpExpires;
  
        res.redirect('/login');
      });
    });
});

module.exports = router;