require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");
// Note: Node 18+ me fetch built-in hai. Agar purana node hai to 'node-fetch' install karein.

const app = express();
const PORT = process.env.PORT || 3000;

// ==================================================
// 1. MIDDLEWARE
// ==================================================
// Payload limit 200mb rakhi hai (Passport uploads ke liye)
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

const allowedOrigins = [
  "https://www.gotogo.in", "https://gotogo.in",
  "https://gotogo-merger.netlify.app",
  "http://127.0.0.1:5502", "http://127.0.0.1:5500", "http://localhost:5500",
  "https://www.gotogotravelsolutions.com", "https://gotogotravelsolutions.com"
];

app.use(cors({
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// ==================================================
// 2. DATABASE & MODELS (SEPARATE COLLECTIONS)
// ==================================================
// ==================================================
// 🟢 DATABASE & MODELS (RESTORED OLD LOCATIONS)
// ==================================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected (Master DB)"))
  .catch(err => console.error("❌ DB Connection Error:", err));

// --- 1. AGRA SHUTTLE SCHEMA ---
const agraSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true },
  paymentId: String,
  paymentMethod: String,
  amountPaid: Number,
  billing: Object,
  cart: Object,
  travelers: Array,
  createdAt: { type: Date, default: Date.now }
});

// 🔥 RESTORED: Pehle ye data 'bookings' collection me jata tha.
// Humne internal naam 'AgraBooking' rakha hai, lekin data 'bookings' me hi jayega.
const AgraBooking = mongoose.model('AgraBooking', agraSchema, 'bookings'); 


// --- 2. AIRPORT SHUTTLE SCHEMA ---
const airportSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true, unique: true },
  paymentId: String,
  paymentMethod: String,
  amountPaid: Number,
  billing: Object,
  travelers: Array,
  createdAt: { type: Date, default: Date.now }
});

// 🔥 RESTORED: Agar aapka Airport data pehle alag collection me tha to ye naam rakhein.
// Agar ye bhi 'bookings' me hi tha, to last wala naam hata kar 'bookings' likh dein.
const AirportBooking = mongoose.model('AirportBooking', airportSchema, 'airport-shuttle-bookings');


// ==================================================
// 3. CONFIGURATIONS & HELPERS
// ==================================================
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Import Email Helper (Only for Airport logic usually, but available globally)
// Ensure utils folder exists
let sendBookingEmail;
try {
    sendBookingEmail = require("./utils/sendBookingEmail");
} catch (e) {
    console.warn("⚠️ Warning: './utils/sendBookingEmail' not found. Email logic will fail.");
}

