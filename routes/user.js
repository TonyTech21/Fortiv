const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Middleware to get user from MongoDB using session ID
const getUserFromSession = async (req, db) => {
  if (!req.session?.userId) return null;
  const users = db.collection('users');
  return await users.findOne({ id: req.session.userId });
};

// Dashboard
router.get('/dashboard', async (req, res) => {
  const db = req.app.locals.db;
  const user = await getUserFromSession(req, db);
  if (!user) {
    req.session.destroy(() => res.redirect('/login'));
    return;
  }
  res.render('user/dashboard', { user, page: 'dashboard' });
});

// Trade Page
router.get('/trade', async (req, res) => {
  const db = req.app.locals.db;
  const user = await getUserFromSession(req, db);
  if (!user) {
    req.session.destroy(() => res.redirect('/login'));
    return;
  }
  res.render('user/trade', { user, page: 'trade' });
});

// Process Trade
router.post('/trade', async (req, res) => {
  const db = req.app.locals.db;
  const users = db.collection('users');

  const user = await getUserFromSession(req, db);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { amount, signal } = req.body;
  const tradeAmount = parseFloat(amount);

  if (isNaN(tradeAmount) || tradeAmount < 10)
    return res.status(400).json({ error: 'Invalid trade amount' });

  if (tradeAmount > user.balance)
    return res.status(400).json({ error: 'Insufficient balance' });

  const newBalance = user.balance - tradeAmount;

  const result = await users.updateOne(
    { id: user.id },
    { $set: { balance: newBalance } }
  );

  if (result.modifiedCount !== 1)
    return res.status(500).json({ error: 'Trade update failed' });

  // Update session
  req.session.userId = user.id;

  res.json({ success: true, newBalance });
});

// Deposit
router.get('/deposit', async (req, res) => {
  const db = req.app.locals.db;
  const user = await getUserFromSession(req, db);
  if (!user) {
    req.session.destroy(() => res.redirect('/login'));
    return;
  }
  res.render('user/deposit', { user, page: 'deposit', success: null, error: null });
});

router.post('/deposit', async (req, res) => {
  const db = req.app.locals.db;
  const user = await getUserFromSession(req, db);
  if (!user) {
    req.session.destroy(() => res.redirect('/login'));
    return;
  }

  const { amount, cryptocurrency } = req.body;

  if (!amount || !cryptocurrency) {
    return res.render('user/deposit', {
      user,
      page: 'deposit',
      error: 'All fields are required',
      success: null
    });
  }

  const depositRequest = {
    id: uuidv4(),
    userId: user.id,
    userEmail: user.email,
    userName: user.fullName,
    amount: parseFloat(amount),
    cryptocurrency,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  await db.collection('deposits').insertOne(depositRequest);

  res.render('user/deposit', {
    user,
    page: 'deposit',
    success: 'Deposit request submitted successfully!',
    error: null
  });
});

// Withdraw
router.get('/withdraw', async (req, res) => {
  const db = req.app.locals.db;
  const user = await getUserFromSession(req, db);
  if (!user) {
    req.session.destroy(() => res.redirect('/login'));
    return;
  }
  res.render('user/withdraw', { user, page: 'withdraw', error: null, success: null });
});

router.post('/withdraw', async (req, res) => {
  const db = req.app.locals.db;
  const user = await getUserFromSession(req, db);
  if (!user) {
    req.session.destroy(() => res.redirect('/login'));
    return;
  }

  const { bitcoinAddress, walletUid, amount } = req.body;
  const withdrawAmount = parseFloat(amount);

  if (!bitcoinAddress || isNaN(withdrawAmount) || withdrawAmount <= 0) {
    return res.render('user/withdraw', {
      user,
      page: 'withdraw',
      error: 'Please enter a valid amount and Bitcoin address',
      success: null,
      formData: req.body
    });
  }

  if (withdrawAmount > user.balance) {
    return res.render('user/withdraw', {
      user,
      page: 'withdraw',
      error: 'Insufficient balance',
      success: null,
      formData: req.body
    });
  }

  const withdrawalRequest = {
    id: uuidv4(),
    userId: user.id,
    userEmail: user.email,
    userName: user.fullName,
    bitcoinAddress,
    walletUid: walletUid || '',
    amount: withdrawAmount,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  await db.collection('withdrawals').insertOne(withdrawalRequest);

  // Also update the user balance
  const users = db.collection('users');
  await users.updateOne(
    { id: user.id },
    { $set: { balance: user.balance - withdrawAmount } }
  );

  res.render('user/withdraw', {
    user,
    page: 'withdraw',
    success: 'Withdrawal request submitted successfully!',
    error: null,
    formData: {}
  });
});

module.exports = router;
