const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');

// ✅ Generate Financial Report (Admin for all users, User for own transactions)
const generateReport = async (req, res) => {
    try {
        let filter = {}; // Default: Admin sees all users
        if (req.user.role !== 'admin') {
            filter.user = req.user._id; // Regular users see only their own transactions
        }

        // ✅ 1. Calculate Total Income & Expenses
        const totals = await Transaction.aggregate([
            { $match: filter },
            { $group: { 
                _id: "$type", 
                totalAmount: { $sum: "$amount" } 
            }}
        ]);

        let totalIncome = 0;
        let totalExpenses = 0;

        totals.forEach((item) => {
            if (item._id === "income") totalIncome = item.totalAmount;
            if (item._id === "expense") totalExpenses = item.totalAmount;
        });

        // ✅ 2. Calculate Spending by Category
        const categoryExpenses = await Transaction.aggregate([
            { $match: filter },
            { $group: { 
                _id: "$category", 
                totalSpent: { $sum: "$amount" } 
            }}
        ]);

        // ✅ 3. Get Budget Usage (User sees only their own, Admin sees all)
        const budgets = await Budget.find(filter);

        const budgetUsage = budgets.map(budget => ({
            category: budget.category,
            limit: budget.limit,
            spent: budget.spent,
            remaining: budget.limit - budget.spent,
            status: budget.spent > budget.limit ? "Over Budget" : "Within Budget"
        }));

        // ✅ 4. Send Report Response
        res.status(200).json({
            message: req.user.role === 'admin' ? "Admin report for all users" : "User report generated",
            totalIncome,
            totalExpenses,
            netBalance: totalIncome - totalExpenses,
            categoryExpenses,
            budgetUsage
        });

    } catch (error) {
        res.status(500).json({ message: "Error generating report", error });
    }
};

module.exports = { generateReport };
