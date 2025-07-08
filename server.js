require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const app = express();
app.use(cors({
  origin: [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "https://www.gotogo.in",
    "https://testsitesonweb.netlify.app"
  ],
  credentials: true
}));


app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Order
app.post("/api/create-order", async (req, res) => {
  const { amount, currencyType } = req.body;

  if (!amount) return res.status(400).json({ error: "Amount is required" });

  try {
    // 💱 Default to INR if not USD
    let finalAmountINR = amount;
    let exchangeRateUsed = null;

    if (currencyType === "USD") {
      // Example: manually set exchange rate (or later use real-time fetch)
      const exchangeRate = 83.5; // 1 USD = 83.5 INR
      finalAmountINR = Math.round(amount * exchangeRate); // Round to avoid paise fractions
      exchangeRateUsed = exchangeRate;
    }

    console.log("🧾 Order Summary:");
    console.log("Currency:", currencyType || "INR");
    console.log("Amount Received:", amount);
    console.log("Final INR Amount:", finalAmountINR);
    if (exchangeRateUsed) console.log("Exchange Rate Used:", exchangeRateUsed);

    const options = {
      amount: finalAmountINR * 100, // paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    console.error("❌ Order creation failed:", err.message);
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

      // ✅ Send email here
      await sendBookingEmail(bookingData, email); // to user
      await sendBookingEmail(bookingData, "devanshbusinesswork@gmail.com", true); // to admin
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: "Email sending failed", message: err.message });
    }
  } else {
    res.status(400).json({ success: false, error: "Invalid signature" });
  }
});


app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
