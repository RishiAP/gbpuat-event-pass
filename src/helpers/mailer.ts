import nodemailer from "nodemailer";
interface ServerConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
    }
  const serverOptions: ServerConfig = {
    host: String(process.env.SMTP_HOST),
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: String(process.env.SMTP_USERNAME),
      pass: String(process.env.SMTP_PASSWORD),
    },
  };
  // create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport(serverOptions);
  // async..await is not allowed in global scope, must use a wrapper
export default async function sendEmail(from:string,to:string,subject:string,text:string,html:string) {
    // send mail with defined transport object
    const info = await transporter.sendMail({
      from, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });
  
    return info.messageId;
    // Message sent: <d786aa62-4e0a-070a-47ed-0b0666549519@ethereal.email>
  }
  