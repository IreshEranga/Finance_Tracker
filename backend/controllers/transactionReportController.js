const PDFDocument = require('pdfkit');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const sendEmail = require('../config/emailConfig');

const generateReportPDFAndEmail = async (req, res) => {
    try {
        let filter = req.user.role === 'admin' ? {} : { user: req.user._id };

        // ✅ Fetch Data
        const totals = await Transaction.aggregate([{ $match: filter }, { $group: { _id: "$type", totalAmount: { $sum: "$amount" } } }]);
        let totalIncome = 0, totalExpenses = 0;
        totals.forEach((item) => {
            if (item._id === "income") totalIncome = item.totalAmount;
            if (item._id === "expense") totalExpenses = item.totalAmount;
        });

        const categoryExpenses = await Transaction.aggregate([{ $match: filter }, { $group: { _id: "$category", totalSpent: { $sum: "$amount" } } }]);
        const budgets = await Budget.find(filter);
        const transactions = await Transaction.find(filter).sort({ date: -1 }); // Sort by latest first

        const budgetUsage = budgets.map(budget => ({
            category: budget.category,
            limit: budget.limit,
            spent: budget.spent,
            remaining: budget.limit - budget.spent,
            status: budget.spent > budget.limit ? "Over Budget" : "Within Budget"
        }));

        // ✅ Create PDF Document In-Memory
        const doc = new PDFDocument({ margin: 50 });
        let pdfBuffer = [];

        doc.on('data', chunk => pdfBuffer.push(chunk));
        doc.on('end', async () => {
            const pdfData = Buffer.concat(pdfBuffer);

            // ✅ Send Email with the updated PDF
            await sendEmail(
                req.user.email,
                "Your Financial Report",
                { totalIncome, totalExpenses, netBalance: totalIncome - totalExpenses },
                pdfData
            );

            res.status(200).json({ message: "Financial report emailed successfully!" });
        });

        // ✅ Apply Clean Font
        doc.font('Helvetica');

        // ✅ PDF Header
        doc.fontSize(22).fillColor("#4CAF50").text("📊 Finance Tracker Report", { align: "center" }).moveDown(2);
        doc.fontSize(12).fillColor("black").text(`Date: ${new Date().toLocaleDateString()}`, { align: "right" }).moveDown();

        // ✅ Financial Summary
        doc.fontSize(16).fillColor("#333").text("📌 Financial Summary:", { underline: true }).moveDown();
        doc.fontSize(12).fillColor("black");
        doc.text(`Total Income:   $${totalIncome.toFixed(2)}`, { align: "left" });
        doc.text(`Total Expenses: $${totalExpenses.toFixed(2)}`, { align: "left" });
        doc.fillColor(totalIncome - totalExpenses >= 0 ? "green" : "red")
            .text(`Net Balance:    $${(totalIncome - totalExpenses).toFixed(2)}`, { align: "left" }).moveDown();

        // ✅ Expenses by Category
        doc.fontSize(16).fillColor("#333").text("📌 Expenses by Category:", { underline: true }).moveDown();
        categoryExpenses.forEach(item => {
            doc.fontSize(12).fillColor("black").text(`- ${item._id}: $${item.totalSpent.toFixed(2)}`);
        });
        doc.moveDown();

        // ✅ Budget Overview
        doc.fontSize(16).fillColor("#333").text("📌 Budget Overview:", { underline: true }).moveDown();
        budgets.forEach(budget => {
            doc.fontSize(12).fillColor("black")
                .text(`- ${budget.category}:`, { continued: false })
                .text(`   🔹 Limit: $${budget.limit.toFixed(2)}`, { align: "left" })
                .text(`   🔹 Spent: $${budget.spent.toFixed(2)}`, { align: "left" })
                .text(`   🔹 Remaining: $${(budget.limit - budget.spent).toFixed(2)}`, { align: "left" })
                .fillColor(budget.spent > budget.limit ? "red" : "green")
                .text(`   🔹 Status: ${budget.spent > budget.limit ? "❌ Over Budget" : "✔ Within Budget"}`, { align: "left" })
                .moveDown();
        });

        // ✅ Transactions Table
        doc.fontSize(16).fillColor("#333").text("📌 Recent Transactions:", { underline: true }).moveDown();
        doc.fontSize(12).fillColor("black");

        // Table Header
        const startX = 50;
        const startY = doc.y;
        const colWidths = [150, 100, 100, 200]; // Column widths: Date, Type, Amount, Category

        doc.text("Date", startX, startY, { width: colWidths[0], align: "left" });
        doc.text("Type", startX + colWidths[0], startY, { width: colWidths[1], align: "left" });
        doc.text("Amount", startX + colWidths[0] + colWidths[1], startY, { width: colWidths[2], align: "left" });
        doc.text("Category", startX + colWidths[0] + colWidths[1] + colWidths[2], startY, { width: colWidths[3], align: "left" });
        doc.moveDown(0.5);

        // Draw a line under the headers
        doc.moveTo(startX, doc.y).lineTo(startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], doc.y).stroke();

        // Table Data
        transactions.slice(0, 10).forEach((txn) => { // Show only last 10 transactions
            const y = doc.y + 5;
            doc.text(new Date(txn.date).toLocaleDateString(), startX, y, { width: colWidths[0], align: "left" });
            doc.text(txn.type.charAt(0).toUpperCase() + txn.type.slice(1), startX + colWidths[0], y, { width: colWidths[1], align: "left" });
            doc.text(`$${txn.amount.toFixed(2)}`, startX + colWidths[0] + colWidths[1], y, { width: colWidths[2], align: "left" });
            doc.text(txn.category, startX + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3], align: "left" });
            doc.moveDown(0.5);
        });

        // ✅ Footer
        doc.moveDown().fillColor("#777").fontSize(10).text("© Finance Tracker App - All rights reserved.", { align: "center" });

        doc.end(); // Finalize PDF

    } catch (error) {
        res.status(500).json({ message: "Error generating and emailing PDF report", error });
    }
};

module.exports = { generateReportPDFAndEmail };
