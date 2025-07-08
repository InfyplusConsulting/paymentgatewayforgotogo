const nodemailer = require("nodemailer");

// const transporter = nodemailer.createTransport({
//   host: "smtp.secureserver.net", // GoDaddy SMTP
//   port: 587,
//   secure: false,                  // true for SSL
//   auth: {
//     user: "bookings@gotogotravelsolutions.com",     // GoDaddy email
//     pass: process.env.EMAIL_PASS,               // App password or normal password
//   },
// });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "devanshrajput032006@gmail.com",
    pass: "isfy nmxh qvdx tuxg", // NOT your real password
  },
});

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
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; padding: 30px; border-radius: 10px; background-color: #ffffff; color: #333;">
  <h2 style="color: #0c52a2; text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px;">
    🎫 GoToGo Airport Shuttle Ticket
  </h2>

  <p style="font-size: 16px;"><strong>Ticket No:</strong> ${ticketNumber}</p>

  <p style="font-size: 16px;"><strong>Passengers:</strong></p>
  <ul style="padding-left: 20px; font-size: 16px; margin-top: 0;">
    ${names.map((name, i) => `<li>${name} - ${phones[i]}</li>`).join("")}
  </ul>

  <p style="font-size: 16px;"><strong>Pickup Date:</strong> ${pickupDate}</p>
  <p style="font-size: 16px;"><strong>Pickup Location:</strong> ${pickupLocation}</p>
  <p style="font-size: 16px;"><strong>Boarding Time:</strong> ${boardingTime}</p>
  <p style="font-size: 16px;"><strong>Terminal:</strong> ${terminal}</p>
  <p style="font-size: 16px;"><strong>Service Type:</strong> ${serviceType}</p>

  <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

  <p style="font-size: 16px;"><strong>Amount Paid:</strong> ₹${amountPaid}</p>
  <p style="font-size: 16px;"><strong>Payment ID:</strong> ${paymentId}</p>

  <div style="margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #0c52a2;">
    <p style="margin: 0; font-size: 15px;">Thank you for choosing <strong>GoToGo Airport Shuttle</strong>. We wish you a smooth and comfortable journey!</p>
  </div>

  <p style="font-size: 13px; color: #999; text-align: center; margin-top: 40px;">
    This is an automated message. For assistance, contact us at <a href="mailto:care@gotogotravelsolutions.com" style="color: #0c52a2;">info@gotogo.com</a>.<br />
    Visit <a href="https://gotogo.in" style="color: #0c52a2; text-decoration: none;">gotogo.in</a> for more.
  </p>
</div>

  `;

  await transporter.sendMail({
    from: `"GoToGo Airport Shuttle Service" <bookings@gotogotravelsolutions.com>`,
    to: toEmail,
    subject: `Your GoToGo Ticket ${ticketNumber}`,
    html: htmlContent
  });
}

module.exports = sendBookingEmail;
