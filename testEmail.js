// // testEmail.js
// require("dotenv").config();
// const nodemailer = require("nodemailer");

// const transporter = nodemailer.createTransport({
//   host: "smtp.secureserver.net",
//   port: 465,
//   secure: true,
//   auth: {
//     user: "bookings@gotogotravelsolutions.com",
//     pass: process.env.EMAIL_PASS,
//   },
//   logger: true,      // 🔍 Logs info to console
//   debug: true        // 🔍 Shows detailed SMTP logs
// });

// // const transporter = nodemailer.createTransport({
// //   service: "gmail",
// //   auth: {
// //     user: "devanshrajput032006@gmail.com",
// //     pass: "my_app_password", // NOT your real password
// //   },
// // });



// async function sendTestEmail() {
//   try {
//     await transporter.sendMail({
//       from: '"GoToGo Test" <bookings@gotogotravelsolutions.com>',
//       to: "devanshrajput032006@gmail.com", // Change this to your personal email
//       subject: "✅ GoToGo Email Test",
//       text: "This is a test email from your payment backend.",
//     });

//     console.log("✅ Test email sent successfully!");
//   } catch (err) {
//     console.error("❌ Failed to send email:", err.message);
//   }
// }

// sendTestEmail();
