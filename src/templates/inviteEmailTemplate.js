const inviteEmailTemplate = ({ inviteLink, organization, role, team }) => {
  const safeOrganization = organization || "your organization";
  const safeRole = role || "Team Member";
  const safeTeam = team || "Your Team";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're invited to WorkComposer</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#f3f4f8;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  color:#111827;
">

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background:#f3f4f8; padding:40px 16px;"
  >
    <tr>
      <td align="center">

        <!-- Main Container -->
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            max-width:620px;
            background:#ffffff;
            border-radius:20px;
            overflow:hidden;
            border:1px solid #e5e7eb;
            box-shadow:0 12px 40px rgba(15,23,42,0.08);
          "
        >

          <!-- Header -->
          <tr>
            <td
              style="
                padding:34px 30px 42px;
                text-align:center;
                background:
                  linear-gradient(135deg,#312e81 0%,#4f46e5 50%,#6366f1 100%);
              "
            >

              <!-- Decorative glow -->
              <div style="
                width:64px;
                height:64px;
                margin:0 auto 18px;
                border-radius:18px;
                background:rgba(255,255,255,0.14);
                border:1px solid rgba(255,255,255,0.25);
                line-height:64px;
                text-align:center;
                font-size:28px;
                color:#ffffff;
              ">
                W
              </div>

              <div style="
                color:#ffffff;
                font-size:25px;
                font-weight:700;
                letter-spacing:-0.5px;
              ">
                WorkComposer
              </div>

              <div style="
                margin-top:8px;
                color:rgba(255,255,255,0.78);
                font-size:13px;
              ">
                Work smarter. Stay connected.
              </div>

            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:42px 38px 36px;">

              <!-- Invitation Badge -->
              <div style="
                text-align:center;
                margin-bottom:22px;
              ">
                <span style="
                  display:inline-block;
                  padding:7px 14px;
                  border-radius:999px;
                  background:#eef2ff;
                  color:#4f46e5;
                  font-size:12px;
                  font-weight:700;
                  letter-spacing:0.4px;
                  text-transform:uppercase;
                ">
                  You're Invited
                </span>
              </div>

              <!-- Heading -->
              <h1 style="
                margin:0;
                text-align:center;
                color:#111827;
                font-size:30px;
                line-height:1.25;
                letter-spacing:-0.8px;
                font-weight:750;
              ">
                Join ${safeOrganization}
              </h1>

              <p style="
                margin:16px auto 0;
                max-width:480px;
                text-align:center;
                color:#6b7280;
                font-size:15px;
                line-height:1.7;
              ">
                You've been invited to collaborate with
                <strong style="color:#374151;">
                  ${safeOrganization}
                </strong>
                on WorkComposer.
              </p>

              <!-- Invitation Details Card -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  margin-top:30px;
                  border-radius:16px;
                  background:#f8fafc;
                  border:1px solid #e5e7eb;
                  overflow:hidden;
                "
              >

                <tr>
                  <td style="padding:20px 22px 8px;">

                    <div style="
                      color:#374151;
                      font-size:13px;
                      font-weight:700;
                      text-transform:uppercase;
                      letter-spacing:0.5px;
                    ">
                      Invitation Details
                    </div>

                  </td>
                </tr>

                <!-- Organization -->
                <tr>
                  <td style="padding:12px 22px;">

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>

                        <td width="42" valign="middle">
                          <div style="
                            width:36px;
                            height:36px;
                            border-radius:10px;
                            background:#eef2ff;
                            color:#4f46e5;
                            text-align:center;
                            line-height:36px;
                            font-size:16px;
                            font-weight:700;
                          ">
                            O
                          </div>
                        </td>

                        <td style="padding-left:12px;">
                          <div style="
                            color:#9ca3af;
                            font-size:11px;
                            text-transform:uppercase;
                            letter-spacing:0.4px;
                          ">
                            Organization
                          </div>

                          <div style="
                            margin-top:3px;
                            color:#111827;
                            font-size:14px;
                            font-weight:600;
                          ">
                            ${safeOrganization}
                          </div>
                        </td>

                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Role -->
                <tr>
                  <td style="padding:12px 22px;">

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>

                        <td width="42" valign="middle">
                          <div style="
                            width:36px;
                            height:36px;
                            border-radius:10px;
                            background:#ecfdf5;
                            color:#059669;
                            text-align:center;
                            line-height:36px;
                            font-size:16px;
                            font-weight:700;
                          ">
                            R
                          </div>
                        </td>

                        <td style="padding-left:12px;">
                          <div style="
                            color:#9ca3af;
                            font-size:11px;
                            text-transform:uppercase;
                            letter-spacing:0.4px;
                          ">
                            Role
                          </div>

                          <div style="
                            margin-top:3px;
                            color:#111827;
                            font-size:14px;
                            font-weight:600;
                            text-transform:capitalize;
                          ">
                            ${safeRole}
                          </div>
                        </td>

                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Team -->
                <tr>
                  <td style="padding:12px 22px 22px;">

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>

                        <td width="42" valign="middle">
                          <div style="
                            width:36px;
                            height:36px;
                            border-radius:10px;
                            background:#fff7ed;
                            color:#ea580c;
                            text-align:center;
                            line-height:36px;
                            font-size:16px;
                            font-weight:700;
                          ">
                            T
                          </div>
                        </td>

                        <td style="padding-left:12px;">
                          <div style="
                            color:#9ca3af;
                            font-size:11px;
                            text-transform:uppercase;
                            letter-spacing:0.4px;
                          ">
                            Team
                          </div>

                          <div style="
                            margin-top:3px;
                            color:#111827;
                            font-size:14px;
                            font-weight:600;
                          ">
                            ${safeTeam}
                          </div>
                        </td>

                      </tr>
                    </table>

                  </td>
                </tr>

              </table>

              <!-- CTA -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="margin-top:32px;"
              >
                <tr>
                  <td align="center">

                    <a
                      href="${inviteLink}"
                      target="_blank"
                      style="
                        display:inline-block;
                        padding:15px 30px;
                        border-radius:11px;
                        background:#4f46e5;
                        color:#ffffff;
                        text-decoration:none;
                        font-size:15px;
                        font-weight:700;
                        box-shadow:0 8px 20px rgba(79,70,229,0.28);
                      "
                    >
                      Accept Invitation
                      <span style="
                        margin-left:8px;
                        font-size:17px;
                      ">
                        →
                      </span>
                    </a>

                  </td>
                </tr>
              </table>

              <!-- Link fallback -->
              <p style="
                margin:24px 0 0;
                text-align:center;
                color:#9ca3af;
                font-size:12px;
                line-height:1.6;
              ">
                If the button doesn't work, copy and paste this link into your browser:
              </p>

              <p style="
                margin:7px auto 0;
                max-width:500px;
                text-align:center;
                word-break:break-all;
                font-size:12px;
              ">
                <a
                  href="${inviteLink}"
                  style="
                    color:#4f46e5;
                    text-decoration:none;
                  "
                >
                  ${inviteLink}
                </a>
              </p>

              <!-- Expiration -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  margin-top:30px;
                  background:#fffbeb;
                  border:1px solid #fde68a;
                  border-radius:12px;
                "
              >
                <tr>
                  <td style="padding:14px 16px;">

                    <div style="
                      color:#92400e;
                      font-size:13px;
                      line-height:1.6;
                    ">
                      <strong>Invitation expires in 24 hours.</strong>
                      Please accept it before the invitation expires.
                    </div>

                  </td>
                </tr>
              </table>

              <p style="
                margin:25px 0 0;
                text-align:center;
                color:#9ca3af;
                font-size:12px;
                line-height:1.6;
              ">
                Didn't expect this invitation?
                You can safely ignore this email.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td
              style="
                padding:24px 30px;
                text-align:center;
                background:#f8fafc;
                border-top:1px solid #e5e7eb;
              "
            >

              <div style="
                color:#374151;
                font-size:13px;
                font-weight:600;
              ">
                WorkComposer
              </div>

              <div style="
                margin-top:6px;
                color:#9ca3af;
                font-size:11px;
                line-height:1.5;
              ">
                Productivity and workforce management, simplified.
              </div>

              <div style="
                margin-top:12px;
                color:#9ca3af;
                font-size:11px;
              ">
                © 2026 WorkComposer. All rights reserved.
              </div>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
};

export default inviteEmailTemplate;
