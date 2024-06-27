const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');

const sendMail = async (options) => {
  const Transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    service: process.env.SMTP_SERVICE,
    secure: true,
    tls: {
      rejectUnAuthorized: true,
    },
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  const { email, subject, template, data } = options;

  //get the path to the email template file
  const templatePath = path.join(__dirname, '../mails', template);

  //render the email templates with ejs
  const html = await ejs.renderFile(templatePath, data);

  //send the mail
  const mailOptions = {
    from: process.env.SMTP_MAIL,
    to: email,
    subject,
    html,
  };
  await Transporter.sendMail(mailOptions);
};

module.exports = sendMail;
