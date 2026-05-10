const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'triasmara.johan@gmail.com',
    pass: 'eyep fqyq ihel uvyq' 
  }
});

function sendOTPEmail(toEmail, otp, callback) {
  const mailOptions = {
    from: '"Goovlize" <goovlize@gmail.com>',
    to: toEmail,
    subject: 'Kode OTP Reset Password',
    html: `
      <h3>Reset Password</h3>
      <p>Berikut adalah kode OTP Anda:</p>
      <h2>${otp}</h2>
      <p>Kode ini berlaku selama 5 menit.</p>
    `
  };

  transporter.sendMail(mailOptions, callback);
}

module.exports = { sendOTPEmail };
