require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose"); 

const app = express();

app.use(cors({
  origin: [
    "https://www.gotogo.in",
    "https://gotogo.in",
    "https://gotogo-merger.netlify.app",
    "http://127.0.0.1:5502",
    "http://127.0.0.1:5500",
    "https://www.gotogotravelsolutions.com",
    "https://gotogotravelsolutions.com"
  ],
  credentials: true
}));

app.use(express.json());

// ==================================================
// 🟢 MONGODB CONNECTION & SEPARATE COLLECTION SETUP
// ==================================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected for Airport Shuttle"))
  .catch(err => console.error("❌ DB Connection Error:", err));

const bookingSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true, unique: true },
  paymentId: String,
  paymentMethod: String,
  amountPaid: Number,
  billing: Object,
  travelers: Array,
  createdAt: { type: Date, default: Date.now }
});

// 🔥 CHANGE HERE: 'AirportBooking' model banaya aur collection ka naam explicit 'airport-shuttle-bookings' diya
const AirportBooking = mongoose.model('AirportBooking', bookingSchema, 'airport-shuttle-bookings');
// ==================================================

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
    const response = await fetch(`https://api.frankfurter.app/latest?amount=${amount}&from=USD&to=INR`);
    const data = await response.json();
    
    // 2. Converted INR value nikalna
    const amountInINR = data.rates.INR; // Example: Agar $50 hai to yahan approx 4300 aayega
    
    console.log(`USD Amount: $${amount}, Converted INR: ₹${amountInINR}`);
    const amountInPaise = Math.round(Number(amountInINR) * 100);
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: "Order creation failed", message: err.message });
  }
});

// Verify Signature & Save to NEW Collection
const sendBookingEmail = require("./utils/sendBookingEmail");

app.post("/verify", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingData, email } = req.body;

  const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
  hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const digest = hmac.digest("hex");

  if (digest === razorpay_signature) {
    try {
      bookingData.paymentId = razorpay_payment_id;

      // Map Travelers
      const travelers = bookingData.names.map((name, index) => ({
          name: name,
          phone: bookingData.phones[index]
      }));

      // 🔥 SAVE TO NEW COLLECTION (AirportBooking)
      const newTicket = new AirportBooking({
          ticketNumber: bookingData.ticketNumber,
          paymentId: razorpay_payment_id,
          paymentMethod: 'Razorpay',
          amountPaid: bookingData.amountPaid,
          billing: {
              pickupDate: bookingData.pickupDate,
              pickupLocation: bookingData.pickupLocation,
              boardingTime: bookingData.boardingTime,
              terminal: bookingData.terminal,
              serviceType: bookingData.serviceType
          },
          travelers: travelers
      });

      await newTicket.save();
      console.log("✅ [DB] Ticket Saved in 'airport-shuttle-bookings':", bookingData.ticketNumber);

      // Google Apps Script Hook
      await fetch("https://script.google.com/macros/s/AKfycbzhRiT2g1RW5vlgpMv_IO-EH9JHUVchk1LcF0ofUD-WTzUS1TnwWzihrgDa8dqPIloW/exec", {
        method: "POST",
        body: JSON.stringify(bookingData),
        headers: { "Content-Type": "application/json" }
      });

      // Send Email
      await sendBookingEmail(bookingData, email);
      await sendBookingEmail(bookingData, "care@gotogotravelsolutions.com", true);
      
      res.json({ success: true });
    } catch (err) {
      console.error("❌ Process Error:", err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  } else {
    res.status(400).json({ success: false, error: "Invalid signature" });
  }
});

// 🟢 Ticket Fetch API (Search in NEW Collection)
app.get("/api/get-shuttle-ticket/:id", async (req, res) => {
  try {
    // 🔥 Search in AirportBooking collection
    const ticket = await AirportBooking.findOne({ ticketNumber: req.params.id });
    
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    res.json({ success: true, booking: ticket });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});