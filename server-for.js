// --- 1. INITIAL SETUP ---
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const Razorpay = require('razorpay');
require('dotenv').config(); // Loads environment variables from a .env file
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000; // Use port from .env or default to 3000

// --- 2. NODEMAILER EMAIL TRANSPORTER ---
// This transporter uses your Gmail account to send emails.
// Make sure you have a Gmail App Password in your .env file.
// const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//         user: "devanshbusinesswork@gmail.com", // Your sending Gmail address
//         pass: process.env.GMAIL_APP_PASS,    // Your Gmail App Password
//     },
// });

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // Explicit Host
  port: 587,              // Standard TLS Port
  secure: false,          // Use STARTTLS
  auth: {
    user: "devanshbusinesswork@gmail.com",
    pass: process.env.GMAIL_APP_PASS,
  },
  tls: {
      rejectUnauthorized: false // Optional: Helps with some environment certificate issues
  }
});


// ✅ Option 1: GoDaddy SMTP (Comment if not used)
// const transporter = nodemailer.createTransport({
//   host: "sg2plzcpnl506974.prod.sin2.secureserver.net",
//   port: 465,
//   secure: true, // SSL
//   auth: {
//     user: "bookings@gotogotravelsolutions.com",
//     pass: process.env.EMAIL_PASS, // make sure this is correct
//   },
//   logger: true,
//   debug: true,
// });

// --- 3. MIDDLEWARE CONFIGURATION ---

// CORS (Cross-Origin Resource Sharing) configuration
const allowedOrigins = [
    'https://gotogomerger.netlify.app', // Add your actual production domain
    'http://127.0.0.1:5500',              // For local testing
    'http://localhost:5500'                // For local testing
];

const corsOptions = {
    origin: function (origin, callback) {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
};

app.use(cors(corsOptions));   // Enable CORS
app.use(express.json());       // Enable Express to read JSON from request bodies

// --- 4. RAZORPAY INSTANCE ---
// Initialize Razorpay with keys from your environment variables for security.
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});


// --- 5. API ROUTES ---

app.get('/ping', (req, res) => {
    console.log('Server was pinged and is now awake.');
    res.json({ success: true, message: 'Server is awake and ready.' });
});

// Add this function to your server.js

// This function sends booking data to your Google Apps Script.
async function addBookingToSheet(bookingDetails) {
  // We use a try/catch block so that if Google Sheets fails,
  // it doesn't crash our entire server.
  try {
    console.log("Sending booking to Google Sheet...");
    await fetch(process.env.GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookingDetails),
    });
    console.log("Successfully sent booking to Google Sheet.");
  } catch (error) {
    console.error("Error sending data to Google Sheets:", error);
  }
}

// == ROUTE 1: CREATE A RAZORPAY ORDER ==
app.post('/create-order', async (req, res) => {
    const { amount, currency, receipt } = req.body;
    const options = {
        amount: amount, // amount in the smallest currency unit (e.g., 50000 for ₹500.00)
        currency: currency,
        receipt: receipt,
    };

    try {
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).send("Error creating order");
    }
});


