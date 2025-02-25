const Budget = require('../models/Budget');

//  Set Budget
const setBudget = async (req, res) => {
    try {
        const { category, limit } = req.body;
        const budget = await Budget.create({
            user: req.user._id,
            category,
            limit
        });
        res.status(201).json({message:'Budget setting success', budget});
    } catch (error) {
        res.status(500).json({ message: 'Error setting budget', error });
    }
};

//  Get Budgets
const getBudgets = async (req, res) => {
    try {
        const budgets = await Budget.find({ user: req.user._id });
        res.status(200).json(budgets);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving budgets', error });
    }
};

//  Update Budget
const updateBudget = async (req, res) => {
    try {
        const budget = await Budget.findById(req.params.id);
        if (!budget || budget.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const updatedBudget = await Budget.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(updatedBudget);
    } catch (error) {
        res.status(500).json({ message: 'Error updating budget', error });
    }
};

//  Delete Budget
const deleteBudget = async (req, res) => {
    try {
        const budget = await Budget.findById(req.params.id);
        if (!budget || budget.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        await budget.deleteOne();
        res.status(200).json({ message: 'Budget deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting budget', error });
    }
};

module.exports = { setBudget, getBudgets, updateBudget, deleteBudget };
