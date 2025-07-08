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
