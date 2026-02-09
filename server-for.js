// --- 1. INITIAL SETUP ---
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const Razorpay = require('razorpay');
// 1. Mongoose Require Karein (New Add-on)
const mongoose = require('mongoose'); 
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==================================================
// 🟢 NEW: MONGODB CONNECTION & SCHEMA (Add-on)
// ==================================================
// Apne .env file me MONGO_URI variable add karein
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Add-on Connected"))
  .catch(err => console.error("❌ DB Connection Error:", err));

// Booking Schema - Jo data hum save karenge
const bookingSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true }, // Ticket ID zaroori hai
  paymentId: String,
  paymentMethod: String,
  amountPaid: Number,
  billing: Object,   // Customer details
  cart: Object,      // Package details
  travelers: Array,  // Travelers list (with GitHub URLs)
  createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model('Booking', bookingSchema);
// ==================================================


// INCREASE PAYLOAD SIZE LIMIT
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

const allowedOrigins = [
  'https://gotogo-merger.netlify.app',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'https://www.gotogotravelsolutions.com',
  'https://gotogotravelsolutions.com'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};

app.use(cors(corsOptions));

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// --- HELPER: UPLOAD TO GITHUB ---
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

        if (!response.ok) {
            const errText = await response.text();
            console.error("GitHub Error:", errText);
            return "Upload Failed"; 
        }

        const data = await response.json();
        return data.content.html_url; 
    } catch (error) {
        console.error("GitHub Upload Exception:", error);
        return "Upload Error";
    }
}

// --- HELPER: DELAY FUNCTION ---
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- HELPER: PROCESS TRAVELER FILES ---
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
                ...t,
                documentUrl: fileUrl,
                passportFileBase64: t.passportFileBase64, 
                fileExtension: t.fileExtension
            });

            await delay(1000); 

        } else {
            updatedTravelers.push(t);
        }
    }
    return updatedTravelers;
}

app.get('/ping', (req, res) => {
  console.log('Server was pinged and is now awake.');
  res.json({ success: true, message: 'Server is awake and ready.' });
});

