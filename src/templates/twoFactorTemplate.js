const twoFactorTemplate = ({ firstName, otp }) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto;">
      <h2>Two-Factor Authentication</h2>

      <p>Hello ${firstName},</p>

      <p>Your WorkComposer verification code is:</p>

      <div
        style="
          font-size:32px;
          font-weight:bold;
          letter-spacing:8px;
          text-align:center;
          margin:30px 0;
          color:#4F46E5;
        "
      >
        ${otp}
      </div>

      <p>This code will expire in <b>10 minutes</b>.</p>

      <p>If you didn't attempt to sign in, you can safely ignore this email.</p>

      <br/>

      <p>— WorkComposer Security</p>
    </div>
  `;
};

export default twoFactorTemplate;