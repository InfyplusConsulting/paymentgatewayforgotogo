// sendBookingEmail.js
require("dotenv").config();
const fetch = require("node-fetch"); // for Node < 18

const GS_URL = "https://script.google.com/macros/s/AKfycby0JIhL3FcefOFxHufQkAyFRKzR1KguBb1BXc7jJnWfS0WvqjaZCos3xA84m-ABlJO9Ag/exec";

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

  const headingText = isAdmin
    ? "🛎️ New Booking Confirm"
    : `✅ ${bookingData.names[0]} Your Booking is Confirmed`;

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

      <!-- Buttons Section -->
  <div style="margin-top: 20px; display: flex; gap: 12px; flex-wrap: wrap;">
    
    <!-- Send Feedback -->
    <a 
      href="mailto:care@gotogotravelsolutions.com"
      style="background:#f4be30; color:black; padding:10px 16px; margin-right:15px; border-radius:6px; text-decoration:none; font-weight:600; display:inline-block;"
    >Send Feedback</a>

    <!-- Write a Review -->
    <a
      href="https://g.co/kgs/2Chx8BF"
      style="background:#f4be30; color:black; padding:10px 16px; border-radius:6px; text-decoration:none; font-weight:600; display:inline-block;"
      target="_blank"
    >Write a Review</a>

  </div>

  <!-- Missed Download Note -->
  <div style="margin-top: 24px; font-size: 14px; color:#000;">
    <p style="margin:0 0 5px 0;"><b>Note:</b> If you missed downloading your ticket, use this link:</p>
    <a href="https://www.gotogo.in/your-ticket" style="color:#0c52a2; font-weight:500;" target="_blank">
      gotogo.in/your-ticket
    </a>
    <p style="margin-top:5px;">
      <b>Pls open the link on the same device you used to book the ticket,</b><br>
      otherwise you will not be able to see the ticket details.
    </p>
  </div>

  </div>
  `;

  // ✅ Send via Google Apps Script (not Gmail SMTP)
  try {
    const response = await fetch(GS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: process.env.GS_API_KEY, // protect your script
        to: toEmail,
        subject: emailSubject,
        htmlBody: htmlContent,
        names,
        phones,
        ticketNumber,
        pickupDate,
        pickupLocation,
        boardingTime,
        terminal,
        serviceType,
        amountPaid,
        paymentId,
        isAdmin,
      }),
    });

    const result = await response.json();
    if (result.success) {
      console.log(`✅ Email sent successfully to ${toEmail}`);
    } else {
      console.error(`❌ Email failed for ${toEmail}:`, result.error);
    }
  } catch (err) {
    console.error("❌ Error sending email:", err.message);
  }
}

module.exports = sendBookingEmail;
