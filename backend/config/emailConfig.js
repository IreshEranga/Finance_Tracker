require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ✅ Function to Send an Email with Custom HTML Template
const sendEmail = async (to, subject, financialData, pdfBuffer) => {
    const { totalIncome, totalExpenses, netBalance } = financialData;

    const emailHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="text-align: center; color: #4CAF50;">📊 Finance Tracker Report</h2>
        <p>Hello,</p>
        <p>Here is your latest financial summary:</p>
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 10px; font-weight: bold;">Total Income:</td>
                <td style="padding: 10px; color: green;">$${totalIncome}</td>
            </tr>
            <tr>
                <td style="padding: 10px; font-weight: bold;">Total Expenses:</td>
                <td style="padding: 10px; color: red;">$${totalExpenses}</td>
            </tr>
            <tr>
                <td style="padding: 10px; font-weight: bold;">Net Balance:</td>
                <td style="padding: 10px; color: ${netBalance >= 0 ? 'green' : 'red'};">$${netBalance}</td>
            </tr>
        </table>
        <p>Attached is your full financial report in PDF format.</p>
        <p>Thank you for using Finance Tracker!</p>
        <footer style="text-align: center; color: #777; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Finance Tracker App</p>
        </footer>
    </div>`;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        html: emailHTML,
        attachments: [{ filename: "Financial_Report.pdf", content: pdfBuffer }]
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📩 Email sent to ${to}`);
    } catch (error) {
        console.error("❌ Error sending email:", error);
    }
};

module.exports = sendEmail;
