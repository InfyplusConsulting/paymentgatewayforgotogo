const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.secureserver.net", // GoDaddy SMTP
  port: 587,
  secure: false,                  // true for SSL
  auth: {
    user: "bookings@gotogotravelsolutions.com",     // GoDaddy email
    pass: process.env.EMAIL_PASS,               // App password or normal password
  },
});

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: "devanshrajput032006@gmail.com",
//     pass: "isfy nmxh qvdx tuxg", // NOT your real password
//   },
// });

async function sendBookingEmail(bookingData, toEmail) {
  const {
    ticketNumber,
    names,
    phones,
    pickupDate,
    pickupLocation,
    boardingTime,
    terminal,
    serviceType,
    amountPaid,
    paymentId
  } = bookingData;

  const htmlContent = `
    <h2>🎫 GoToGo Airport Transfer Ticket</h2>
    <p><strong>Ticket No:</strong> ${ticketNumber}</p>
    <p><strong>Passengers:</strong></p>
    <ul>
      ${names.map((name, i) => `<li>${name} - ${phones[i]}</li>`).join("")}
    </ul>
    <p><strong>Pickup Date:</strong> ${pickupDate}</p>
    <p><strong>Pickup Location:</strong> ${pickupLocation}</p>
    <p><strong>Boarding Time:</strong> ${boardingTime}</p>
    <p><strong>Terminal:</strong> ${terminal}</p>
    <p><strong>Service Type:</strong> ${serviceType}</p>
    <p><strong>Amount Paid:</strong> ₹${amountPaid}</p>
    <p><strong>Payment ID:</strong> ${paymentId}</p>
    <br><p>Thank you for choosing GoToGo!</p>
  `;

  await transporter.sendMail({
    from: `"GoToGo Airport Shuttle Service" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Your GoToGo Ticket [${ticketNumber}]`,
    html: htmlContent
  });
}

module.exports = sendBookingEmail;
