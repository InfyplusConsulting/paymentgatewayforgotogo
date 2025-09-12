// 1. Replace this URL with your actual Apps Script Web App URL
const url = 'https://script.google.com/macros/s/AKfycbz2x0ll18Als-syzEE9xDysZyP-lmFqhgd27a87u-Lh33ObFIeXXo9wNHGq8aQMBMtH6g/exec';

// 2. This is sample data that mimics what your server would send
const testData = {
  cart: {
    packageName: "Test Package",
    adults: 2,
    children: 1,
    totalPrice: 250
  },
  billing: {
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
    mobile: "1234567890",
    tourDate: "2025-10-15"
  },
  travelers: [
    { type: "Adult", name: "John Doe", age: 35 },
    { type: "Adult", name: "Jane Doe", age: 32 },
    { type: "Child", name: "Jimmy Doe", age: 8 }
  ],
  paymentMethod: "Direct Test",
  paymentId: "test_12345"
};

// 3. This code sends the test data to your URL
console.log("Sending test data to Google Sheet...");

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain;charset=utf-8', // Use text/plain for this test method
  },
  body: JSON.stringify(testData)
})
.then(response => response.json())
.then(data => {
  console.log("Received response from Google Script:", data);
})
.catch(error => {
  console.error("Error during fetch:", error);
});