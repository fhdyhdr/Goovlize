const session = require('express-session');

module.exports = session({
  secret: 'dayum_shaazin_cooking_in_14-06-04',
  resave: false,
  saveUninitialized: true, // Ubah ke true untuk development
  cookie: {
    secure: false, // true jika HTTPS
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 hari
  }
});