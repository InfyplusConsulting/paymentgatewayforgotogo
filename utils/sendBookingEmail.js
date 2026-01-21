// utils/sendBookingEmail.js
require("dotenv").config();
const fetch = require("node-fetch");

// Google Apps Script URL (Airport Shuttle dedicated script)
const GS_URL = "https://script.google.com/macros/s/AKfycbwZhQQqI8KxNps_pOU5kx8cQDteddKf2YbnhlW0MID1LsXwVv15ZZrLkPUobb5X7a_o/exec";

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

  // 1. Dynamic Ticket Link जनरेट करें (your-ticket.html के लिए)
  const ticketLink = `https://www.gotogotravelsolutions.com/your-ticket.html?ticket=${ticketNumber}`;

  const emailSubject = isAdmin
    ? `🛎️ New Booking - Ticket #${ticketNumber}`
    : `🎫 Booking Confirmed - Ticket #${ticketNumber}`;

  try {
    const response = await fetch(GS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: process.env.GS_API_KEY,
        to: toEmail,
        subject: emailSubject,
        ticketLink: ticketLink, // 2. Apps Script को यह नया लिंक भेजें
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