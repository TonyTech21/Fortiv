// User routes for Trading Platform
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Helper functions to read/write JSON files
const usersPath = path.join(__dirname, '../data/users.json');
const withdrawalsPath = path.join(__dirname, '../data/withdrawals.json');
const depositsPath = path.join(__dirname, '../data/deposits.json');

const getUsers = () => {
  const data = fs.readFileSync(usersPath, 'utf8');
  return JSON.parse(data);
};

const getWithdrawals = () => {
  const data = fs.readFileSync(withdrawalsPath, 'utf8');
  return JSON.parse(data);
};

const saveWithdrawals = (withdrawals) => {
  fs.writeFileSync(withdrawalsPath, JSON.stringify(withdrawals, null, 2));
};

const getDeposits = () => {
  const data = fs.readFileSync(depositsPath, 'utf8');
  return JSON.parse(data);
};

const saveDeposits = (deposits) => {
  fs.writeFileSync(depositsPath, JSON.stringify(deposits, null, 2));
};

// Helper function to get current user
const getCurrentUser = (req) => {
  const users = getUsers();
  return users.find(user => user.id === req.session.userId);
};

// Dashboard route
router.get('/dashboard', (req, res) => {
  const user = getCurrentUser(req);
  
  if (!user) {
    req.session.destroy();
    return res.redirect('/login');
  }
  
  res.render('user/dashboard', { user, page: 'dashboard' });
});

// Trade route
router.get('/trade', (req, res) => {
  const user = getCurrentUser(req);
  
  if (!user) {
    req.session.destroy();
    return res.redirect('/login');
  }
  
  res.render('user/trade', { user, page: 'trade' });
});

// Deposit route
router.get('/deposit', (req, res) => {
  const user = getCurrentUser(req);
  
  if (!user) {
    req.session.destroy();
    return res.redirect('/login');
  }
  
  res.render('user/deposit', { 
    user, 
    page: 'deposit',
    success: null,
    error: null
  });
});

// Submit deposit route
router.post('/deposit', (req, res) => {
  const user = getCurrentUser(req);
  
  if (!user) {
    req.session.destroy();
    return res.redirect('/login');
  }
  
  const { amount, cryptocurrency } = req.body;
  
  // Basic validation
  if (!amount || !cryptocurrency) {
    return res.render('user/deposit', {
      user,
      page: 'deposit',
      error: 'All fields are required',
      success: null
    });
  }
  
  // Create deposit request
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
  
  // Save deposit request
  const deposits = getDeposits();
  deposits.push(depositRequest);
  saveDeposits(deposits);
  
  res.render('user/deposit', {
    user,
    page: 'deposit',
    success: 'Deposit request submitted successfully!',
    error: null
  });
});

// Withdraw route
router.get('/withdraw', (req, res) => {
  const user = getCurrentUser(req);
  
  if (!user) {
    req.session.destroy();
    return res.redirect('/login');
  }
  
  res.render('user/withdraw', { 
    user, 
    page: 'withdraw', 
    error: null, 
    success: null 
  });
});

// Withdraw POST route
router.post('/withdraw', (req, res) => {
  const user = getCurrentUser(req);
  
  if (!user) {
    req.session.destroy();
    return res.redirect('/login');
  }
  
  const { bitcoinAddress, walletUid, amount } = req.body;
  
  // Basic validation
  if (!bitcoinAddress || !amount) {
    return res.render('user/withdraw', { 
      user, 
      page: 'withdraw', 
      error: 'Bitcoin address and amount are required', 
      success: null,
      formData: req.body
    });
  }
  
  // Amount validation
  const withdrawAmount = parseFloat(amount);
  if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
    return res.render('user/withdraw', { 
      user, 
      page: 'withdraw', 
      error: 'Please enter a valid amount', 
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
  
  // Create withdrawal request
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
  
  // Save withdrawal request
  const withdrawals = getWithdrawals();
  withdrawals.push(withdrawalRequest);
  saveWithdrawals(withdrawals);
  
  // Return success
  res.render('user/withdraw', { 
    user, 
    page: 'withdraw', 
    error: null, 
    success: 'Withdrawal request submitted successfully!',
    formData: {}
  });
});

module.exports = router;