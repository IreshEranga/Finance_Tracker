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

        const budgetUsage = budgets.map(budget => ({
            category: budget.category,
            limit: budget.limit,
            spent: budget.spent,
            remaining: budget.limit - budget.spent,
            status: budget.spent > budget.limit ? "Over Budget" : "Within Budget"
        }));

        // ✅ Create PDF Document In-Memory
        const doc = new PDFDocument();
        let pdfBuffer = [];

        doc.on('data', chunk => pdfBuffer.push(chunk));
        doc.on('end', async () => {
            const pdfData = Buffer.concat(pdfBuffer);

            // ✅ Send Email with HTML Template
            await sendEmail(
                req.user.email,
                "Your Financial Report",
                { totalIncome, totalExpenses, netBalance: totalIncome - totalExpenses },
                pdfData
            );

            res.status(200).json({ message: "Financial report emailed successfully!" });
        });

        // ✅ PDF Content
        doc.fontSize(18).text("Financial Report", { align: "center" }).moveDown();
        doc.fontSize(14).text(`Total Income: $${totalIncome}`);
        doc.fontSize(14).text(`Total Expenses: $${totalExpenses}`);
        doc.fontSize(14).text(`Net Balance: $${totalIncome - totalExpenses}`).moveDown();

        doc.fontSize(16).text("Category Expenses", { underline: true }).moveDown();
        categoryExpenses.forEach(item => {
            doc.fontSize(12).text(`${item._id}: $${item.totalSpent}`);
        });

        doc.moveDown().fontSize(16).text("Budget Usage", { underline: true }).moveDown();
        budgetUsage.forEach(budget => {
            doc.fontSize(12).text(`${budget.category}: Limit $${budget.limit}, Spent $${budget.spent}, Remaining $${budget.remaining}, Status: ${budget.status}`);
        });

        doc.end(); // Finalize PDF

    } catch (error) {
        res.status(500).json({ message: "Error generating and emailing PDF report", error });
    }
};

module.exports = { generateReportPDFAndEmail };