// --- GOOGLE APPS SCRIPT FUNCTION ---
async function addBookingToSheet(bookingDetails) {
  const payload = {
      ...bookingDetails,
      authToken: process.env.APPS_SCRIPT_AUTH_TOKEN 
  };
  
  const response = await fetch(process.env.GOOGLE_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  console.log("Apps Script response body:", text);

  let result;
  try {
      result = JSON.parse(text);
  } catch (e) {
      console.error("Failed to parse Apps Script response:", text);
      throw new Error("Internal Server Error: Script response malformed.");
  }

  if (result.success === false) {
      console.error("Apps Script reported failure:", result.error);
      throw new Error(`Booking processing failed: ${result.error}`);
  }
  console.log("Successfully sent and processed booking via Google Script.");
}

// == ROUTE 1: CREATE ORDER ==
// == ROUTE 1: CREATE ORDER (Backend Conversion: USD -> INR) ==
// app.post('/create-order', async (req, res) => {
//   // Frontend se humein sirf 'amount' (USD) chahiye. 'currency' hum khud set karenge.
//   const { amount, receipt } = req.body;

//   if (!amount) {
//     return res.status(400).json({ error: "Amount is required" });
//   }

//   try {
//     console.log(`Processing USD Amount: $${amount}`);

//     // ---------------------------------------------------------
//     // STEP 1: Backend par Real-Time Conversion (USD to INR)
//     // ---------------------------------------------------------
//     const response = await fetch(`https://api.frankfurter.app/latest?amount=${amount}&from=USD&to=INR`);
    
//     if (!response.ok) {
//       throw new Error("Currency conversion API failed");
//     }

//     const data = await response.json();
//     const inrValue = data.rates.INR; // Example: 4500 (Rupees)

//     console.log(`Converted to INR: ₹${inrValue}`);

//     // ---------------------------------------------------------
//     // STEP 2: Razorpay Order Creation
//     // ---------------------------------------------------------
//     const options = {
//       amount: Math.round(inrValue * 100), // Rupees ko Paise mein badla (4500 * 100)
//       currency: "INR",                    // Currency hamesha INR rahegi
//       receipt: receipt || `receipt_${Date.now()}`
//     };

//     const order = await razorpay.orders.create(options);
    
//     // Frontend ko order bhej diya
//     res.json(order);

//   } catch (error) {
//     console.error('Error creating Razorpay order:', error.message);
//     res.status(500).json({ error: 'Error creating order' });
//   }
// });

// == ROUTE 1: CREATE ORDER (FIXED: Handles 25000 as 250 USD) ==
app.post('/create-order', async (req, res) => {
  const { amount, receipt } = req.body; // Frontend se 25000 aa raha hai

  if (!amount) return res.status(400).json({ error: "Amount is required" });

  try {
    // 🟢 FIX: Agar value badi hai (jaise 25000), to usko 100 se divide karke Dollar banao
    // Logic: 25000 / 100 = 250 USD
    let usdAmount = amount;
    if (amount > 1000) {
        usdAmount = amount / 100;
    }

    console.log(`Step 1: Frontend sent ${amount}. Treated as $${usdAmount} USD.`);

    // 🟢 API CALL (Ab ye $250 ka rate mangega)
    const apiResponse = await fetch(`https://api.frankfurter.app/latest?amount=${usdAmount}&from=USD&to=INR`);
    
    if (!apiResponse.ok) {
      throw new Error("Currency conversion API failed");
    }

    const data = await apiResponse.json();
    const inrValue = data.rates.INR; // Ab ye ~22666 aayega

    console.log(`Step 2: Converted $${usdAmount} USD -> ₹${inrValue} INR`);

    // 🟢 RAZORPAY ORDER (Paise mein convert karke bhejo)
    const options = {
      amount: Math.round(inrValue * 100), // 22666 * 100 = 2266600 paise
      currency: "INR",
      receipt: receipt || `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: 'Order creation failed' });
  }
});

// == ROUTE 2: VERIFY PAYMENT (UPDATED WITH DB ADDON) ==
app.post('/verify-payment', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, travelers, ticketNumber, billing, cart } = req.body;

  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  const hmac = crypto.createHmac('sha256', key_secret);
  hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
  const generated_signature = hmac.digest('hex');

  if (generated_signature === razorpay_signature) {
    console.log('Payment verified. Processing files...');

    // 1. Process Files (Upload to GitHub)
    const travelersWithUrls = await processTravelerFiles(travelers || []);

    const completeBookingData = {
      ...req.body,
      travelers: travelersWithUrls,
      paymentMethod: 'Razorpay',
      paymentId: razorpay_payment_id,
    };

    // 🟢 NEW: Save to MongoDB (Backup for Ticket Download)
    try {
        const newTicket = new Booking({
            ticketNumber: ticketNumber, // Frontend se aana chahiye
            paymentId: razorpay_payment_id,
            paymentMethod: 'Razorpay',
            amountPaid: cart?.totalPrice || 0,
            billing: billing,
            cart: cart,
            travelers: travelersWithUrls
        });
        await newTicket.save();
        console.log("✅ [DB] Ticket Data Saved:", ticketNumber);
    } catch (dbErr) {
        console.error("❌ [DB Error] Failed to save ticket:", dbErr.message);
        // Hum yahan process ko stop nahi karenge, Sheet me data jane denge
    }

    // 2. Send to Google Sheet (Main System)
    await addBookingToSheet(completeBookingData);

    // 3. Respond to Frontend
    res.json({ 
        success: true, 
        message: 'Payment verified & booking processed.',
        travelers: travelersWithUrls 
    });
  } else {
    console.log('Payment verification failed.');
    res.status(400).json({ success: false, message: 'Payment verification failed' });
  }
});

// == ROUTE 3: CASH BOOKING (UPDATED WITH DB ADDON) ==
app.post('/book-cash', async (req, res) => {
  console.log('Cash booking received. Processing files...');

  try {
    const { travelers, ticketNumber, billing, cart } = req.body;

    // 1. Process Files
    const travelersWithUrls = await processTravelerFiles(travelers || []);

    const completeBookingData = {
        ...req.body,
        travelers: travelersWithUrls,
        paymentMethod: 'Cash',
        paymentId: 'N/A',
    };

    // 🟢 NEW: Save to MongoDB
    try {
        const newTicket = new Booking({
            ticketNumber: ticketNumber,
            paymentId: 'N/A',
            paymentMethod: 'Cash',
            amountPaid: cart?.totalPrice || 0,
            billing: billing,
            cart: cart,
            travelers: travelersWithUrls
        });
        await newTicket.save();
        console.log("✅ [DB] Cash Ticket Data Saved:", ticketNumber);
    } catch (dbErr) {
        console.error("❌ [DB Error] Failed to save cash ticket:", dbErr.message);
    }

    // 2. Send to Google Sheet
    await addBookingToSheet(completeBookingData);

    res.json({ success: true, message: 'Cash booking processed successfully.' });
  } catch (error) {
    console.error('Failed to process cash booking:', error.message);
    res.status(500).json({ 
        success: false, 
        message: 'Server error during cash booking processing. Pls Contact support.' 
    });
  }
});

// ==================================================
// 🟢 NEW: PUBLIC TICKET API (Missing Route)
// ==================================================
app.get("/api/ticket/:ticketId", async (req, res) => {
  try {
    const tId = req.params.ticketId;
    
    // Database me search karo
    // Note: Agar aapne Booking define nahi kiya hai upar, to ensure karein ki 
    // const Booking = mongoose.model(...) file ke top par ho.
    const ticketData = await mongoose.model('Booking').findOne({ ticketNumber: tId });

    if (ticketData) {
      res.json({ success: true, booking: ticketData });
    } else {
      res.status(404).json({ success: false, message: "Ticket not found in database." });
    }
  } catch (err) {
    console.error("Ticket Fetch Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`Server is running successfully on http://localhost:${PORT}`);
});

server.setTimeout(300000); // 5 Minutes Timeout