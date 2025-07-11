
// new - 
const nodemailer = require("nodemailer");

// ✅ Option 1: GoDaddy SMTP (Comment if not used)
const transporter = nodemailer.createTransport({
  host: "sg2plzcpnl506974.prod.sin2.secureserver.net", // from your image
  port: 465,
  secure: true, // SSL
  auth: {
    user: "bookings@gotogotravelsolutions.com",
    pass: process.env.EMAIL_PASS, // make sure this is correct
  },
  logger: true,
  debug: true,
});


async function sendBookingEmail(bookingData, toEmail, isAdmin = false) {
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
    paymentId,
  } = bookingData;

  const emailSubject = isAdmin
    ? `🛎️ New Booking - Ticket #${ticketNumber}`
    : `🎫 Booking Confirmed - Ticket #${ticketNumber}`;

  const headingText = isAdmin ? "🛎️ New Booking Confirm" : `✅${bookingData.names[0]} Your Booking is Confirmed`;

  const htmlContent = `
<div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff; color: #333;">
  <div style="text-align: center;">
    <img src="https://www.gotogo.in/assets/GoToGo%20Final%20Logos/GoToGo%20Final%20Logos/G2G%20Fleet%20-%20Inverse%20Black.png" alt="GoToGo Logo" style="width: 100px;" />
  </div>

  <h2 style="color: #0c52a2; text-align: center; margin-bottom: 20px;">${headingText}</h2>

  <p style="font-size: 16px;"><strong>Ticket No:</strong> ${ticketNumber}</p>
  <p style="font-size: 16px;"><strong>Passengers:</strong></p>
  <ul style="padding-left: 20px; font-size: 16px; margin-top: 0;">
    ${names.map((name, i) => `<li>${name} - ${phones[i]}</li>`).join("")}
  </ul>
  <p style="font-size: 16px;"><strong>Service:</strong> ${serviceType}</p>
  <p style="font-size: 16px;"><strong>Pickup:</strong> ${pickupLocation}</p>
  <p style="font-size: 16px;"><strong>Date:</strong> ${pickupDate}</p>
  <p style="font-size: 16px;"><strong>Time:</strong> ${boardingTime}</p>
  <p style="font-size: 16px;"><strong>Drop Terminal:</strong> ${terminal}</p>

  <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />

  <p style="font-size: 16px;"><strong>Amount Paid:</strong> ₹${amountPaid}</p>
  <p style="font-size: 16px;"><strong>Payment ID:</strong> ${paymentId}</p>

  <div style="margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #0c52a2;">
    <p style="margin: 0; font-size: 15px;">We look forward to serving you with a smooth and comfortable ride. Thank you for choosing <strong>GoToGo Airport Shuttle</strong>.</p>
  </div>

  <p style="font-size: 13px; color: #999; text-align: center; margin-top: 40px;">
    This is an automated message. For assistance, contact us at <a href="mailto:care@gotogotravelsolutions.com" style="color: #0c52a2;">care@gotogotravelsolutions.com</a>.<br />
    Visit <a href="https://gotogo.in" style="color: #0c52a2; text-decoration: none;">gotogo.in</a> for more.
  </p>
</div>
`;

  await transporter.sendMail({
    from: `"GoToGo Airport Shuttle Service" <bookings@gotogotravelsolutions.com>`,
    to: toEmail,
    subject: emailSubject,
    html: htmlContent,
  });
}

module.exports = sendBookingEmail;
