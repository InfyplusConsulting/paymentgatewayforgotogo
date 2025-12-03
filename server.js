require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const app = express();
app.use(cors({
  origin: [
  "https://www.gotogo.in",
  "https://gotogo.in",
  "https://gotogomerger.netlify.app",
  // "http://127.0.0.1:5502",
  // "http://127.0.0.1:5500",
  "https://www.gotogotravelsolutions.com",
  "https://gotogotravelsolutions.com"
],

  credentials: true
}));


app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.get("/ping", (req, res) => {
  res.status(200).send("✅ Server is awake!");
});


// Create Order
app.post("/api/create-order", async (req, res) => {
  const { amount } = req.body;

  if (!amount) return res.status(400).json({ error: "Amount is required" });

  try {
    const options = {
      amount: amount * 100, // cents
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: "Order creation failed", message: err.message });
  }
});

// Verify Signature
const sendBookingEmail = require("./utils/sendBookingEmail");

app.post("/verify", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingData, email } = req.body;

  const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
  hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const digest = hmac.digest("hex");

  if (digest === razorpay_signature) {
    try {
      bookingData.paymentId = razorpay_payment_id;

      console.log("Booking Data:", bookingData);


       // ✅ Send booking data to Google Apps Script
    await fetch("https://script.google.com/macros/s/AKfycbyA7aAJFfGUn3vmBvqD7B_TawhQ3gltmu72CVPp9hxYvhX4N2WXyez5_p6q9zQatDn3nw/exec", {
      method: "POST",
      body: JSON.stringify(bookingData),
      headers: { "Content-Type": "application/json" }
    });

      // ✅ Send email here
      console.log("🚀 Sending user email to:", email);
      await sendBookingEmail(bookingData, email); // to user
      console.log("✅ User email sent");
      await sendBookingEmail(bookingData, "care@gotogotravelsolutions.com", true); // to admin
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: "Email sending failed", message: err.message });
      console.error("❌ Failed to send user email:", err.message);
    }
  } else {
    res.status(400).json({ success: false, error: "Invalid signature" });
  }
});


app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});