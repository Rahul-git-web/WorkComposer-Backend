const verifyEmailTemplate = ({
  verifyUrl,
  firstName,
}) => {
  return `
    <div style="font-family: Arial, sans-serif; background:#f3f4f6; padding:40px 20px;">

      <div style="max-width:600px; margin:auto; background:white; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb;">

        <div style="background:#4f46e5; padding:24px; text-align:center;">
          <h1 style="color:white; margin:0;">
            WorkComposer
          </h1>
        </div>

        <div style="padding:40px 30px;">

          <h2 style="margin-top:0; color:#111827;">
            Verify your email
          </h2>

          <p style="color:#4b5563; line-height:1.7;">
            Hi ${firstName},
          </p>

          <p style="color:#4b5563; line-height:1.7;">
            Thanks for creating your WorkComposer account.
            Please verify your email address to continue.
          </p>

          <div style="text-align:center; margin:35px 0;">
            <a
              href="${verifyUrl}"
              style="
                background:#4f46e5;
                color:white;
                padding:14px 28px;
                border-radius:8px;
                text-decoration:none;
                font-weight:600;
                display:inline-block;
              "
            >
              Verify Email
            </a>
          </div>

          <p style="color:#6b7280; font-size:14px;">
            This verification link expires in 24 hours.
          </p>

        </div>

        <div style="border-top:1px solid #e5e7eb; padding:20px; text-align:center; font-size:13px; color:#9ca3af;">
          © 2026 WorkComposer
        </div>

      </div>

    </div>
  `;
};

export default verifyEmailTemplate;