// --- HELPER: GITHUB UPLOAD (For Agra Passports) ---
async function uploadToGitHub(base64Content, fileName) {
    try {
        const url = `https://api.github.com/repos/${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO}/contents/passports/${fileName}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'GoToGo-Backend'
            },
            body: JSON.stringify({
                message: `Upload passport ${fileName}`,
                content: base64Content,
                encoding: 'base64'
            })
        });
        if (!response.ok) return "Upload Failed"; 
        const data = await response.json();
        return data.content.html_url; 
    } catch (error) {
        console.error("GitHub Upload Exception:", error);
        return "Upload Error";
    }
}

// --- HELPER: PROCESS FILES ---
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function processTravelerFiles(travelers) {
    const updatedTravelers = [];
    for (let i = 0; i < travelers.length; i++) {
        const t = travelers[i];
        if (t.passportFileBase64) {
            const timestamp = Date.now();
            const cleanName = (t.name || 'traveler').replace(/[^a-zA-Z0-9]/g, "_");
            const fileName = `${timestamp}_${i}_${cleanName}.${t.fileExtension || 'png'}`;
            console.log(`Uploading file ${i+1}/${travelers.length}: ${fileName}`);
            
            const fileUrl = await uploadToGitHub(t.passportFileBase64, fileName);
            updatedTravelers.push({
                ...t, documentUrl: fileUrl, passportFileBase64: t.passportFileBase64, fileExtension: t.fileExtension
            });
            await delay(1000); 
        } else {
            updatedTravelers.push(t);
        }
    }
    return updatedTravelers;
}

// --- HELPER: GOOGLE SHEET SYNC ---
async function addBookingToSheet(bookingDetails) {
    // Note: Ensure your Frontend sends the correct script URL or backend handles env
    // For now assuming generic logic
    try {
        const payload = { ...bookingDetails, authToken: process.env.APPS_SCRIPT_AUTH_TOKEN };
        // Use environment variable for URL preferably
        const scriptURL = process.env.GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbzhRiT2g1RW5vlgpMv_IO-EH9JHUVchk1LcF0ofUD-WTzUS1TnwWzihrgDa8dqPIloW/exec";
        
        await fetch(scriptURL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        console.log("✅ Sent to Google Sheet");
    } catch (e) {
        console.error("❌ Sheet Error:", e.message);
    }
}

// --- HELPER: SMART USD->INR ORDER CREATION ---
async function createSmartOrder(amount, receiptPrefix) {
    console.log(`Step 1: Raw Amount: ${amount}`);
    
    // Logic: Agar amount 1000 se bada hai (e.g. 25000), to wo Cents/Paise format hai.
    // Usko 100 se divide karke Dollar banao ($250).
    let usdAmount = amount;
    if (amount > 1000) {
        usdAmount = amount / 100;
    }
    console.log(`Step 2: Treated as USD: $${usdAmount}`);

    // Frankfurter API Call
    const apiResponse = await fetch(`https://api.frankfurter.app/latest?amount=${usdAmount}&from=USD&to=INR`);
    if (!apiResponse.ok) throw new Error("Currency conversion failed");
    
    const data = await apiResponse.json();
    const inrValue = data.rates.INR; 
    console.log(`Step 3: Converted to INR: ₹${inrValue}`);

    // Create Order
    return await razorpay.orders.create({
        amount: Math.round(inrValue * 100), // Paise
        currency: "INR",
        receipt: `${receiptPrefix}_${Date.now()}`,
    });
}


// ==================================================
// 4. SERVER HEALTH PING (For Cron Job)
// ==================================================
app.get("/ping", (req, res) => {
  res.status(200).send("✅ Master Server is Awake!");
});


// ==================================================
// 🚌 SECTION A: AGRA SHUTTLE ROUTES
// prefix: /api/agra
// ==================================================

// 1. Agra Order
app.post("/api/agra/create-order", async (req, res) => {
    try {
        const { amount } = req.body;
        const order = await createSmartOrder(amount, "receipt_agra");
        res.json(order);
    } catch (err) {
        console.error("Agra Order Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. Agra Verify & Save
app.post("/api/agra/verify", async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, travelers, ticketNumber, billing, cart } = req.body;

    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    
    if (hmac.digest('hex') === razorpay_signature) {
        console.log('Agra Payment Verified. Processing...');
        
        // 1. Process Passports
        const travelersWithUrls = await processTravelerFiles(travelers || []);
        
        const completeData = { ...req.body, travelers: travelersWithUrls, paymentMethod: 'Razorpay', paymentId: razorpay_payment_id };

        // 2. Save to Agra DB
        try {
            await new AgraBooking({
                ticketNumber, paymentId: razorpay_payment_id, paymentMethod: 'Razorpay',
                amountPaid: cart?.totalPrice || 0, billing, cart, travelers: travelersWithUrls
            }).save();
            console.log("✅ Agra Ticket Saved in DB");
        } catch (e) { console.error("DB Error:", e); }

        // 3. Google Sheet
        await addBookingToSheet(completeData);

        res.json({ success: true, travelers: travelersWithUrls });
    } else {
        res.status(400).json({ success: false, message: 'Invalid Signature' });
    }
});

// 3. Agra Cash Booking
app.post('/api/agra/book-cash', async (req, res) => {
    try {
        const { travelers, ticketNumber, billing, cart } = req.body;
        const travelersWithUrls = await processTravelerFiles(travelers || []);
        
        const completeData = { ...req.body, travelers: travelersWithUrls, paymentMethod: 'Cash', paymentId: 'N/A' };

        // Save to DB
        try {
            await new AgraBooking({
                ticketNumber, paymentId: 'N/A', paymentMethod: 'Cash',
                amountPaid: cart?.totalPrice || 0, billing, cart, travelers: travelersWithUrls
            }).save();
        } catch (e) { console.error("DB Error:", e); }

        await addBookingToSheet(completeData);
        res.json({ success: true, message: 'Cash booking processed.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// 4. Agra Ticket Fetch
app.get("/api/agra/ticket/:ticketId", async (req, res) => {
    try {
        const ticket = await AgraBooking.findOne({ ticketNumber: req.params.ticketId });
        if (ticket) res.json({ success: true, booking: ticket });
        else res.status(404).json({ success: false, message: "Ticket not found." });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});


// ==================================================
// ✈️ SECTION B: AIRPORT SHUTTLE ROUTES
// prefix: /api/airport
// ==================================================

// 1. Airport Order
app.post("/api/airport/create-order", async (req, res) => {
    try {
        const { amount } = req.body;
        const order = await createSmartOrder(amount, "receipt_airport");
        res.json(order);
    } catch (err) {
        console.error("Airport Order Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. Airport Verify & Save
app.post("/api/airport/verify", async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingData, email } = req.body;

    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);

    if (hmac.digest("hex") === razorpay_signature) {
        try {
            bookingData.paymentId = razorpay_payment_id;
            // Map travelers (Airport logic specific)
            const travelers = bookingData.names ? bookingData.names.map((name, index) => ({
                name: name, phone: bookingData.phones[index]
            })) : [];

            // Save to Airport DB
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
            console.log("✅ Airport Ticket Saved in DB");

            // Google Apps Script Hook
            // (Assuming Airport uses specific URL, otherwise use the generic one)
            await fetch("https://script.google.com/macros/s/AKfycbzhRiT2g1RW5vlgpMv_IO-EH9JHUVchk1LcF0ofUD-WTzUS1TnwWzihrgDa8dqPIloW/exec", {
                method: "POST",
                body: JSON.stringify(bookingData),
                headers: { "Content-Type": "application/json" }
            });

            // Send Email
            if(sendBookingEmail) {
                await sendBookingEmail(bookingData, email);
                await sendBookingEmail(bookingData, "care@gotogotravelsolutions.com", true);
            }

            res.json({ success: true });
        } catch (err) {
            console.error("Airport Process Error:", err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    } else {
        res.status(400).json({ success: false, error: "Invalid signature" });
    }
});

// 3. Airport Ticket Fetch
app.get("/api/airport/get-shuttle-ticket/:id", async (req, res) => {
    try {
        const ticket = await AirportBooking.findOne({ ticketNumber: req.params.id });
        if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
        res.json({ success: true, booking: ticket });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================================================
// START SERVER
// ==================================================
const server = app.listen(PORT, () => {
    console.log(`🚀 Master Server running on http://localhost:${PORT}`);
});
server.setTimeout(300000); // 5 Min Timeout