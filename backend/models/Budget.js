const mongoose = require('mongoose');
const Transaction = require('./Transaction');

const budgetSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, required: true },
    limit: { type: Number, required: true },
    spent: { type: Number, default: 0 }
});

// Function to Recalculate Spent Amount
budgetSchema.methods.updateSpentAmount = async function () {
    const totalSpent = await Transaction.aggregate([
        { $match: { user: this.user, category: this.category, type: 'expense' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    this.spent = totalSpent.length > 0 ? totalSpent[0].total : 0;
    await this.save();
};

module.exports = mongoose.model('Budget', budgetSchema);