// == ROUTE 2: VERIFY PAYMENT AND SEND EMAILS ==
app.post('/verify-payment', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, cart, billing, travelers } = req.body;
    
    // The secret must match the one in the Razorpay instance
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    // Create a signature for verification
    const hmac = crypto.createHmac('sha256', key_secret);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');

    // Compare the generated signature with the one from Razorpay
    if (generated_signature === razorpay_signature) {
        console.log('Payment verified successfully.');

        // Call the function to add data to the sheet
    addBookingToSheet({ 
        ...req.body, 
        paymentMethod: 'Razorpay', 
        paymentId: razorpay_payment_id 
    });


        // If payment is verified, send confirmation emails
        try {
            const travelerInfoHtml = travelers.map(person =>
                `<p><strong>${person.type}:</strong> ${person.name} (Age: ${person.age})</p>`
            ).join('');

            // Email 1: To the Admin
            const adminMailOptions = {
                from: '"GoToGo Travel Solutions" <bookings@gotogotravelsolutions.com>',
                to: 'devanshrajput032006@gmail.com', // Your admin email
                subject: `[ADMIN] New Booking Confirmed: ${cart.packageName || "N/A"}`,
                html: `
                    <h1>New Booking Received!</h1>
                    <p>A new booking has been successfully paid for and confirmed.</p>
                    <hr>
                    <h2>Booking Details</h2>
                    <p><strong>Package:</strong> ${cart.packageName || "N/A"}</p>
                    <p><strong>Tour Date:</strong> ${billing.tourDate}</p>
                    <p><strong>Total Price (USD):</strong> $${cart.totalPrice}</p>
                    <hr>
                    <h2>Traveler Information</h2>
                    ${travelerInfoHtml}
                    <hr>
                    <h2>Facilities</h2>
                    <p><strong>${cart.optionTitle.replace(/^Option\s*\d+\s*:/i, " - ")}</strong></p>
                    <hr>
                    <h2>Customer Information</h2>
                    <p><strong>Name:</strong> ${billing.firstName} ${billing.lastName}</p>
                    <p><strong>Email:</strong> ${billing.email}</p>
                    <p><strong>Mobile:</strong> ${billing.mobile}</p>
                    <p><strong>Hotel Name:<strong> ${billing.hotelName}</p>
                    <p><strong>Hotel Address:<strong> ${billing.hotelAddress}</p>
                    <p><strong>Hotel Additional Info:<strong> ${billing.additionalInfo}</p>
                    <hr>
                    <h2>Payment Information</h2>
                    <p><strong>Razorpay Order ID:</strong> ${razorpay_order_id}</p>
                    <p><strong>Razorpay Payment ID:</strong> ${razorpay_payment_id}</p>
                `
            };

            // Email 2: To the Customer
            const customerMailOptions = {
                from: '"GoToGo Travel Solutions" <bookings@gotogotravelsolutions.com>',
                to: billing.email, // Customer's email address
                subject: `✅ Your Booking is Confirmed! GoToGo Travel Solutions`,
                html: `
                    <h1>Thank You For Your Booking, ${billing.firstName}!</h1>
                    <p>Your booking with GoToGo Travel Solutions is confirmed. We are excited to have you!</p>
                    <p>Please find your booking summary below.</p>
                    <hr>
                    <h2>Booking Summary</h2>
                    <p><strong>Package:</strong> ${cart.packageName || "N/A"}</p>
                    <p><strong>Tour Date:</strong> ${billing.tourDate}</p>
                    <hr>
                    <h2>Facilities</h2>
                    <p><strong>${cart.optionTitle.replace(/^Option\s*\d+\s*:/i, " - ")}</strong></p>
                    <hr>
                    <h2>Your Traveler Details</h2>
                    ${travelerInfoHtml}
                    <hr>
                    <h2>Payment Details</h2>
                    <p><strong>Total Paid (USD):</strong> $${cart.totalPrice}</p>
                    <p><strong>Razorpay Payment ID:</strong> ${razorpay_payment_id}</p>
                    <hr>
                    <p>If you have any questions, feel free to contact us. bookings@gotogotravelsolution.com</p>
                    <a href="https://gotogotravelsolutions.com" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">Visit Our Website</a> 
                    <p>Sincerely,<br>The GoToGo Team</p>
                `
            };
            
            // Send both emails at the same time
            await Promise.all([
                transporter.sendMail(adminMailOptions),
                transporter.sendMail(customerMailOptions)
            ]);
            // await transporter.sendMail(adminMailOptions);
            // await transporter.sendMail(customerMailOptions);

            console.log('Admin and customer confirmation emails sent successfully.');

        } catch (emailError) {
            console.error('Failed to send one or more confirmation emails:', emailError);
        }
        
        // Respond to the frontend that everything was successful
        res.json({ success: true, message: 'Payment verified successfully' });

    } else {
        console.log('Payment verification failed.');
        res.status(400).json({ success: false, message: 'Payment verification failed' });
    }
});

// Add this new route to your server.js file

