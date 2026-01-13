import nodemailer from "nodemailer";

export {
  buildOrderConfirmationEmail,
  type OrderConfirmationEmailContent,
} from "./orders/order-confirmation-template";

// Initialize transporter only if email credentials are configured
const getTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

export interface SendMailParams {
  sendTo: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendMail({
  sendTo,
  subject,
  text,
  html,
}: SendMailParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const transporter = getTransporter();

  if (!transporter) {
    const error =
      "Email configuration missing: EMAIL_USER or EMAIL_PASS not set";
    console.error(error);
    return { success: false, error };
  }

  // Validate required fields
  if (!sendTo || !subject) {
    const error =
      "Missing required email fields: sendTo and subject are required";
    console.error(error);
    return { success: false, error };
  }

  if (!html && !text) {
    const error = "Email must have either html or text content";
    console.error(error);
    return { success: false, error };
  }

  try {
    // Verify connection (optional check)
    await transporter.verify();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Email transporter verification failed:", errorMessage);
    // Continue anyway - verification failure doesn't always mean send will fail
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: sendTo,
      subject,
      text: text || undefined,
      html: html || undefined,
    });

    console.log("Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to send email:", errorMessage);
    return { success: false, error: errorMessage };
  }
}
