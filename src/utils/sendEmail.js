import { Resend } from "resend";

const sendEmail = async (to, subject, html) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    console.log("RESEND SUCCESS:", data);

    return data;

  } catch (err) {

    console.log("EMAIL ERROR:", err);

    throw err;
  }
};

export default sendEmail;