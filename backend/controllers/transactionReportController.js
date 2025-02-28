const PDFDocument = require('pdfkit');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const sendEmail = require('../config/emailConfig');

const generateReportPDFAndEmail = async (req, res) => {
    try {
        let filter = req.user.role === 'admin' ? {} : { user: req.user._id };

        // Fetch Data
        const totals = await Transaction.aggregate([{ $match: filter }, { $group: { _id: "$type", totalAmount: { $sum: "$amount" } } }]);
        let totalIncome = 0, totalExpenses = 0;
        totals.forEach((item) => {
            if (item._id === "income") totalIncome = item.totalAmount;
            if (item._id === "expense") totalExpenses = item.totalAmount;
        });

        const categoryExpenses = await Transaction.aggregate([{ $match: filter }, { $group: { _id: "$category", totalSpent: { $sum: "$amount" } } }]);
        const budgets = await Budget.find(filter);
        const transactions = await Transaction.find(filter).sort({ date: -1 });

        const budgetUsage = budgets.map(budget => ({
            category: budget.category,
            limit: budget.limit,
            spent: budget.spent,
            remaining: budget.limit - budget.spent,
            status: budget.spent > budget.limit ? "Over Budget" : "Within Budget"
        }));

        // Create PDF Document
        const doc = new PDFDocument({ margin: 50 });
        let pdfBuffer = [];

        doc.on('data', chunk => pdfBuffer.push(chunk));
        doc.on('end', async () => {
            const pdfData = Buffer.concat(pdfBuffer);
            await sendEmail(
                req.user.email,
                "Your Financial Report",
                { totalIncome, totalExpenses, netBalance: totalIncome - totalExpenses },
                pdfData
            );
            res.status(200).json({ message: "Financial report emailed successfully!" });
        });

        // Header
        doc.font('Helvetica-Bold').fontSize(22).fillColor("#4CAF50").text("Finance Report", { align: "center" }).moveDown(1);
        const formattedDate = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
        doc.font('Times-Roman').fontSize(12).fillColor("black")
           .text(`Date: ${formattedDate}`, { align: "right" })
           .moveDown(1.5);

        // Financial Summary
        doc.font('Helvetica-Bold').fontSize(16).fillColor("#333").text("Financial Summary:", { underline: true }).moveDown(0.5);
        doc.font('Times-Roman').fontSize(12).fillColor("black");
        doc.text(`Total Income: $${totalIncome.toFixed(2)}`);
        doc.text(`Total Expenses: $${totalExpenses.toFixed(2)}`);
        doc.fillColor(totalIncome - totalExpenses >= 0 ? "green" : "red")
           .text(`Net Balance: $${(totalIncome - totalExpenses).toFixed(2)}`)
           .moveDown(1);

        // Expenses by Category Table
        doc.font('Helvetica-Bold').fontSize(16).fillColor("#333").text("Expenses by Category:", { underline: true }).moveDown(0.5);
        const expStartX = 50;
        const expStartY = doc.y;
        const expColWidths = [300, 150];

        // Expenses Table Header
        doc.fillColor("#00695C")
           .rect(expStartX, expStartY, expColWidths[0] + expColWidths[1], 20)
           .fill();
        doc.fillColor("white")
           .fontSize(12)
           .text("Category", expStartX + 5, expStartY + 5, { width: expColWidths[0], align: "left" })
           .text("Amount", expStartX + expColWidths[0] + 5, expStartY + 5, { width: expColWidths[1], align: "right" });

        // Expenses Table Data
        doc.font('Times-Roman');
        let currentY = expStartY + 20;
        categoryExpenses.forEach((item) => {
            doc.fillColor("black")
               .text(item._id, expStartX + 5, currentY + 5, { width: expColWidths[0], align: "left" })
               .text(`$${item.totalSpent.toFixed(2)}`, expStartX + expColWidths[0] + 5, currentY + 5, { width: expColWidths[1], align: "right" });
            currentY += 20;
        });
        doc.moveTo(expStartX, expStartY).lineTo(expStartX + expColWidths[0] + expColWidths[1], expStartY).stroke();
        doc.moveTo(expStartX, currentY).lineTo(expStartX + expColWidths[0] + expColWidths[1], currentY).stroke();
        doc.moveDown(1);

        // Budget Overview Table
        doc.font('Helvetica-Bold').fontSize(16).fillColor("#333").text("Budget Overview:", { underline: true }).moveDown(0.5);
        const budStartX = 50;
        const budStartY = doc.y;
        const budColWidths = [150, 90, 90, 90, 90];

        // Budget Table Header
        doc.fillColor("#00695C")
           .rect(budStartX, budStartY, budColWidths.reduce((a, b) => a + b), 20)
           .fill();
        doc.fillColor("white")
           .fontSize(12)
           .text("Category", budStartX + 5, budStartY + 5, { width: budColWidths[0], align: "left" })
           .text("Limit", budStartX + budColWidths[0] + 5, budStartY + 5, { width: budColWidths[1], align: "right" })
           .text("Spent", budStartX + budColWidths[0] + budColWidths[1] + 5, budStartY + 5, { width: budColWidths[2], align: "right" })
           .text("Remaining", budStartX + budColWidths[0] + budColWidths[1] + budColWidths[2] + 5, budStartY + 5, { width: budColWidths[3], align: "right" })
           .text("Status", budStartX + budColWidths[0] + budColWidths[1] + budColWidths[2] + budColWidths[3] + 5, budStartY + 5, { width: budColWidths[4], align: "center" });

        // Budget Table Data
        doc.font('Times-Roman');
        currentY = budStartY + 20;
        budgetUsage.forEach((budget) => {
            doc.fillColor("black")
               .text(budget.category, budStartX + 5, currentY + 5, { width: budColWidths[0], align: "left" })
               .text(`$${budget.limit.toFixed(2)}`, budStartX + budColWidths[0] + 5, currentY + 5, { width: budColWidths[1], align: "right" })
               .text(`$${budget.spent.toFixed(2)}`, budStartX + budColWidths[0] + budColWidths[1] + 5, currentY + 5, { width: budColWidths[2], align: "right" })
               .text(`$${budget.remaining.toFixed(2)}`, budStartX + budColWidths[0] + budColWidths[1] + budColWidths[2] + 5, currentY + 5, { width: budColWidths[3], align: "right" })
               .fillColor(budget.status === "Over Budget" ? "red" : "green")
               .text(budget.status, budStartX + budColWidths[0] + budColWidths[1] + budColWidths[2] + budColWidths[3] + 5, currentY + 5, { width: budColWidths[4], align: "center" });
            currentY += 20;
        });
        doc.moveTo(budStartX, budStartY).lineTo(budStartX + budColWidths.reduce((a, b) => a + b), budStartY).stroke();
        doc.moveTo(budStartX, currentY).lineTo(budStartX + budColWidths.reduce((a, b) => a + b), currentY).stroke();
        doc.moveDown(1);

        // Transactions Table
        doc.font('Helvetica-Bold').fontSize(16).fillColor("#333").text("Recent Transactions:", { underline: true }).moveDown(0.5);
        const startX = 50;
        const startY = doc.y;
        const colWidths = [130, 90, 90, 150];

        // Transactions Table Header
        doc.fillColor("#00695C")
           .rect(startX, startY, colWidths.reduce((a, b) => a + b), 20)
           .fill();
        doc.fillColor("white")
           .fontSize(12)
           .text("Date", startX + 5, startY + 5, { width: colWidths[0], align: "left" })
           .text("Type", startX + colWidths[0] + 5, startY + 5, { width: colWidths[1], align: "left" })
           .text("Amount", startX + colWidths[0] + colWidths[1] + 5, startY + 5, { width: colWidths[2], align: "right" })
           .text("Category", startX + colWidths[0] + colWidths[1] + colWidths[2] + 5, startY + 5, { width: colWidths[3], align: "left" });

        // Transactions Table Data
        doc.font('Times-Roman');
        currentY = startY + 20;
        transactions.slice(0, 10).forEach((txn) => {
            const formattedTxnDate = new Date(txn.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
            doc.fillColor("black")
               .text(formattedTxnDate, startX + 5, currentY + 5, { width: colWidths[0], align: "left" })
               .text(txn.type.charAt(0).toUpperCase() + txn.type.slice(1), startX + colWidths[0] + 5, currentY + 5, { width: colWidths[1], align: "left" })
               .text(`$${txn.amount.toFixed(2)}`, startX + colWidths[0] + colWidths[1] + 5, currentY + 5, { width: colWidths[2], align: "right" })
               .text(txn.category, startX + colWidths[0] + colWidths[1] + colWidths[2] + 5, currentY + 5, { width: colWidths[3], align: "left" });
            currentY += 20;
        });
        doc.moveTo(startX, startY).lineTo(startX + colWidths.reduce((a, b) => a + b), startY).stroke();
        doc.moveTo(startX, currentY).lineTo(startX + colWidths.reduce((a, b) => a + b), currentY).stroke();

        // Footer
        doc.moveDown(1)
           .fillColor("#777")
           .fontSize(10)
           .text("© Finance Tracker App - All rights reserved.", { align: "center" });

        doc.end();

    } catch (error) {
        res.status(500).json({ message: "Error generating and emailing PDF report", error });
    }
};

module.exports = { generateReportPDFAndEmail };