// == ROUTE 3: HANDLE CASH BOOKING ==
app.post('/book-cash', async (req, res) => {
    console.log('Cash booking request received.');
    const { cart, billing, travelers } = req.body;

    // No payment verification is needed for cash bookings.
    // We go straight to sending the confirmation emails.
    try {

         // Call the function to add data to the sheet


        const travelerInfoHtml = travelers.map(person =>
            `<p><strong>${person.type}:</strong> ${person.name} (Age: ${person.age})</p>`
        ).join('');

        // Email 1: To the Admin
        const adminMailOptions = {
            from: '"GoToGo Travel Solutions" <bookings@gotogotravelsolutions.com>',
            to: 'devanshrajput032006@gmail.com', // Your admin email
            subject: `[CASH BOOKING] New Booking Confirmed: ${cart.packageName || "N/A"}`,
            html: `
                <h1>New Booking Received! (Pay by Cash)</h1>
                <p>A new booking has been made with the <strong>Pay by Cash</strong> option.</p>
                <hr>
                <h2>Booking Details</h2>
                <p><strong>Payment Method:</strong> <span style="font-weight: bold; color: green;">PAY ON ARRIVAL (CASH)</span></p>
                <p><strong>Package:</strong> ${cart.packageName || "N/A"}</p>
                <p><strong>Tour Date:</strong> ${billing.tourDate}</p>
                <hr>
                <h2>Traveler Information</h2>
                ${travelerInfoHtml}
                <hr>
                <h2>Facilities</h2>
                    <p><strong>${cart.optionTitle.replace(/^Option\s*\d+\s*:/i, " - ")}</strong></p>
                    <hr>
                <h2>Customer Information</h2>
                <p><strong>Name:</strong> ${billing.firstName} ${billing.lastName}</p>
                <p><strong>Email:</strong> ${billing.email}</p>
                <p><strong>Mobile:</strong> ${billing.mobile}</p>
                <p><strong>Hotel Name:<strong> ${billing.hotelName}</p>
                    <p><strong>Hotel Address:<strong> ${billing.hotelAddress}</p>
                    <p><strong>Hotel Additional Info:<strong> ${billing.additionalInfo}</p>
                <hr>
                <h2>Payment Information</h2>
                <p><strong>Total Price (USD):</strong> $${cart.totalPrice}</p>
            `
        };

        // Email 2: To the Customer
        const customerMailOptions = {
            from: '"GoToGo Travel Solutions" <bookings@gotogotravelsolutions.com>',
            to: billing.email, // Customer's email address
            subject: `✅ Your Booking is Confirmed! (Pay on Arrival)`,
            html: `
                <h1>Thank You For Your Booking, ${billing.firstName}!</h1>
                <p>Your booking with GoToGo Travel Solutions is confirmed. We look forward to seeing you!</p>
                <hr>
                <h2 style="color: red;">Payment Instructions</h2>
                <p>This booking is confirmed on a <strong>Pay on Arrival</strong> basis. Please be prepared to pay the total amount in cash at the start of your tour.</p>
                <p><strong>Total Price (USD):</strong> $${cart.totalPrice}</p>
                <hr>
                <h2>Facilities</h2>
                    <p><strong>${cart.optionTitle.replace(/^Option\s*\d+\s*:/i, " - ")}</strong></p>
                    <hr>
                <h2>Booking Summary</h2>
                <p><strong>Package:</strong> ${cart.packageName || "N/A"}</p>
                <p><strong>Tour Date:</strong> ${billing.tourDate}</p>
                <hr>
                <h2>Your Traveler Details</h2>
                ${travelerInfoHtml}
                <hr>
                <p>If you have any questions, please contact us. bookings@gotogotravelsolution.com</p>
                <a href="https://gotogotravelsolutions.com" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">Visit Our Website</a>                
                <p>Sincerely,<br>The GoToGo Team</p>
            `
        };
        
        // Send both emails
        await Promise.all([
            transporter.sendMail(adminMailOptions),
            transporter.sendMail(customerMailOptions)
        ]);
        
        console.log('Cash booking confirmation emails sent successfully.');

            addBookingToSheet({ 
        ...req.body, 
        paymentMethod: 'Cash', 
        paymentId: 'N/A' 
    });

        // Respond to the frontend
        res.json({ success: true, message: 'Cash booking confirmed and emails sent.' });

    } catch (error) {
        console.error('Failed to process cash booking or send emails:', error);
        res.status(500).json({ success: false, message: 'Server error during cash booking.' });
    }
});

// Replace the existing /submit-form route in your server.js

// == ROUTE 4: HANDLE CONTACT FORM SUBMISSION ==
// Replace the existing /submit-form route in your server.js

// == ROUTE 4: HANDLE CONTACT FORM SUBMISSION ==
// app.post('/submit-form', async (req, res) => {
//     console.log('Contact form submission received.');
//     // Updated to include "phone" and remove "subject"
//     const { name, email, phone, message } = req.body;

//     // Basic validation
//     if (!name || !email || !phone || !message) {
//         return res.status(400).json({ success: false, message: 'All fields are required.' });
//     }

//     try {
//         // --- Email 1: Notification to Admin ---
//         const adminNotificationOptions = {
//             from: '"Shuttle to agra Contact Form" <devanshbusinesswork@gmail.com>',
//             to: 'devanshrajput032006@gmail.com', // Your admin email
//             replyTo: email,
//             subject: `New Message from ${name}`, // Simplified subject
//             html: `
//                 <h1>New Message from Website Contact Form</h1>
//                 <p><strong>Name:</strong> ${name}</p>
//                 <p><strong>Email:</strong> ${email}</p>
//                 <p><strong>Phone:</strong> ${phone}</p> <hr>
//                 <h2>Message:</h2>
//                 <p>${message.replace(/\n/g, "<br>")}</p>
//             `
//         };

