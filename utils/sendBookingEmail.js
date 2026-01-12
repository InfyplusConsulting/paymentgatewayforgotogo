// sendBookingEmail.js
require("dotenv").config();
const fetch = require("node-fetch");

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

  // ✅ Yahan se humne htmlContent hata diya hai
  // Ab Apps Script automatically apna naya UI pick karega

  try {
    const response = await fetch(GS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: process.env.GS_API_KEY,
        to: toEmail,
        subject: emailSubject,
        // htmlBody ko ab hum nahi bhej rahe hain taaki Apps Script wala UI chale
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