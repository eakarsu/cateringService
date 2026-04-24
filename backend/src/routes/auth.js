const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRegistration, validateLogin, validatePasswordChange, validatePasswordReset, validatePasswordResetConfirm, validateProfileUpdate } = require('../middleware/validate');
const router = express.Router();

// Register
router.post('/register', validateRegistration, async (req, res, next) => {
  try {
    const { email, password, name, role, phone } = req.body;

    const existingUser = await req.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');
    const user = await req.prisma.user.create({
      data: { email, password: hashedPassword, name, role: role || 'CLIENT', phone, emailVerifyToken }
    });

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: user.emailVerified },
      token,
      message: 'Registration successful. Please verify your email.'
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await req.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone, emailVerified: user.emailVerified },
      token
    });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  // With JWT, logout is handled client-side by removing the token
  // This endpoint exists for audit/tracking purposes
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, name: true, role: true, phone: true, emailVerified: true, createdAt: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Update profile
router.put('/profile', authenticate, validateProfileUpdate, async (req, res, next) => {
  try {
    const { name, phone, email } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email) {
      const existing = await req.prisma.user.findFirst({ where: { email, NOT: { id: req.user.userId } } });
      if (existing) return res.status(400).json({ error: 'Email already in use' });
      updateData.email = email;
    }

    const user = await req.prisma.user.update({
      where: { id: req.user.userId },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, phone: true, emailVerified: true }
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Change password
router.post('/change-password', authenticate, validatePasswordChange, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await req.prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await req.prisma.user.update({
      where: { id: req.user.userId },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

// Request password reset
router.post('/reset-password', validatePasswordReset, async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await req.prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If an account with that email exists, a reset link has been sent' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await req.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry }
    });

    // In production, send email with reset link. For now, return token for development.
    res.json({
      message: 'If an account with that email exists, a reset link has been sent',
      // DEV ONLY - remove in production
      resetToken
    });
  } catch (error) {
    next(error);
  }
});

// Confirm password reset
router.post('/reset-password/confirm', validatePasswordResetConfirm, async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    const user = await req.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await req.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, resetToken: null, resetTokenExpiry: null }
    });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
});

// Verify email
router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body;

    const user = await req.prisma.user.findFirst({ where: { emailVerifyToken: token } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    await req.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifyToken: null }
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
});

// Resend verification email
router.post('/resend-verification', authenticate, async (req, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.emailVerified) return res.json({ message: 'Email already verified' });

    const emailVerifyToken = crypto.randomBytes(32).toString('hex');
    await req.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken }
    });

    // In production, send the verification email
    res.json({ message: 'Verification email sent', emailVerifyToken });
  } catch (error) {
    next(error);
  }
});

// Check password strength
router.post('/check-password-strength', (req, res) => {
  const { password } = req.body;
  if (!password) return res.json({ strength: 0, label: 'None', feedback: [] });

  let score = 0;
  const feedback = [];

  if (password.length >= 8) score++; else feedback.push('At least 8 characters');
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++; else feedback.push('Add uppercase letter');
  if (/[a-z]/.test(password)) score++; else feedback.push('Add lowercase letter');
  if (/[0-9]/.test(password)) score++; else feedback.push('Add a number');
  if (/[^A-Za-z0-9]/.test(password)) score++; else feedback.push('Add a special character');

  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const label = labels[Math.min(score, labels.length - 1)];

  res.json({ strength: score, maxStrength: 6, label, feedback });
});

// Get all users (for dropdowns) - Admin/Manager only
router.get('/users', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const users = await req.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true }
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

// Get clients only
router.get('/clients', authenticate, async (req, res, next) => {
  try {
    const clients = await req.prisma.user.findMany({
      where: { role: 'CLIENT' },
      select: { id: true, name: true, email: true, phone: true }
    });
    res.json(clients);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
