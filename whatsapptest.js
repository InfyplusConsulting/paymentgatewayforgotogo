// whatsapptest.js
const PDFDocument = require("pdfkit");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

function generatePDFBuffer(booking) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Simple layout
    doc.fontSize(20).fillColor("#0c52a2").text(booking.headingText || "GoToGo Ticket", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor("#000");
    doc.text(`Ticket No: ${booking.ticketNumber || "G2G-0000"}`);
    doc.moveDown(0.2);
    doc.text(`Service: ${booking.serviceType || ""}`);
    doc.text(`Pickup: ${booking.pickupLocation || ""}`);
    doc.text(`Date: ${booking.pickupDate || ""}`);
    doc.text(`Time: ${booking.boardingTime || ""}`);
    doc.text(`Drop Terminal: ${booking.terminal || ""}`);
    doc.moveDown();

    doc.text("Passengers:", { underline: true });
    (booking.names || []).forEach((n, i) => {
      const ph = (booking.phones && booking.phones[i]) || "";
      doc.text(` • ${n}    ${ph}`);
    });

    doc.moveDown();
    doc.text(`Amount Paid: ₹${booking.amountPaid || "0"}`);
    doc.text(`Payment ID: ${booking.paymentId || "N/A"}`);

    doc.moveDown(1);
    doc.fontSize(9).fillColor("#666");
    doc.text("This is an automated ticket. For assistance contact care@gotogotravelsolutions.com", { align: "left" });

    doc.end();
  });
}

async function uploadBufferToTransferSh(buffer) {
  const tempFilePath = path.join(__dirname, "GoToGo-Ticket.pdf");
  fs.writeFileSync(tempFilePath, buffer);

  try {
    const res = await axios.put(
      "https://transfer.sh/GoToGo-Ticket.pdf",
      fs.createReadStream(tempFilePath),
      {
        headers: { "Content-Type": "application/pdf" },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    const fileLink = res.data.trim();
    console.log("✅ Transfer.sh Link:", fileLink);
    return fileLink;
  } catch (err) {
    console.error("❌ Upload failed:", err.response?.data || err.message);
    throw err;
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

// === run test with raw sample data ===
(async () => {
  const booking = {
    headingText: "GoToGo Airport Shuttle",
    ticketNumber: "G2G-20250811-123",
    names: ["Ravi Kumar", "Sita Sharma"],
    phones: ["+919876543210", "+919812345678"],
    serviceType: "Shuttle",
    pickupLocation: "IGI Airport Terminal 1",
    pickupDate: "2025-08-20",
    boardingTime: "07:00 AM",
    terminal: "T1",
    amountPaid: "499",
    paymentId: "pay_ABC123",
  };

  const pdfBuffer = await generatePDFBuffer(booking);
  console.log("PDF generated (bytes):", pdfBuffer.length);

  await uploadBufferToTransferSh(pdfBuffer);
})();
