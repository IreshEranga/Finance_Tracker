const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');

//  Add Transaction (Tracks Budget Spending)
const addTransaction = async (req, res) => {
    try {
        const { type, amount, category, tags, description } = req.body;

        //  Create Transaction
        const transaction = await Transaction.create({
            user: req.user._id,
            type,
            amount,
            category,
            tags,
            description
        });

        //  If it's an expense, update the budget
        if (type === 'expense') {
            const budget = await Budget.findOne({ user: req.user._id, category });

            if (budget) {
                await budget.updateSpentAmount(); //  Recalculate spent amount

                if (budget.spent > budget.limit) {
                    return res.status(200).json({
                        message: `Transaction added successfully, but WARNING: You exceeded the budget for ${category}!`,
                        transaction
                    });
                }
            }
        }

        res.status(201).json({ message: 'Transaction added successfully', transaction });
    } catch (error) {
        res.status(500).json({ message: 'Error adding transaction', error });
    }
};


//  Get Transactions (User can see their own, Admin can see all)
const getTransactions = async (req, res) => {
    try {
        const filter = req.user.role === 'admin' ? {} : { user: req.user._id };
        const transactions = await Transaction.find(filter).populate('user', 'name email');
        res.status(200).json({message: 'Transactions load successfully', transactions});
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving transactions', error });
    }
};

//  Update Transaction (Only the owner can update)
const updateTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

        if (transaction.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const updatedTransaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({message: 'Updated Transaction ', updatedTransaction});
    } catch (error) {
        res.status(500).json({ message: 'Error updating transaction', error });
    }
};

//  Delete Transaction (Only the owner can delete)
const deleteTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

        if (transaction.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        await transaction.deleteOne();
        res.status(200).json({ message: 'Transaction deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting transaction', error });
    }
};

module.exports = { addTransaction, getTransactions, updateTransaction, deleteTransaction };
