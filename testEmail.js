// // testEmail.js
// require("dotenv").config();
// const nodemailer = require("nodemailer");

// const transporter = nodemailer.createTransport({
//   host: "smtp.secureserver.net",
//   port: 587,
//   secure: false,
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

// const sendBookingEmail = require("./utils/sendBookingEmail"); // adjust the path if needed

// const testBookingData = {
//   ticketNumber: "G2G123456",
//   names: ["Devansh Rajput", "John Doe"],
//   phones: ["9876543210", "9123456789"],
//   pickupDate: "2025-07-09",
//   pickupLocation: "Delhi IGI Airport T1",
//   boardingTime: "05:30 AM",
//   terminal: "T3",
//   serviceType: "Airport Drop",
//   amountPaid: 899,
//   paymentId: "pay_LoREMipsUM123"
// };

// async function test() {
//   try {
//     await sendBookingEmail(testBookingData, "devanshrajput032006@gmail.com", false); // change this email
//     console.log("✅ Email sent successfully to user");

//     await sendBookingEmail(testBookingData, "devanshbusinesswork@gmail.com", true); // test admin version
//     console.log("✅ Email sent successfully to admin");
//   } catch (error) {
//     console.error("❌ Email sending failed:", error.message);
//   }
// }

// test();

