const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOtpEmail = async (email, otp) => {
  await transporter.sendMail({
    from: `"GoCarry" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "GoCarry Password Reset OTP",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
        <h2>Reset Your Password</h2>

        <p>
          We received a request to reset your GoCarry password.
        </p>

        <p>Your verification code is:</p>

        <div style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          padding: 20px;
          background: #f5f5f5;
          text-align: center;
        ">
          ${otp}
        </div>

        <p>
          This code will expire in <strong>1 minute</strong>.
        </p>

        <p>
          If you did not request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  });
};

module.exports = {
  sendOtpEmail,
};
