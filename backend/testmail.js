import 'dotenv/config';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: { rejectUnauthorized: false }
});

const info = await transporter.sendMail({
  from: `"TEST" <${process.env.SMTP_USER}>`,
  to: process.env.NOTIFY_TO_EMAIL,
  subject: 'SMTP TEST – SHOULD ARRIVE',
  text: 'If you read this, SMTP is OK.'
});

console.log('TEST SENT:', info.messageId);
