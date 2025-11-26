// --- 1. INITIAL SETUP ---
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const Razorpay = require('razorpay');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'https://gotogomerger.netlify.app',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
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
app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.get('/ping', (req, res) => {
  console.log('Server was pinged and is now awake.');
  res.json({ success: true, message: 'Server is awake and ready.' });
});

// Google Apps Script ko data bhejne wala function
// async function addBookingToSheet(bookingDetails) {
//   try {
//     console.log("Sending booking to Google Sheet + Email Script...");

//     const response = await fetch(process.env.GOOGLE_SCRIPT_URL, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(bookingDetails),
//     });

//     const text = await response.text();
//     console.log("Apps Script response status:", response.status);
//     console.log("Apps Script response body:", text);

//     if (!response.ok) {
//       console.error("Apps Script returned error:", response.status, text);
//     } else {
//       console.log("Successfully sent booking to Google Script.");
//     }
//   } catch (error) {
//     console.error("Error sending data to Google Sheets/Script:", error);
//   }
// }

// Google Apps Script ko data bhejne wala function
// Google Apps Script ko data bhejne wala function
async function addBookingToSheet(bookingDetails) {
  const payload = {
      ...bookingDetails,
      authToken: process.env.APPS_SCRIPT_AUTH_TOKEN 
  };
  
  const response = await fetch(process.env.GOOGLE_SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  console.log("Apps Script response body:", text);

  // 1. Apps Script से मिला JSON रिस्पॉन्स पार्स करें
  let result;
  try {
      result = JSON.parse(text);
  } catch (e) {
      console.error("Failed to parse Apps Script response:", text);
      // यदि रिस्पॉन्स JSON नहीं है, तो एक सामान्य त्रुटि थ्रो करें
      throw new Error("Internal Server Error: Script response malformed.");
  }

  // 2. Apps Script के 'success' फ्लैग की जाँच करें
  if (result.success === false) {
      console.error("Apps Script reported failure:", result.error);
      // Apps Script में विफल होने पर एक विशिष्ट त्रुटि थ्रो करें
      throw new Error(`Booking processing failed: ${result.error}`);
  }

  // यदि success: true है, तो कोई एरर थ्रो नहीं होगा, और फ़ंक्शन सफलतापूर्वक रिटर्न होगा
  console.log("Successfully sent and processed booking via Google Script.");
}

// == ROUTE 1: CREATE ORDER ==
app.post('/create-order', async (req, res) => {
  const { amount, currency, receipt } = req.body;

  const options = { amount, currency, receipt };

  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).send('Error creating order');
  }
});

// == ROUTE 2: VERIFY PAYMENT ==
app.post('/verify-payment', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  const hmac = crypto.createHmac('sha256', key_secret);
  hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
  const generated_signature = hmac.digest('hex');

  if (generated_signature === razorpay_signature) {
    console.log('Payment verified successfully.');

    await addBookingToSheet({
      ...req.body,
      paymentMethod: 'Razorpay',
      paymentId: razorpay_payment_id,
    });

    res.json({ success: true, message: 'Payment verified & booking processed.' });
  } else {
    console.log('Payment verification failed.');
    res.status(400).json({ success: false, message: 'Payment verification failed' });
  }
});

// == ROUTE 3: CASH BOOKING ==
// == ROUTE 3: CASH BOOKING ==
app.post('/book-cash', async (req, res) => {
  console.log('Cash booking request received.');

  try {
    // अगर addBookingToSheet में कोई error थ्रो होता है, तो यह catch ब्लॉक में चला जाएगा
    await addBookingToSheet({
      ...req.body,
      paymentMethod: 'Cash',
      paymentId: 'N/A',
    });

    // यह लाइन तभी चलेगी जब addBookingToSheet सफल होगा (ईमेल भेजने सहित)
    res.json({ success: true, message: 'Cash booking processed successfully.' });
  } catch (error) {
    console.error('Failed to process cash booking:', error.message);
    
    // क्लाइंट को error message भेजें
    res.status(500).json({ 
        success: false, 
        message: 'Server error during cash booking processing. Pls Contact support.' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running successfully on http://localhost:${PORT}`);
});
