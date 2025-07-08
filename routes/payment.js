const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const router = express.Router();

// ✅ Check Razorpay Credentials
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("❌ Razorpay credentials are missing in .env file");
}

// ✅ Razorpay Instance
const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Nodemailer Transporter Setup
const transporter = nodemailer.createTransport({
  host: "smtp.secureserver.net", // GoDaddy SMTP
  port: 587,                  // 🔁 changed from 465 to 587
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


// ======================= ✅ CREATE ORDER =======================
router.post("/create-order", async (req, res) => {
  const { amount } = req.body;

  if (!amount) {
    return res.status(400).json({ error: "Amount is required" });
  }

  try {
    const options = {
      amount: amount * 100, // paise
      currency: "USD",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await instance.orders.create(options);
    return res.status(200).json(order);
  } catch (err) {
    return res.status(500).json({ error: "Failed to create order", message: err.message });
  }
});

// ======================= ✅ VERIFY PAYMENT =======================
router.post("/verify", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingData, email } = req.body;

  // Validate fields
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Incomplete payment data received." });
  }

  // ✅ Signature Verification
  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generatedSignature !== razorpay_signature) {
    return res.status(400).json({ success: false, error: "Invalid signature" });
  }

  // ✅ Email Content
  const emailSubject = `Testing By Infy+ Devansh! 🎫 Booking Confirmed - Ticket #${bookingData.ticketNumber}`;
  const emailBody = `
    <h2>Booking Confirmed</h2>
    <p><strong>Ticket No:</strong> ${bookingData.ticketNumber}</p>
    <p><strong>Passengers:</strong> ${bookingData.names.join(", ")}</p>
    <p><strong>Phones:</strong> ${bookingData.phones.join(", ")}</p>
    <p><strong>Service:</strong> ${bookingData.serviceType}</p>
    <p><strong>Pickup:</strong> ${bookingData.pickupLocation}</p>
    <p><strong>Date:</strong> ${bookingData.pickupDate}</p>
    <p><strong>Time:</strong> ${bookingData.boardingTime}</p>
    <p><strong>Drop Terminal:</strong> ${bookingData.terminal}</p>
    <p><strong>Amount Paid:</strong> ₹${bookingData.amountPaid}</p>
  `;

  try {
    // ✅ Email to User
    await transporter.sendMail({
      from: `"GoToGo Airport Shuttle Service" <bookings@gotogotravelsolutions.com>`,
      to: email,
      subject: emailSubject,
      html: emailBody,
    });

    // ✅ Email to Admin
    await transporter.sendMail({
      from: `"GoToGo Airport Shuttle Service" <bookings@gotogotravelsolutions.com>`,
      to: "care@gotogotravelsolutions.com",
      subject: `🛎️ New Booking - ${bookingData.ticketNumber}`,
      html: `<h3>New booking received:</h3>${emailBody}`,
    });

    return res.status(200).json({ success: true, message: "Payment verified & emails sent" });
  } catch (error) {
    console.error("❌ Failed to send email:", error.message);
    return res.status(500).json({ success: false, error: "Email sending failed" });
  }
});

module.exports = router;