//         // --- Email 2: Auto-Reply to the User ---
//         const autoReplyOptions = {
//             from: '"GoToGo Travel Solutions" <devanshbusinesswork@gmail.com>',
//             to: email,
//             subject: `We've Received Your Message!`,
//             html: `
//                 <h1>Thank You for Contacting Us, ${name}!</h1>
//                 <p>We have received your message and will get back to you shortly.</p>
//                 <hr>
//                 <p><strong>Your Message:</strong><br>${message.replace(/\n/g, "<br>")}</p>
//                 <hr>
//                 <p>If you have any questions, please contact us. bookings@gotogotravelsolution.com</p>
//                 <a href="https://gotogotravelsolutions.com" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">Visit Our Website</a>                
//                 <p>Sincerely,<br>The GoToGo Team</p>
//             `
//         };

//         // --- Send both emails ---
//         await Promise.all([
//             transporter.sendMail(adminNotificationOptions),
//             transporter.sendMail(autoReplyOptions)
//         ]);

//         console.log('Contact form email and auto-reply sent successfully.');
//         res.json({ success: true, message: 'Form submitted successfully!' });

//     } catch (error) {
//         console.error('Failed to send contact form email:', error);
//         res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
//     }
// });

// Add this new route to your server.js file, along with your other app.post() routes

// == ROUTE 5: HANDLE EVENT INQUIRY FORM SUBMISSION ==
// app.post('/submit-event-inquiry', async (req, res) => {
//     console.log('Event inquiry form submission received.');
//     const { name, email, phone, eventLocation, eventDate, details } = req.body;

//     // Basic validation
//     if (!name || !email || !phone || !eventLocation || !eventDate) {
//         return res.status(400).json({ success: false, message: 'Please fill out all required fields.' });
//     }

//     try {
//         // --- Email 1: Notification to Admin ---
//         const adminNotificationOptions = {
//             from: '"Rooms&venues Form" <devanshbusinesswork@gmail.com>',
//             to: 'devanshrajput032006@gmail.com', // Your admin email
//             replyTo: email,
//             subject: `New Event Inquiry from ${name}`,
//             html: `
//                 <h1>New Event Inquiry Received</h1>
//                 <p><strong>Name:</strong> ${name}</p>
//                 <p><strong>Email:</strong> ${email}</p>
//                 <p><strong>Phone:</strong> ${phone}</p>
//                 <hr>
//                 <h2>Event Details</h2>
//                 <p><strong>Event Location:</strong> ${eventLocation}</p>
//                 <p><strong>Proposed Event Date:</strong> ${eventDate}</p>
//                 <hr>
//                 <h2>Additional Details:</h2>
//                 <p>${details ? details.replace(/\n/g, "<br>") : 'None provided'}</p>
//             `
//         };

//         // --- Email 2: Auto-Reply to the User ---
//         const autoReplyOptions = {
//             from: '"GoToGo Travel Solutions" <devanshbusinesswork@gmail.com>',
//             to: email,
//             subject: `We've Received Your Event Inquiry!`,
//             html: `
//                 <h1>Thank You for Your Inquiry, ${name}!</h1>
//                 <p>We have successfully received your request for an event. A member of our events team will review your details and get back to you soon.</p>
//                 <p>For your records, here is a copy of your submission:</p>
//                 <hr>
//                 <p><strong>Event Location:</strong> ${eventLocation}</p>
//                 <p><strong>Event Date:</strong> ${eventDate}</p>
//                 <hr>
//                 <p>If you have any questions, please contact us. bookings@gotogotravelsolution.com</p>
//                 <a href="https://gotogotravelsolutions.com" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">Visit Our Website</a>                
//                 <p>Sincerely,<br>The GoToGo Team</p>
//             `
//         };

//         // --- Send both emails ---
//         await Promise.all([
//             transporter.sendMail(adminNotificationOptions),
//             transporter.sendMail(autoReplyOptions)
//         ]);

//         console.log('Event inquiry email and auto-reply sent successfully.');
//         res.json({ success: true, message: 'Inquiry submitted successfully!' });

//     } catch (error) {
//         console.error('Failed to send event inquiry email:', error);
//         res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
//     }
// });

// --- 6. START THE SERVER ---
app.listen(PORT, () => {
    console.log(`Server is running successfully on http://localhost:${PORT}`);
});