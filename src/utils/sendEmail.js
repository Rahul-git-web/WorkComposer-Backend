import { Resend } from "resend";

const sendEmail = async (to, subject, html) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    if (response.error) {
      console.error("RESEND ERROR:", response.error);
      throw new Error(response.error.message);
    }



    return response.data;
  } catch (err) {
    console.error("EMAIL ERROR:", err);

    throw err;
  }
};

export default sendEmail;
