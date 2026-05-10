const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { db } = require("../db");

require('dotenv').config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

function initializePassport() {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/callback",
      },
      (accessToken, refreshToken, profile, done) => {
        const googleId = profile.id;
        const name = profile.displayName;
        const email = profile.emails[0].value;
        const googleProfileImage = profile.photos[0].value;

        // Cek apakah user dengan googleId sudah ada
        db.query(
          "SELECT * FROM users WHERE google_id = ?",
          [googleId],
          (err, results) => {
            if (err) return done(err);

            if (results.length > 0) {
              // User sudah ada
              const existingUser = results[0];
              const isDefaultProfile = existingUser.profile_user === '/uploads/profile/default/default_pp.jpg';
              
              // Cek apakah user pernah mengubah nama di aplikasi
              // Jika original_name ada dan name_user berbeda dengan original_name, 
              // berarti user sudah mengubah namanya di aplikasi
              const hasChangedName = existingUser.original_name && 
                                    existingUser.name_user !== existingUser.original_name;
              
              // Update user, tapi jangan ganti data yang sudah diubah user
              const updateFields = [];
              const updateValues = [];
              
              // Update email (biasanya email tidak berubah)
              if (existingUser.email_user !== email) {
                updateFields.push('email_user = ?');
                updateValues.push(email);
              }
              
              // Update profile_user HANYA jika masih menggunakan default
              if (isDefaultProfile) {
                updateFields.push('profile_user = ?');
                updateValues.push(googleProfileImage);
              }
              
              // Update name_user HANYA jika belum pernah diubah oleh user
              // DAN jika nama dari Google berbeda dengan yang ada di database
              if (!hasChangedName && existingUser.name_user !== name) {
                updateFields.push('name_user = ?');
                updateValues.push(name);
              }
              
              // Simpan/update original_name dari Google
              // Jika belum ada original_name, simpan
              // Jika sudah ada, update hanya jika user belum mengubah namanya
              if (!existingUser.original_name) {
                updateFields.push('original_name = ?');
                updateValues.push(name);
              } else if (!hasChangedName && existingUser.original_name !== name) {
                // Update original_name hanya jika user belum mengubah namanya
                // dan nama Google berubah
                updateFields.push('original_name = ?');
                updateValues.push(name);
              }
              
              updateValues.push(googleId); // untuk WHERE clause
              
              if (updateFields.length > 0) {
                const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE google_id = ?`;
                db.query(
                  updateQuery,
                  updateValues,
                  (err) => {
                    if (err) return done(err);
                    
                    // Return user dengan data yang benar
                    const updatedUser = { ...existingUser };
                    
                    // Update email jika diubah
                    if (existingUser.email_user !== email) {
                      updatedUser.email_user = email;
                    }
                    
                    // Update nama jika diupdate
                    if (!hasChangedName && existingUser.name_user !== name) {
                      updatedUser.name_user = name;
                    }
                    
                    // Update profile_user di response jika memang diupdate
                    if (isDefaultProfile) {
                      updatedUser.profile_user = googleProfileImage;
                    }
                    
                    // Update original_name jika diubah
                    if (!existingUser.original_name) {
                      updatedUser.original_name = name;
                    } else if (!hasChangedName && existingUser.original_name !== name) {
                      updatedUser.original_name = name;
                    }
                    
                    return done(null, updatedUser);
                  }
                );
              } else {
                // Tidak ada yang diupdate, return user yang ada
                return done(null, existingUser);
              }
            } else {
              // Belum ada, simpan sebagai user baru
              // Cek apakah email sudah terdaftar dengan metode lain
              db.query(
                "SELECT * FROM users WHERE email_user = ?",
                [email],
                (err, emailResults) => {
                  if (err) return done(err);
                  
                  if (emailResults.length > 0) {
                    // Email sudah terdaftar, link dengan Google ID
                    const userFromEmail = emailResults[0];
                    
                    // Cek apakah user ini sudah punya nama custom
                    const hasExistingName = userFromEmail.name_user;
                    
                    // Jika user sudah ada tanpa Google, kita perlu set original_name
                    // Jika user sudah mengubah namanya, pertahankan nama tersebut
                    const originalNameToSet = hasExistingName ? userFromEmail.name_user : name;
                    
                    const updateQuery = `UPDATE users SET google_id = ?, original_name = ? WHERE email_user = ?`;
                    db.query(
                      updateQuery,
                      [googleId, originalNameToSet, email],
                      (err) => {
                        if (err) return done(err);
                        
                        const linkedUser = {
                          ...userFromEmail,
                          google_id: googleId,
                          original_name: originalNameToSet
                        };
                        return done(null, linkedUser);
                      }
                    );
                  } else {
                    // Email belum terdaftar, buat user baru
                    const insertQuery = `INSERT INTO users (name_user, email_user, profile_user, google_id, original_name) VALUES (?, ?, ?, ?, ?)`;
                    db.query(
                      insertQuery,
                      [name, email, googleProfileImage, googleId, name],
                      (err, insertResult) => {
                        if (err) return done(err);

                        const newUser = {
                          id_user: insertResult.insertId,
                          name_user: name,
                          email_user: email,
                          profile_user: googleProfileImage,
                          google_id: googleId,
                          original_name: name,
                        };

                        return done(null, newUser);
                      }
                    );
                  }
                }
              );
            }
          }
        );
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id_user);
  });

  passport.deserializeUser((id, done) => {
    const query = "SELECT * FROM users WHERE id_user = ?";
    db.query(query, [id], (err, results) => {
      if (err) return done(err);
      done(null, results[0]);
    });
  });
}

module.exports = initializePassport;