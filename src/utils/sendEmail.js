import { BrevoClient } from "@getbrevo/brevo";

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

const sendEmail = async (to, subject, html) => {
  try {
    const response = await brevo.transactionalEmails.sendTransacEmail({
      sender: {
        name: "WorkComposer",
        email: process.env.EMAIL_FROM,
      },
      to: [
        {
          email: to,
        },
      ],
      subject,
      htmlContent: html,
    });

    console.log("BREVO EMAIL SENT:", response.messageId);

    return response;
  } catch (err) {
    console.error("BREVO EMAIL ERROR:", err);

    throw err;
  }
};

export default sendEmail;