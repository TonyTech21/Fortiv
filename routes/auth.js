// Authentication routes for Trading Platform
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { checkAuthenticated, checkNotAuthenticated } = require('../middleware/auth');

// Helper function to read/write JSON files
const usersPath = path.join(__dirname, '../data/users.json');

const getUsers = () => {
  const data = fs.readFileSync(usersPath, 'utf8');
  return JSON.parse(data);
};

const saveUsers = (users) => {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
};

// Sign up GET route
router.get('/signup', checkNotAuthenticated, (req, res) => {
  res.render('auth/signup', { error: null });
});

// Sign up POST route
router.post('/signup', checkNotAuthenticated, async (req, res) => {
  try {
    const { fullName, email, password, country } = req.body;
    
    // Basic validation
    if (!fullName || !email || !password || !country) {
      return res.render('auth/signup', { 
        error: 'All fields are required',
        formData: req.body
      });
    }
    
    // Password validation (min 8 chars, must include uppercase)
    if (password.length < 8 || !/[A-Z]/.test(password)) {
      return res.render('auth/signup', { 
        error: 'Password must be at least 8 characters and include an uppercase letter',
        formData: req.body
      });
    }
    
    // Check if user already exists
    const users = getUsers();
    const existingUser = users.find(user => user.email === email);
    
    if (existingUser) {
      return res.render('auth/signup', { 
        error: 'Email already registered',
        formData: req.body
      });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user with default $500 balance and trading disabled
    const newUser = {
      id: uuidv4(),
      fullName,
      email,
      password: hashedPassword,
      country,
      balance: 0.00,
      canTrade: false,
      createdAt: new Date().toISOString()
    };
    
    // Save the user
    users.push(newUser);
    saveUsers(users);
    
    // Redirect to login
    req.session.flashMessage = 'Account created successfully! Please log in.';
    res.redirect('/login');
  } catch (error) {
    console.error('Signup error:', error);
    res.render('auth/signup', { 
      error: 'An error occurred. Please try again.',
      formData: req.body
    });
  }
});

// Login GET route
router.get('/login', checkNotAuthenticated, (req, res) => {
  const flashMessage = req.session.flashMessage;
  req.session.flashMessage = null;
  
  res.render('auth/login', { 
    error: null, 
    message: flashMessage
  });
});

// Login POST route
router.post('/login', checkNotAuthenticated, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Basic validation
    if (!email || !password) {
      return res.render('auth/login', { 
        error: 'Email and password are required',
        formData: { email }
      });
    }
    
    // Find user
    const users = getUsers();
    const user = users.find(user => user.email === email);
    
    if (!user) {
      return res.render('auth/login', { 
        error: 'Invalid email or password',
        formData: { email }
      });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.render('auth/login', { 
        error: 'Invalid email or password',
        formData: { email }
      });
    }
    
    // Set user session
    req.session.userId = user.id;
    
    // Redirect to dashboard
    res.redirect('/user/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    res.render('auth/login', { 
      error: 'An error occurred. Please try again.',
      formData: { email: req.body.email }
    });
  }
});

// Admin login GET route
router.get('/admin/login', (req, res) => {
  res.render('admin/login', { error: null });
});

// Admin login POST route
router.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  
  // Hardcoded admin credentials
  if (email === 'admin@example.com' && password === 'Admin123') {
    req.session.isAdmin = true;
    return res.redirect('/admin/dashboard');
  }
  
  res.render('admin/login', { 
    error: 'Invalid admin credentials',
    formData: { email }
  });
});

// Logout route
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
});

module.exports = router;