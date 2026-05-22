const inviteEmailTemplate = ({ inviteLink, organization, role, team }) => {
  return `
    <div style="font-family: Arial, sans-serif; background:#f4f4f5; padding:40px 20px;">
      
      <div style="max-width:600px; margin:auto; background:white; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb;">
        
        <div style="background:#4f46e5; padding:24px; text-align:center;">
          <h1 style="color:white; margin:0; font-size:28px;">
            WorkComposer
          </h1>
        </div>

        <div style="padding:40px 30px;">

          <h2 style="margin-top:0; color:#111827;">
            You're invited to join ${organization}
          </h2>

          <p style="color:#4b5563; font-size:15px; line-height:1.7;">
            You have been invited to join 
            <strong>${organization}</strong> on WorkComposer.
          </p>

          <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:20px; margin:25px 0;">
            
            <p style="margin:0 0 10px;">
              <strong>Role:</strong> ${role}
            </p>

            <p style="margin:0;">
              <strong>Team:</strong> ${team}
            </p>

          </div>

          <div style="text-align:center; margin:35px 0;">
            <a 
              href="${inviteLink}"
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
              Accept Invitation
            </a>
          </div>

          <p style="color:#6b7280; font-size:14px; line-height:1.6;">
            This invitation may expire in a few days.
          </p>

          <p style="color:#6b7280; font-size:14px;">
            If you did not expect this invitation, you can safely ignore this email.
          </p>

        </div>

        <div style="border-top:1px solid #e5e7eb; padding:20px; text-align:center; font-size:13px; color:#9ca3af;">
          © 2026 WorkComposer. All rights reserved.
        </div>

      </div>
    </div>
  `;
};

export default inviteEmailTemplate;
