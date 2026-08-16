const dailyWarningEmailTemplate = ({
  firstName,
  workedTime,
  expectedTime,
}) => {
  return `
    <div style="font-family: Arial, sans-serif; background:#f3f4f6; padding:40px 20px;">

      <div style="max-width:600px; margin:auto; background:white; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb;">

        <div style="background:#f59e0b; padding:24px; text-align:center;">
          <h1 style="color:white; margin:0;">
            WorkComposer
          </h1>
        </div>

        <div style="padding:40px 30px;">

          <h2 style="margin-top:0; color:#111827;">
            Daily Work Time Warning
          </h2>

          <p style="color:#4b5563; line-height:1.7;">
            Hi ${firstName},
          </p>

          <p style="color:#4b5563; line-height:1.7;">
            You have stopped tracking today before completing your expected working hours.
          </p>

          <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:20px; margin:25px 0;">

            <p style="margin:0 0 10px;">
              <strong>Expected:</strong> ${expectedTime}
            </p>

            <p style="margin:0;">
              <strong>Worked:</strong> ${workedTime}
            </p>

          </div>

          <p style="color:#6b7280;">
            If this is unexpected, please resume tracking or contact your manager.
          </p>

        </div>

        <div style="border-top:1px solid #e5e7eb; padding:20px; text-align:center; font-size:13px; color:#9ca3af;">
          © 2026 WorkComposer
        </div>

      </div>

    </div>
  `;
};

export default dailyWarningEmailTemplate;