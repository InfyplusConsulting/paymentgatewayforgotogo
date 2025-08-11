// const express = require("express");
// const Razorpay = require("razorpay");
// const crypto = require("crypto");
// const fetch = require("node-fetch");

// const router = express.Router();

// // ✅ Razorpay Instance
// const instance = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// // ✅ In-Memory Exchange Rate Cache
// let cachedRate = null;
// let lastFetched = null;
// const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

// // ✅ Utility: Fetch or Use Cached USD to INR Rate
// async function getCachedUSDtoINR() {
//   const now = Date.now();

//   if (cachedRate && lastFetched && now - lastFetched < CACHE_DURATION_MS) {
//     return cachedRate;
//   }

//   try {
//     const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
//     const data = await res.json();
//     const inrRate = data.rates?.INR || 83.5;

//     cachedRate = inrRate;
//     lastFetched = now;
//     return inrRate;
//   } catch (err) {
//     console.warn("⚠️ Failed to fetch live rate. Using fallback.");
//     return cachedRate || 83.5;
//   }
// }

// // ======================= ✅ CREATE ORDER =======================
// router.post("/create-order", async (req, res) => {
//   console.log("✅ /create-order hit");
//   const { amount, currencyType = "USD" } = req.body;

//   if (!amount) {
//     return res.status(400).json({ error: "Amount is required" });
//   }

//   try {
//     let finalAmountINR = amount;
//     let rateUsed = null;

//     if (currencyType === "USD") {
//       const rate = await getCachedUSDtoINR();
//       finalAmountINR = Math.round(amount * rate);
//       rateUsed = rate;
//     }

//     const options = {
//       amount: finalAmountINR * 100,
//       currency: "INR",
//       receipt: `receipt_${Date.now()}`,
//     };

//     console.log("Amount received:", amount);
// console.log("Currency type:", currencyType);
// console.log("Final INR amount:", finalAmountINR);


//     const order = await instance.orders.create(options);
//     return res.status(200).json({
//       ...order,
//       originalAmount: amount,
//       convertedINR: finalAmountINR,
//       exchangeRate: rateUsed,
//       currencyType,
//     });
    
//   } catch (err) {
//     return res.status(500).json({ error: "Failed to create order", message: err.message });
//   }
// });

// // ======================= ✅ VERIFY PAYMENT =======================
// router.post("/verify", async (req, res) => {
//   const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

//   if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
//     return res.status(400).json({ error: "Incomplete payment data received." });
//   }

//   const generatedSignature = crypto
//     .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//     .update(`${razorpay_order_id}|${razorpay_payment_id}`)
//     .digest("hex");

//   if (generatedSignature !== razorpay_signature) {
//     return res.status(400).json({ success: false, error: "Invalid signature" });
//   }

//   return res.status(200).json({ success: true, message: "Payment verified successfully" });
// });

// module.exports = router;



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
  "https://gotogoin.netlify.app",
  "http://127.0.0.1:5502",
  "https://testingwebsitessites.netlify.app"
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
    await fetch("https://script.google.com/macros/s/AKfycbyeYw-9CKLOv37YG6ScoJffpDSEbGm2sGNNQZ_Yk09hMAaqNHIPbDcpi87wheCmRcpD0g/exec", {
      method: "POST",
      body: JSON.stringify(bookingData),
      headers: { "Content-Type": "application/json" }
    });

      // ✅ Send email here
      console.log("🚀 Sending user email to:", email);
      await sendBookingEmail(bookingData, email); // to user
      console.log("✅ User email sent");
      await sendBookingEmail(bookingData, "bookings@gotogotravelsolutions.com", true); // to admin
      
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
