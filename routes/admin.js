const express = require('express');
const router = express.Router();

// Middleware to protect admin routes
const checkAdmin = (req, res, next) => {
  if (req.session.isAdmin) return next();
  res.redirect('/admin/login');
};

// Admin Dashboard
router.get('/dashboard', checkAdmin, async (req, res) => {
  const db = req.app.locals.db;
  const usersCol = db.collection('users');
  const depositsCol = db.collection('deposits');
  const withdrawalsCol = db.collection('withdrawals');

  const query = req.query.search || '';
  const view = req.query.view || 'users';

  let users = await usersCol.find({}).toArray();
  let deposits = await depositsCol.find({}).toArray();
  let withdrawals = await withdrawalsCol.find({}).toArray();

  if (query) {
    const lowerQuery = query.toLowerCase();
    users = users.filter(u =>
      u.id.toLowerCase().includes(lowerQuery) ||
      u.fullName.toLowerCase().includes(lowerQuery)
    );
  }

  res.render('admin/dashboard', {
    users,
    deposits,
    withdrawals,
    query,
    view,
    success: req.query.success
  });
});

// Update User Balance
router.post('/user/:id/update-balance', checkAdmin, async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.params.id;
  const newBalance = parseFloat(req.body.balance);

  if (isNaN(newBalance) || newBalance < 0) {
    return res.redirect('/admin/dashboard?success=false');
  }

  const result = await db.collection('users').updateOne(
    { id: userId },
    { $set: { balance: newBalance } }
  );

  res.redirect(`/admin/dashboard?success=${result.modifiedCount === 1}`);
});

// Toggle User Trading Status
router.post('/user/:id/toggle-trading', checkAdmin, async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.params.id;
  const action = req.body.action;

  const canTrade = action === 'approve';

  const result = await db.collection('users').updateOne(
    { id: userId },
    { $set: { canTrade } }
  );

  res.redirect(`/admin/dashboard?success=${result.modifiedCount === 1}`);
});

// Approve or Reject Withdrawal
router.post('/withdrawal/:id/:action', checkAdmin, async (req, res) => {
  const db = req.app.locals.db;
  const withdrawalId = req.params.id;
  const action = req.params.action;

  const withdrawalsCol = db.collection('withdrawals');
  const usersCol = db.collection('users');

  const withdrawal = await withdrawalsCol.findOne({ id: withdrawalId });

  if (!withdrawal) return res.redirect('/admin/dashboard?view=withdrawals&success=false');

  const updateResult = await withdrawalsCol.updateOne(
    { id: withdrawalId },
    { $set: { status: action === 'approve' ? 'approved' : 'rejected' } }
  );

  if (action === 'approve') {
    await usersCol.updateOne(
      { id: withdrawal.userId },
      { $inc: { balance: -withdrawal.amount } }
    );
  }

  res.redirect(`/admin/dashboard?view=withdrawals&success=${updateResult.modifiedCount === 1}`);
});

// Approve or Reject Deposit
router.post('/deposit/:id/:action', checkAdmin, async (req, res) => {
  const db = req.app.locals.db;
  const depositId = req.params.id;
  const action = req.params.action;

  const depositsCol = db.collection('deposits');
  const usersCol = db.collection('users');

  const deposit = await depositsCol.findOne({ id: depositId });

  if (!deposit) return res.redirect('/admin/dashboard?view=deposits&success=false');

  const updateResult = await depositsCol.updateOne(
    { id: depositId },
    { $set: { status: action === 'approve' ? 'approved' : 'rejected' } }
  );

  if (action === 'approve') {
    await usersCol.updateOne(
      { id: deposit.userId },
      { $inc: { balance: deposit.amount } }
    );
  }

  res.redirect(`/admin/dashboard?view=deposits&success=${updateResult.modifiedCount === 1}`);
});

module.exports = router;
