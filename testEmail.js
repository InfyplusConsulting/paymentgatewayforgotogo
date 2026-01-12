// // test.js
// require("dotenv").config();
// const sendBookingEmail = require("./utils/sendBookingEmail"); // adjust path if it's in utils folder

// const bookingData = {
//   ticketNumber: "G2GTEST123",
//   names: ["Devansh Kumar"],
//   phones: ["9876543210"],
//   pickupDate: "2025-11-13",
//   pickupLocation: "Delhi IGI Airport",
//   boardingTime: "10:30 AM",
//   terminal: "T3",
//   serviceType: "Airport Shuttle",
//   amountPaid: "899",
//   paymentId: "pay_test_ABC123XYZ",
// };

// (async () => {
//   try {
//     console.log("🚀 Sending user email...");
//     await sendBookingEmail(bookingData, "devanshrajputstudio@gmail.com"); // user mail

//     console.log("🚀 Sending admin email...");
//     await sendBookingEmail(bookingData, "devanshbusinesswork@gmail.com", true); // admin mail

//     console.log("✅ Both emails sent!");
//   } catch (err) {
//     console.error("❌ Error:", err.message);
//   }
// })();

// testEmail.js
const sendBookingEmail = require("./utils/sendBookingEmail");

async function runTest() {
  console.log("🚀 Starting Email Test...");

  const mockBookingData = {
    ticketNumber: "GTG" + Math.floor(100000 + Math.random() * 900000),
    names: ["John Doe", "Jane Smith"],
    phones: ["9876543210", "9123456789"],
    pickupDate: "2026-01-20",
    pickupLocation: "Aerocity Metro Station",
    boardingTime: "10:30 AM",
    terminal: "Terminal 3 (T3)",
    serviceType: "Airport Shuttle - Shared",
    amountPaid: 499,
    paymentId: "pay_xyz123test",
  };

  // Replace with your own email to see the result
  const testRecipient = "devanshrajput032006@gmail.com"; 

  console.log("--- Sending Customer Copy ---");
  await sendBookingEmail(mockBookingData, testRecipient, false);

  console.log("\n--- Sending Admin Copy ---");
  // Typically Admin copy goes to your care@ email
  await sendBookingEmail(mockBookingData, "devanshrajput032006@gmail.com", true);

  console.log("\n🏁 Test finished. Check your inbox!");
}

runTest();