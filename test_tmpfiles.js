// test_tmpfiles.js
const PDFDocument = require("pdfkit");
const axios = require("axios");
const FormData = require("form-data");

function generatePDFBuffer(booking) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).fillColor("#0c52a2").text(booking.headingText, { align: "center" });
    doc.text(`Ticket No: ${booking.ticketNumber}`);
    doc.end();
  });
}

async function uploadToTmpFiles(buffer) {
  const form = new FormData();
  form.append("file", buffer, { filename: "ticket.pdf", contentType: "application/pdf" });

  try {
    const res = await axios.post("https://tmpfiles.org/api/v1/upload", form, {
      headers: form.getHeaders(),
    });

    console.log("Raw response:", res.data);

    // tmpfiles.org returns a URL inside res.data.data.url
    const link = res.data?.data?.url;
    if (!link) throw new Error("No link returned");
    console.log("✅ File link:", link);
    return link;
  } catch (err) {
    console.error("❌ Upload failed:", err.message);
  }
}

(async () => {
  const booking = {
    headingText: "GoToGo Airport Shuttle",
    ticketNumber: "G2G-TEST-123",
  };

  const pdfBuffer = await generatePDFBuffer(booking);
  console.log("PDF generated, size:", pdfBuffer.length, "bytes");

  await uploadToTmpFiles(pdfBuffer);
})();
