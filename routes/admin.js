// Admin routes for Trading Platform
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Helper functions to read/write JSON files
const usersPath = path.join(__dirname, '../data/users.json');
const withdrawalsPath = path.join(__dirname, '../data/withdrawals.json');
const depositsPath = path.join(__dirname, '../data/deposits.json');

const getUsers = () => {
  const data = fs.readFileSync(usersPath, 'utf8');
  return JSON.parse(data);
};

const saveUsers = (users) => {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
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

// Admin authentication middleware
const checkAdmin = (req, res, next) => {
  if (req.session.isAdmin) {
    return next();
  }
  res.redirect('/admin/login');
};

// Admin dashboard route
router.get('/dashboard', checkAdmin, (req, res) => {
  const users = getUsers();
  const withdrawals = getWithdrawals();
  const deposits = getDeposits();
  const query = req.query.search || '';
  const view = req.query.view || 'users';
  
  // Filter users based on search query
  let filteredUsers = users;
  if (query) {
    filteredUsers = users.filter(user => 
      user.id.toLowerCase().includes(query.toLowerCase()) || 
      user.fullName.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  res.render('admin/dashboard', { 
    users: filteredUsers,
    withdrawals,
    deposits,
    query,
    view,
    success: req.query.success
  });
});

// Update user balance route
router.post('/user/:id/update-balance', checkAdmin, (req, res) => {
  const users = getUsers();
  const userId = req.params.id;
  const newBalance = parseFloat(req.body.balance);
  
  // Validate balance
  if (isNaN(newBalance) || newBalance < 0) {
    return res.redirect('/admin/dashboard?success=false');
  }
  
  // Find and update user
  const userIndex = users.findIndex(user => user.id === userId);
  
  if (userIndex !== -1) {
    users[userIndex].balance = newBalance;
    saveUsers(users);
    return res.redirect('/admin/dashboard?success=true');
  }
  
  res.redirect('/admin/dashboard?success=false');
});

// Toggle user trading status
router.post('/user/:id/toggle-trading', checkAdmin, (req, res) => {
  const users = getUsers();
  const userId = req.params.id;
  const action = req.body.action;
  
  const userIndex = users.findIndex(user => user.id === userId);
  
  if (userIndex !== -1) {
    users[userIndex].canTrade = action === 'approve';
    saveUsers(users);
    return res.redirect('/admin/dashboard?success=true');
  }
  
  res.redirect('/admin/dashboard?success=false');
});

// Handle withdrawal approval/rejection
router.post('/withdrawal/:id/:action', checkAdmin, (req, res) => {
  const withdrawals = getWithdrawals();
  const withdrawalId = req.params.id;
  const action = req.params.action;
  
  const withdrawalIndex = withdrawals.findIndex(w => w.id === withdrawalId);
  
  if (withdrawalIndex !== -1) {
    withdrawals[withdrawalIndex].status = action === 'approve' ? 'approved' : 'rejected';
    
    // If approved, deduct from user's balance
    if (action === 'approve') {
      const users = getUsers();
      const userIndex = users.findIndex(u => u.id === withdrawals[withdrawalIndex].userId);
      if (userIndex !== -1) {
        users[userIndex].balance -= withdrawals[withdrawalIndex].amount;
        saveUsers(users);
      }
    }
    
    saveWithdrawals(withdrawals);
    return res.redirect('/admin/dashboard?view=withdrawals&success=true');
  }
  
  res.redirect('/admin/dashboard?view=withdrawals&success=false');
});

// Handle deposit approval/rejection
router.post('/deposit/:id/:action', checkAdmin, (req, res) => {
  const deposits = getDeposits();
  const depositId = req.params.id;
  const action = req.params.action;
  
  const depositIndex = deposits.findIndex(d => d.id === depositId);
  
  if (depositIndex !== -1) {
    deposits[depositIndex].status = action === 'approve' ? 'approved' : 'rejected';
    
    // If approved, update user balance
    if (action === 'approve') {
      const users = getUsers();
      const userIndex = users.findIndex(u => u.id === deposits[depositIndex].userId);
      if (userIndex !== -1) {
        users[userIndex].balance += deposits[depositIndex].amount;
        saveUsers(users);
      }
    }
    
    saveDeposits(deposits);
    return res.redirect('/admin/dashboard?view=deposits&success=true');
  }
  
  res.redirect('/admin/dashboard?view=deposits&success=false');
});

module.exports = router;