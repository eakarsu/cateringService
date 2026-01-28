require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Make prisma available to routes
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Import routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const venueRoutes = require('./routes/venues');
const menuRoutes = require('./routes/menus');
const proposalRoutes = require('./routes/proposals');
const orderRoutes = require('./routes/orders');
const kitchenRoutes = require('./routes/kitchen');
const logisticsRoutes = require('./routes/logistics');
const staffRoutes = require('./routes/staff');
const billingRoutes = require('./routes/billing');
const aiRoutes = require('./routes/ai');
const dashboardRoutes = require('./routes/dashboard');
const guestRoutes = require('./routes/guests');
const supplierRoutes = require('./routes/suppliers');
const photoRoutes = require('./routes/photos');
const clientPortalRoutes = require('./routes/client-portal');
const costingRoutes = require('./routes/costing');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/client', clientPortalRoutes);
app.use('/api/costing', costingRoutes);

// Serve uploaded photos
const path = require('path');
app.use('/uploads', require('express').static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
