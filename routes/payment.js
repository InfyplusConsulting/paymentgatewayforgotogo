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
// const transporter = nodemailer.createTransport({
//   host: "smtp.secureserver.net", // GoDaddy SMTP
//   port: 587,                  // 🔁 changed from 465 to 587
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
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff; color: #333;">

  <h2 style="color: #0c52a2; text-align: center; margin-bottom: 20px;">✅ Booking Confirmed</h2>

  <p style="font-size: 16px;"><strong>Ticket No:</strong> ${bookingData.ticketNumber}</p>
  <p style="font-size: 16px;"><strong>Passengers:</strong> ${bookingData.names.join(", ")}</p>
  <p style="font-size: 16px;"><strong>Phones:</strong> ${bookingData.phones.join(", ")}</p>
  <p style="font-size: 16px;"><strong>Service:</strong> ${bookingData.serviceType}</p>
  <p style="font-size: 16px;"><strong>Pickup:</strong> ${bookingData.pickupLocation}</p>
  <p style="font-size: 16px;"><strong>Date:</strong> ${bookingData.pickupDate}</p>
  <p style="font-size: 16px;"><strong>Time:</strong> ${bookingData.boardingTime}</p>
  <p style="font-size: 16px;"><strong>Drop Terminal:</strong> ${bookingData.terminal}</p>

  <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />

  <p style="font-size: 16px;"><strong>Amount Paid:</strong> ₹${bookingData.amountPaid}</p>
  <p style="font-size: 16px;"><strong>Payment ID:</strong> ${bookingData.paymentId}</p>

  <div style="margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #0c52a2;">
    <p style="margin: 0; font-size: 15px;">We look forward to serving you with a smooth and comfortable ride. Thank you for choosing <strong>GoToGo Airport Shuttle</strong>.</p>
  </div>

  <p style="font-size: 13px; color: #999; text-align: center; margin-top: 40px;">
    This is an automated message. For assistance, contact us at <a href="mailto:care@gotogotravelsolutions.com" style="color: #0c52a2;">info@gotogo.com</a>.<br />
    Visit <a href="https://gotogo.in" style="color: #0c52a2; text-decoration: none;">gotogo.in</a> for more.
  </p>
</div>

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
      to: "devanshbusinesswork@gmail.com",
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
