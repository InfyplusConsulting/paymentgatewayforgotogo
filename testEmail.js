// // // testEmail.js
// require("dotenv").config();
// const nodemailer = require("nodemailer");

// const transporter = nodemailer.createTransport({
//   host: "sg2plzcpnl506974.prod.sin2.secureserver.net", // from your image
//   port: 465,
//   secure: true, // SSL
//   auth: {
//     user: "bookings@gotogotravelsolutions.com",
//     pass: process.env.EMAIL_PASS, // make sure this is correct
//   },
//   logger: true,
//   debug: true,
// });






// async function sendTestEmail() {
//   try {
//     await transporter.sendMail({
//       from: '"GoToGo Test" <bookings@gotogotravelsolutions.com>',
//       to: "devanshrajput032006@gmail.com", 
//       subject: "✅ GoToGo Email Test",
//       text: "This is a test email from your payment backend.",
//     });

//     console.log("✅ Test email sent successfully!");
//   } catch (err) {
//     console.error("❌ Failed to send email:", err.message);
//   }
// }

// sendTestEmail();



