const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { checkAuthenticated, checkNotAuthenticated } = require('../middleware/auth');

// Signup GET
router.get('/signup', checkNotAuthenticated, (req, res) => {
  res.render('auth/signup', { error: null });
});

// Signup POST
router.post('/signup', checkNotAuthenticated, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const users = db.collection('users');

    const { fullName, email, password, country } = req.body;

    // Validate
    if (!fullName || !email || !password || !country) {
      return res.render('auth/signup', {
        error: 'All fields are required',
        formData: req.body
      });
    }

    if (password.length < 8 || !/[A-Z]/.test(password)) {
      return res.render('auth/signup', {
        error: 'Password must be at least 8 characters and include an uppercase letter',
        formData: req.body
      });
    }

    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return res.render('auth/signup', {
        error: 'Email already registered',
        formData: req.body
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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

    await users.insertOne(newUser);

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

// Login GET
router.get('/login', checkNotAuthenticated, (req, res) => {
  const flashMessage = req.session.flashMessage;
  req.session.flashMessage = null;

  res.render('auth/login', {
    error: null,
    message: flashMessage
  });
});

// Login POST
router.post('/login', checkNotAuthenticated, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const users = db.collection('users');

    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('auth/login', {
        error: 'Email and password are required',
        formData: { email }
      });
    }

    const user = await users.findOne({ email });

    if (!user) {
      return res.render('auth/login', {
        error: 'Invalid email or password',
        formData: { email }
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.render('auth/login', {
        error: 'Invalid email or password',
        formData: { email }
      });
    }

    req.session.userId = user.id; // Save ID for later session use

    res.redirect('/user/dashboard');

  } catch (error) {
    console.error('Login error:', error);
    res.render('auth/login', {
      error: 'An error occurred. Please try again.',
      formData: { email: req.body.email }
    });
  }
});

// Admin Login GET
router.get('/admin/login', (req, res) => {
  res.render('admin/login', { error: null });
});

// Admin Login POST
router.post('/admin/login', (req, res) => {
  const { email, password } = req.body;

  if (email === 'admin@example.com' && password === 'Admin123') {
    req.session.isAdmin = true;
    return res.redirect('/admin/dashboard');
  }

  res.render('admin/login', {
    error: 'Invalid admin credentials',
    formData: { email }
  });
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
});

module.exports = router;
