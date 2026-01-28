const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with comprehensive data...');

  // Clean up existing data (in reverse order of dependencies)
  console.log('Cleaning up existing data...');
  await prisma.costEstimate.deleteMany({});
  await prisma.timeEntry.deleteMany({});
  await prisma.prepListItem.deleteMany({});
  await prisma.prepList.deleteMany({});
  await prisma.packListItem.deleteMany({});
  await prisma.packList.deleteMany({});
  await prisma.staffAssignment.deleteMany({});
  await prisma.delivery.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.invoiceLineItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.proposalLineItem.deleteMany({});
  await prisma.proposalMenu.deleteMany({});
  await prisma.proposal.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.eventPhoto.deleteMany({});
  await prisma.guest.deleteMany({});
  await prisma.eventTimeline.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.recipeIngredient.deleteMany({});
  await prisma.recipe.deleteMany({});
  await prisma.menuPackageItem.deleteMany({});
  await prisma.menuPackage.deleteMany({});
  await prisma.menuItem.deleteMany({});
  await prisma.inventoryLog.deleteMany({});
  await prisma.ingredient.deleteMany({});
  await prisma.equipmentBooking.deleteMany({});
  await prisma.equipment.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.venue.deleteMany({});
  await prisma.staff.deleteMany({});
  await prisma.aIChat.deleteMany({});
  await prisma.calendarSync.deleteMany({});
  await prisma.paymentIntegration.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('Cleanup complete.');

  // ==================== USERS (15+) ====================
  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = await Promise.all([
    prisma.user.upsert({ where: { email: 'admin@cateringpro.com' }, update: {}, create: { email: 'admin@cateringpro.com', password: hashedPassword, name: 'Admin User', role: 'ADMIN', phone: '555-0100' }}),
    prisma.user.upsert({ where: { email: 'sarah@cateringpro.com' }, update: {}, create: { email: 'sarah@cateringpro.com', password: hashedPassword, name: 'Sarah Johnson', role: 'MANAGER', phone: '555-0101' }}),
    prisma.user.upsert({ where: { email: 'mike@cateringpro.com' }, update: {}, create: { email: 'mike@cateringpro.com', password: hashedPassword, name: 'Mike Thompson', role: 'MANAGER', phone: '555-0102' }}),
    prisma.user.upsert({ where: { email: 'john@smithwedding.com' }, update: {}, create: { email: 'john@smithwedding.com', password: hashedPassword, name: 'John Smith', role: 'CLIENT', phone: '555-0200' }}),
    prisma.user.upsert({ where: { email: 'jane@techcorp.com' }, update: {}, create: { email: 'jane@techcorp.com', password: hashedPassword, name: 'Jane Williams', role: 'CLIENT', phone: '555-0201' }}),
    prisma.user.upsert({ where: { email: 'robert@events.com' }, update: {}, create: { email: 'robert@events.com', password: hashedPassword, name: 'Robert Brown', role: 'CLIENT', phone: '555-0202' }}),
    prisma.user.upsert({ where: { email: 'emily@nonprofit.org' }, update: {}, create: { email: 'emily@nonprofit.org', password: hashedPassword, name: 'Emily Davis', role: 'CLIENT', phone: '555-0203' }}),
    prisma.user.upsert({ where: { email: 'michael@birthday.com' }, update: {}, create: { email: 'michael@birthday.com', password: hashedPassword, name: 'Michael Wilson', role: 'CLIENT', phone: '555-0204' }}),
    prisma.user.upsert({ where: { email: 'lisa@corporate.com' }, update: {}, create: { email: 'lisa@corporate.com', password: hashedPassword, name: 'Lisa Anderson', role: 'CLIENT', phone: '555-0205' }}),
    prisma.user.upsert({ where: { email: 'david@graduation.edu' }, update: {}, create: { email: 'david@graduation.edu', password: hashedPassword, name: 'David Taylor', role: 'CLIENT', phone: '555-0206' }}),
    prisma.user.upsert({ where: { email: 'susan@anniversary.com' }, update: {}, create: { email: 'susan@anniversary.com', password: hashedPassword, name: 'Susan Martinez', role: 'CLIENT', phone: '555-0207' }}),
    prisma.user.upsert({ where: { email: 'james@holiday.com' }, update: {}, create: { email: 'james@holiday.com', password: hashedPassword, name: 'James Garcia', role: 'CLIENT', phone: '555-0208' }}),
    prisma.user.upsert({ where: { email: 'chef.alex@cateringpro.com' }, update: {}, create: { email: 'chef.alex@cateringpro.com', password: hashedPassword, name: 'Alex Chen', role: 'STAFF', phone: '555-0300' }}),
    prisma.user.upsert({ where: { email: 'chef.maria@cateringpro.com' }, update: {}, create: { email: 'chef.maria@cateringpro.com', password: hashedPassword, name: 'Maria Rodriguez', role: 'STAFF', phone: '555-0301' }}),
    prisma.user.upsert({ where: { email: 'server.tom@cateringpro.com' }, update: {}, create: { email: 'server.tom@cateringpro.com', password: hashedPassword, name: 'Tom Baker', role: 'STAFF', phone: '555-0302' }}),
    prisma.user.upsert({ where: { email: 'server.kim@cateringpro.com' }, update: {}, create: { email: 'server.kim@cateringpro.com', password: hashedPassword, name: 'Kim Lee', role: 'STAFF', phone: '555-0303' }}),
    prisma.user.upsert({ where: { email: 'server.chris@cateringpro.com' }, update: {}, create: { email: 'server.chris@cateringpro.com', password: hashedPassword, name: 'Chris Johnson', role: 'STAFF', phone: '555-0304' }}),
    prisma.user.upsert({ where: { email: 'bartender.nick@cateringpro.com' }, update: {}, create: { email: 'bartender.nick@cateringpro.com', password: hashedPassword, name: 'Nick Adams', role: 'STAFF', phone: '555-0305' }}),
    prisma.user.upsert({ where: { email: 'driver.pete@cateringpro.com' }, update: {}, create: { email: 'driver.pete@cateringpro.com', password: hashedPassword, name: 'Pete Wilson', role: 'STAFF', phone: '555-0306' }}),
    prisma.user.upsert({ where: { email: 'setup.amy@cateringpro.com' }, update: {}, create: { email: 'setup.amy@cateringpro.com', password: hashedPassword, name: 'Amy Collins', role: 'STAFF', phone: '555-0307' }})
  ]);

  console.log(`Created ${users.length} users`);

  // Get staff users for creating staff profiles
  const staffUsers = users.filter(u => u.role === 'STAFF');
  const clientUsers = users.filter(u => u.role === 'CLIENT');

  // ==================== STAFF PROFILES (15+) ====================
  const staffProfiles = await Promise.all([
    prisma.staff.upsert({ where: { userId: staffUsers[0].id }, update: {}, create: { userId: staffUsers[0].id, position: 'CHEF', hourlyRate: 45, skills: 'French cuisine, Pastry, Sauces', uniformSize: 'L', availability: 'Full-time' }}),
    prisma.staff.upsert({ where: { userId: staffUsers[1].id }, update: {}, create: { userId: staffUsers[1].id, position: 'SOUS_CHEF', hourlyRate: 35, skills: 'Italian cuisine, Grilling, Plating', uniformSize: 'M', availability: 'Full-time' }}),
    prisma.staff.upsert({ where: { userId: staffUsers[2].id }, update: {}, create: { userId: staffUsers[2].id, position: 'SERVER', hourlyRate: 25, skills: 'Fine dining, Wine service, Table settings', uniformSize: 'M', availability: 'Weekends, Evenings' }}),
    prisma.staff.upsert({ where: { userId: staffUsers[3].id }, update: {}, create: { userId: staffUsers[3].id, position: 'SERVER', hourlyRate: 25, skills: 'Cocktail service, Event coordination', uniformSize: 'S', availability: 'Flexible' }}),
    prisma.staff.upsert({ where: { userId: staffUsers[4].id }, update: {}, create: { userId: staffUsers[4].id, position: 'SERVER', hourlyRate: 22, skills: 'Buffet service, Guest management', uniformSize: 'L', availability: 'Weekends' }}),
    prisma.staff.upsert({ where: { userId: staffUsers[5].id }, update: {}, create: { userId: staffUsers[5].id, position: 'BARTENDER', hourlyRate: 30, skills: 'Mixology, Wine pairing, Craft cocktails', uniformSize: 'M', availability: 'Evenings, Weekends' }}),
    prisma.staff.upsert({ where: { userId: staffUsers[6].id }, update: {}, create: { userId: staffUsers[6].id, position: 'DRIVER', hourlyRate: 20, skills: 'CDL license, Route planning, Equipment handling', uniformSize: 'XL', availability: 'Full-time' }}),
    prisma.staff.upsert({ where: { userId: staffUsers[7].id }, update: {}, create: { userId: staffUsers[7].id, position: 'SETUP_CREW', hourlyRate: 18, skills: 'Table setup, Decor arrangement, Heavy lifting', uniformSize: 'M', availability: 'Flexible' }})
  ]);

  // Add more staff via upsert
  const additionalStaff = await Promise.all([
    prisma.user.upsert({ where: { email: 'prep.jose@cateringpro.com' }, update: {}, create: { email: 'prep.jose@cateringpro.com', password: hashedPassword, name: 'Jose Hernandez', role: 'STAFF', phone: '555-0308' }}),
    prisma.user.upsert({ where: { email: 'server.rachel@cateringpro.com' }, update: {}, create: { email: 'server.rachel@cateringpro.com', password: hashedPassword, name: 'Rachel Green', role: 'STAFF', phone: '555-0309' }}),
    prisma.user.upsert({ where: { email: 'server.monica@cateringpro.com' }, update: {}, create: { email: 'server.monica@cateringpro.com', password: hashedPassword, name: 'Monica Geller', role: 'STAFF', phone: '555-0310' }}),
    prisma.user.upsert({ where: { email: 'bartender.joey@cateringpro.com' }, update: {}, create: { email: 'bartender.joey@cateringpro.com', password: hashedPassword, name: 'Joey Tribbiani', role: 'STAFF', phone: '555-0311' }}),
    prisma.user.upsert({ where: { email: 'setup.ross@cateringpro.com' }, update: {}, create: { email: 'setup.ross@cateringpro.com', password: hashedPassword, name: 'Ross Geller', role: 'STAFF', phone: '555-0312' }}),
    prisma.user.upsert({ where: { email: 'driver.chandler@cateringpro.com' }, update: {}, create: { email: 'driver.chandler@cateringpro.com', password: hashedPassword, name: 'Chandler Bing', role: 'STAFF', phone: '555-0313' }}),
    prisma.user.upsert({ where: { email: 'linecook.phoebe@cateringpro.com' }, update: {}, create: { email: 'linecook.phoebe@cateringpro.com', password: hashedPassword, name: 'Phoebe Buffay', role: 'STAFF', phone: '555-0314' }})
  ]);

  await Promise.all([
    prisma.staff.upsert({ where: { userId: additionalStaff[0].id }, update: {}, create: { userId: additionalStaff[0].id, position: 'PREP_COOK', hourlyRate: 18, skills: 'Prep work, Knife skills', uniformSize: 'L' }}),
    prisma.staff.upsert({ where: { userId: additionalStaff[1].id }, update: {}, create: { userId: additionalStaff[1].id, position: 'SERVER', hourlyRate: 24, skills: 'Catering experience', uniformSize: 'S' }}),
    prisma.staff.upsert({ where: { userId: additionalStaff[2].id }, update: {}, create: { userId: additionalStaff[2].id, position: 'EVENT_CAPTAIN', hourlyRate: 32, skills: 'Team management, Client relations', uniformSize: 'M' }}),
    prisma.staff.upsert({ where: { userId: additionalStaff[3].id }, update: {}, create: { userId: additionalStaff[3].id, position: 'BARTENDER', hourlyRate: 28, skills: 'Speed bartending, Craft cocktails', uniformSize: 'L' }}),
    prisma.staff.upsert({ where: { userId: additionalStaff[4].id }, update: {}, create: { userId: additionalStaff[4].id, position: 'SETUP_CREW', hourlyRate: 17, skills: 'Equipment setup, Breakdown', uniformSize: 'XL' }}),
    prisma.staff.upsert({ where: { userId: additionalStaff[5].id }, update: {}, create: { userId: additionalStaff[5].id, position: 'DRIVER', hourlyRate: 21, skills: 'Delivery, Navigation', uniformSize: 'M' }}),
    prisma.staff.upsert({ where: { userId: additionalStaff[6].id }, update: {}, create: { userId: additionalStaff[6].id, position: 'LINE_COOK', hourlyRate: 22, skills: 'Grill, Saute, Prep', uniformSize: 'M' }})
  ]);

  console.log('Created 15+ staff profiles');

  // ==================== VENUES (15+) ====================
  const venues = await Promise.all([
    prisma.venue.create({ data: { name: 'Grand Ballroom at The Plaza', address: '768 5th Avenue', city: 'New York', state: 'NY', zipCode: '10019', capacity: 500, contactName: 'Patricia Wells', contactPhone: '555-1000', contactEmail: 'events@theplaza.com', hasKitchen: true, parkingInfo: 'Valet parking, $50 per vehicle' }}),
    prisma.venue.create({ data: { name: 'Riverside Gardens', address: '456 River Road', city: 'Brooklyn', state: 'NY', zipCode: '11201', capacity: 200, contactName: 'Emily Davis', contactPhone: '555-1001', contactEmail: 'info@riversidegardens.com', hasKitchen: false, parkingInfo: 'Free parking lot' }}),
    prisma.venue.create({ data: { name: 'The Loft at City Hall', address: '123 Main Street', city: 'Manhattan', state: 'NY', zipCode: '10002', capacity: 150, contactName: 'Robert Chen', contactPhone: '555-1002', contactEmail: 'loft@cityhall.com', hasKitchen: true, parkingInfo: 'Street parking, nearby garage' }}),
    prisma.venue.create({ data: { name: 'Skyline Rooftop', address: '789 Tower Avenue', city: 'Manhattan', state: 'NY', zipCode: '10016', capacity: 100, contactName: 'Jessica Kim', contactPhone: '555-1003', contactEmail: 'events@skylinerooftop.com', hasKitchen: false, parkingInfo: 'Building garage, $30/event' }}),
    prisma.venue.create({ data: { name: 'Historic Manor House', address: '321 Heritage Lane', city: 'Queens', state: 'NY', zipCode: '11375', capacity: 250, contactName: 'William Foster', contactPhone: '555-1004', contactEmail: 'manor@historichouse.com', hasKitchen: true, parkingInfo: 'Large parking lot included' }}),
    prisma.venue.create({ data: { name: 'The Garden Pavilion', address: '555 Botanical Way', city: 'Bronx', state: 'NY', zipCode: '10458', capacity: 175, contactName: 'Anna Martinez', contactPhone: '555-1005', contactEmail: 'pavilion@botanicalgarden.com', hasKitchen: false, parkingInfo: 'Garden parking area' }}),
    prisma.venue.create({ data: { name: 'Industrial Chic Warehouse', address: '88 Factory Street', city: 'Brooklyn', state: 'NY', zipCode: '11222', capacity: 400, contactName: 'Jake Morrison', contactPhone: '555-1006', contactEmail: 'events@chicwarehouse.com', hasKitchen: true, parkingInfo: 'Loading dock, street parking' }}),
    prisma.venue.create({ data: { name: 'Seaside Beach Club', address: '100 Ocean Boulevard', city: 'Long Beach', state: 'NY', zipCode: '11561', capacity: 300, contactName: 'Samantha Shore', contactPhone: '555-1007', contactEmail: 'club@seasidebeach.com', hasKitchen: true, parkingInfo: 'Beach parking lot' }}),
    prisma.venue.create({ data: { name: 'Art Deco Ballroom', address: '42 Gatsby Lane', city: 'Manhattan', state: 'NY', zipCode: '10022', capacity: 225, contactName: 'Theodore Reed', contactPhone: '555-1008', contactEmail: 'events@artdeco.com', hasKitchen: true, parkingInfo: 'Valet service available' }}),
    prisma.venue.create({ data: { name: 'Vineyard Estate', address: '1 Wine Valley Road', city: 'Long Island', state: 'NY', zipCode: '11946', capacity: 180, contactName: 'Victoria Vine', contactPhone: '555-1009', contactEmail: 'events@vineyardestate.com', hasKitchen: true, parkingInfo: 'Estate grounds parking' }}),
    prisma.venue.create({ data: { name: 'Modern Art Museum', address: '53 Art Street', city: 'Manhattan', state: 'NY', zipCode: '10019', capacity: 350, contactName: 'Claire Gallery', contactPhone: '555-1010', contactEmail: 'events@modernartmuseum.com', hasKitchen: false, parkingInfo: 'Underground garage' }}),
    prisma.venue.create({ data: { name: 'The Country Club', address: '200 Golf Course Drive', city: 'Westchester', state: 'NY', zipCode: '10577', capacity: 275, contactName: 'Charles Fairway', contactPhone: '555-1011', contactEmail: 'events@countryclub.com', hasKitchen: true, parkingInfo: 'Club parking lot' }}),
    prisma.venue.create({ data: { name: 'City View Terrace', address: '500 Skyview Drive', city: 'Jersey City', state: 'NJ', zipCode: '07302', capacity: 125, contactName: 'Diana View', contactPhone: '555-1012', contactEmail: 'terrace@cityview.com', hasKitchen: false, parkingInfo: 'Building parking' }}),
    prisma.venue.create({ data: { name: 'The Boathouse', address: '72 Lake Shore Road', city: 'Central Park', state: 'NY', zipCode: '10024', capacity: 160, contactName: 'Oliver Lake', contactPhone: '555-1013', contactEmail: 'events@boathouse.com', hasKitchen: true, parkingInfo: 'Limited, suggest taxi/uber' }}),
    prisma.venue.create({ data: { name: 'Corporate Tower 50', address: '50 Business Plaza', city: 'Manhattan', state: 'NY', zipCode: '10004', capacity: 100, contactName: 'Corporate Events', contactPhone: '555-1014', contactEmail: 'events@tower50.com', hasKitchen: false, parkingInfo: 'Building garage' }}),
    prisma.venue.create({ data: { name: 'Brooklyn Brewery Hall', address: '79 N 11th Street', city: 'Brooklyn', state: 'NY', zipCode: '11249', capacity: 200, contactName: 'Brew Master', contactPhone: '555-1015', contactEmail: 'events@brooklynbrewery.com', hasKitchen: true, parkingInfo: 'Street parking' }})
  ]);

  console.log(`Created ${venues.length} venues`);

  // ==================== MENU ITEMS (30+) ====================
  const menuItems = await Promise.all([
    // Appetizers
    prisma.menuItem.create({ data: { name: 'Bruschetta Trio', description: 'Classic tomato, mushroom tapenade, and roasted pepper', price: 12, category: 'APPETIZER', isVegetarian: true }}),
    prisma.menuItem.create({ data: { name: 'Jumbo Shrimp Cocktail', description: 'Poached jumbo shrimp with house cocktail sauce', price: 18, category: 'APPETIZER', isGlutenFree: true }}),
    prisma.menuItem.create({ data: { name: 'Beef Carpaccio', description: 'Thinly sliced beef with arugula and parmesan', price: 16, category: 'APPETIZER', isGlutenFree: true }}),
    prisma.menuItem.create({ data: { name: 'Caprese Skewers', description: 'Fresh mozzarella, cherry tomatoes, basil', price: 10, category: 'APPETIZER', isVegetarian: true, isGlutenFree: true }}),
    prisma.menuItem.create({ data: { name: 'Bacon-Wrapped Scallops', description: 'Pan-seared scallops wrapped in applewood bacon', price: 20, category: 'APPETIZER', isGlutenFree: true }}),
    prisma.menuItem.create({ data: { name: 'Spring Rolls', description: 'Vegetable spring rolls with sweet chili sauce', price: 11, category: 'APPETIZER', isVegan: true }}),
    prisma.menuItem.create({ data: { name: 'Stuffed Mushrooms', description: 'Cremini mushrooms with herb cream cheese', price: 13, category: 'APPETIZER', isVegetarian: true }}),
    // Salads
    prisma.menuItem.create({ data: { name: 'Classic Caesar Salad', description: 'Romaine, parmesan, croutons, house caesar', price: 10, category: 'SALAD' }}),
    prisma.menuItem.create({ data: { name: 'Mixed Greens Salad', description: 'Seasonal greens with balsamic vinaigrette', price: 8, category: 'SALAD', isVegan: true, isGlutenFree: true }}),
    prisma.menuItem.create({ data: { name: 'Wedge Salad', description: 'Iceberg wedge with blue cheese and bacon', price: 11, category: 'SALAD', isGlutenFree: true }}),
    prisma.menuItem.create({ data: { name: 'Greek Salad', description: 'Cucumber, tomato, olives, feta cheese', price: 12, category: 'SALAD', isVegetarian: true, isGlutenFree: true }}),
    prisma.menuItem.create({ data: { name: 'Arugula Salad', description: 'Arugula with shaved parmesan and lemon dressing', price: 9, category: 'SALAD', isVegetarian: true, isGlutenFree: true }}),
    // Soups
    prisma.menuItem.create({ data: { name: 'Butternut Squash Soup', description: 'Creamy roasted butternut squash', price: 8, category: 'SOUP', isVegetarian: true, isGlutenFree: true }}),
    prisma.menuItem.create({ data: { name: 'French Onion Soup', description: 'Caramelized onions with gruyere crouton', price: 10, category: 'SOUP', isVegetarian: true }}),
    prisma.menuItem.create({ data: { name: 'Lobster Bisque', description: 'Rich and creamy Maine lobster bisque', price: 14, category: 'SOUP', isGlutenFree: true }}),
    // Main Courses
    prisma.menuItem.create({ data: { name: 'Filet Mignon', description: '8oz center cut with red wine reduction', price: 48, category: 'MAIN', isGlutenFree: true }}),
    prisma.menuItem.create({ data: { name: 'Prime Rib', description: '12oz slow roasted prime rib with au jus', price: 52, category: 'MAIN', isGlutenFree: true }}),
    prisma.menuItem.create({ data: { name: 'Grilled Salmon', description: 'Atlantic salmon with lemon dill sauce', price: 38, category: 'MAIN', isGlutenFree: true }}),
    prisma.menuItem.create({ data: { name: 'Chilean Sea Bass', description: 'Miso-glazed sea bass with bok choy', price: 55, category: 'MAIN', isGlutenFree: true }}),
    prisma.menuItem.create({ data: { name: 'Chicken Marsala', description: 'Pan-seared chicken with mushroom marsala', price: 32, category: 'MAIN' }}),
    prisma.menuItem.create({ data: { name: 'Herb Roasted Chicken', description: 'Airline chicken breast with herbs de Provence', price: 28, category: 'MAIN', isGlutenFree: true }}),
    prisma.menuItem.create({ data: { name: 'Lamb Chops', description: 'Grilled lamb chops with mint chimichurri', price: 46, category: 'MAIN', isGlutenFree: true }}),
    prisma.menuItem.create({ data: { name: 'Vegetable Risotto', description: 'Arborio rice with seasonal vegetables', price: 28, category: 'MAIN', isVegetarian: true, isGlutenFree: true }}),
    prisma.menuItem.create({ data: { name: 'Mushroom Wellington', description: 'Portobello mushroom in puff pastry', price: 30, category: 'MAIN', isVegetarian: true }}),
    prisma.menuItem.create({ data: { name: 'Pasta Primavera', description: 'Penne with seasonal vegetables in white wine sauce', price: 24, category: 'MAIN', isVegetarian: true }}),
    // Sides
    prisma.menuItem.create({ data: { name: 'Roasted Fingerling Potatoes', description: 'Herb-roasted fingerling potatoes', price: 6, category: 'SIDE', isVegan: true, isGlutenFree: true }}),
    prisma.menuItem.create({ data: { name: 'Garlic Mashed Potatoes', description: 'Yukon gold mashed with roasted garlic', price: 7, category: 'SIDE', isVegetarian: true, isGlutenFree: true }}),
    prisma.menuItem.create({ data: { name: 'Grilled Asparagus', description: 'Fresh asparagus with lemon butter', price: 8, category: 'SIDE', isVegetarian: true, isGlutenFree: true }}),
    prisma.menuItem.create({ data: { name: 'Seasonal Vegetables', description: 'Chef selection of market vegetables', price: 7, category: 'SIDE', isVegan: true, isGlutenFree: true }}),
    prisma.menuItem.create({ data: { name: 'Wild Rice Pilaf', description: 'Wild rice blend with herbs', price: 6, category: 'SIDE', isVegan: true, isGlutenFree: true }}),
    prisma.menuItem.create({ data: { name: 'Creamed Spinach', description: 'Fresh spinach in cream sauce', price: 7, category: 'SIDE', isVegetarian: true, isGlutenFree: true }}),
    // Desserts
    prisma.menuItem.create({ data: { name: 'Chocolate Mousse', description: 'Dark chocolate mousse with whipped cream', price: 10, category: 'DESSERT', isGlutenFree: true, isVegetarian: true }}),
    prisma.menuItem.create({ data: { name: 'Tiramisu', description: 'Classic Italian coffee dessert', price: 12, category: 'DESSERT', isVegetarian: true }}),
    prisma.menuItem.create({ data: { name: 'Cheesecake', description: 'New York style with berry compote', price: 11, category: 'DESSERT', isVegetarian: true }}),
    prisma.menuItem.create({ data: { name: 'Crème Brûlée', description: 'Vanilla bean custard with caramelized sugar', price: 10, category: 'DESSERT', isGlutenFree: true, isVegetarian: true }}),
    prisma.menuItem.create({ data: { name: 'Fruit Tart', description: 'Fresh seasonal fruits on pastry cream', price: 9, category: 'DESSERT', isVegetarian: true }}),
    prisma.menuItem.create({ data: { name: 'Sorbet Trio', description: 'Three seasonal fruit sorbets', price: 8, category: 'DESSERT', isVegan: true, isGlutenFree: true }})
  ]);

  console.log(`Created ${menuItems.length} menu items`);

  // ==================== MENU PACKAGES (15+) ====================
  const packages = await Promise.all([
    prisma.menuPackage.create({ data: { name: 'Premium Wedding Package', description: 'Our finest selection for your special day', pricePerPerson: 125, minGuests: 50, maxGuests: 500, category: 'PLATED' }}),
    prisma.menuPackage.create({ data: { name: 'Classic Wedding Buffet', description: 'Elegant buffet for wedding receptions', pricePerPerson: 95, minGuests: 75, maxGuests: 300, category: 'BUFFET' }}),
    prisma.menuPackage.create({ data: { name: 'Corporate Lunch', description: 'Professional lunch for business meetings', pricePerPerson: 45, minGuests: 10, maxGuests: 200, category: 'BUFFET' }}),
    prisma.menuPackage.create({ data: { name: 'Executive Dinner', description: 'Upscale dining for corporate events', pricePerPerson: 85, minGuests: 20, maxGuests: 150, category: 'PLATED' }}),
    prisma.menuPackage.create({ data: { name: 'Cocktail Reception', description: 'Passed appetizers and stations', pricePerPerson: 65, minGuests: 30, maxGuests: 250, category: 'COCKTAIL' }}),
    prisma.menuPackage.create({ data: { name: 'BBQ Feast', description: 'Outdoor barbecue with all the fixings', pricePerPerson: 55, minGuests: 40, maxGuests: 200, category: 'BBQ' }}),
    prisma.menuPackage.create({ data: { name: 'Brunch Celebration', description: 'Complete brunch spread', pricePerPerson: 48, minGuests: 25, maxGuests: 150, category: 'BREAKFAST' }}),
    prisma.menuPackage.create({ data: { name: 'Casual Lunch Buffet', description: 'Budget-friendly lunch option', pricePerPerson: 35, minGuests: 20, maxGuests: 100, category: 'BUFFET' }}),
    prisma.menuPackage.create({ data: { name: 'Holiday Feast', description: 'Seasonal holiday menu', pricePerPerson: 75, minGuests: 30, maxGuests: 200, category: 'PLATED' }}),
    prisma.menuPackage.create({ data: { name: 'Dessert Station', description: 'Elaborate dessert display', pricePerPerson: 25, minGuests: 50, maxGuests: 300, category: 'DESSERT' }}),
    prisma.menuPackage.create({ data: { name: 'Italian Family Style', description: 'Shared platters Italian style', pricePerPerson: 58, minGuests: 20, maxGuests: 120, category: 'DINNER' }}),
    prisma.menuPackage.create({ data: { name: 'Asian Fusion', description: 'Pan-Asian inspired menu', pricePerPerson: 62, minGuests: 25, maxGuests: 150, category: 'DINNER' }}),
    prisma.menuPackage.create({ data: { name: 'Farm to Table', description: 'Local, seasonal ingredients', pricePerPerson: 78, minGuests: 20, maxGuests: 100, category: 'PLATED' }}),
    prisma.menuPackage.create({ data: { name: 'Seafood Spectacular', description: 'Premium seafood selection', pricePerPerson: 95, minGuests: 30, maxGuests: 150, category: 'PLATED' }}),
    prisma.menuPackage.create({ data: { name: 'Vegetarian Gourmet', description: 'Upscale vegetarian cuisine', pricePerPerson: 55, minGuests: 20, maxGuests: 100, category: 'PLATED' }}),
    prisma.menuPackage.create({ data: { name: 'Kids Party Package', description: 'Kid-friendly menu', pricePerPerson: 22, minGuests: 15, maxGuests: 50, category: 'BUFFET' }})
  ]);

  console.log(`Created ${packages.length} menu packages`);

  // ==================== MENU PACKAGE ITEMS (link packages to menu items) ====================
  const menuPackageItems = [];

  // Each package gets 4-6 menu items from different categories
  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    const numItems = 4 + (i % 3); // 4, 5, or 6 items per package

    for (let j = 0; j < numItems; j++) {
      const menuItem = menuItems[(i * 3 + j) % menuItems.length];
      menuPackageItems.push({
        packageId: pkg.id,
        menuItemId: menuItem.id,
        quantity: 1,
        isRequired: j < 4 // First 4 items are required
      });
    }
  }

  await prisma.menuPackageItem.createMany({ data: menuPackageItems });
  console.log(`Created ${menuPackageItems.length} menu package items`);

  // ==================== EVENTS (15+) ====================
  const futureDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };

  const events = await Promise.all([
    prisma.event.create({ data: { name: 'Smith-Johnson Wedding', eventType: 'WEDDING', date: futureDate(30), startTime: new Date(futureDate(30).setHours(17, 0)), endTime: new Date(futureDate(30).setHours(23, 0)), guestCount: 150, status: 'CONFIRMED', clientId: clientUsers[0].id, venueId: venues[0].id, setupRequirements: 'Round tables, white linens, dance floor', equipmentNeeds: 'Chafing dishes, beverage station' }}),
    prisma.event.create({ data: { name: 'Tech Corp Annual Meeting', eventType: 'CORPORATE', date: futureDate(14), startTime: new Date(futureDate(14).setHours(11, 30)), endTime: new Date(futureDate(14).setHours(14, 0)), guestCount: 75, status: 'PROPOSAL_SENT', clientId: clientUsers[1].id, venueId: venues[1].id, notes: '5 vegetarian, 2 vegan, 3 gluten-free' }}),
    prisma.event.create({ data: { name: 'Brown 50th Birthday Gala', eventType: 'BIRTHDAY', date: futureDate(21), startTime: new Date(futureDate(21).setHours(19, 0)), endTime: new Date(futureDate(21).setHours(23, 0)), guestCount: 100, status: 'CONFIRMED', clientId: clientUsers[2].id, venueId: venues[3].id }}),
    prisma.event.create({ data: { name: 'Charity Fundraiser Dinner', eventType: 'FUNDRAISER', date: futureDate(45), startTime: new Date(futureDate(45).setHours(18, 0)), endTime: new Date(futureDate(45).setHours(22, 0)), guestCount: 200, status: 'INQUIRY', clientId: clientUsers[3].id, venueId: venues[4].id }}),
    prisma.event.create({ data: { name: 'Wilson Sweet 16', eventType: 'BIRTHDAY', date: futureDate(35), startTime: new Date(futureDate(35).setHours(15, 0)), endTime: new Date(futureDate(35).setHours(20, 0)), guestCount: 60, status: 'CONFIRMED', clientId: clientUsers[4].id, venueId: venues[5].id }}),
    prisma.event.create({ data: { name: 'Anderson Corp Retreat', eventType: 'CORPORATE', date: futureDate(60), startTime: new Date(futureDate(60).setHours(9, 0)), endTime: new Date(futureDate(60).setHours(17, 0)), guestCount: 50, status: 'PROPOSAL_SENT', clientId: clientUsers[5].id, venueId: venues[9].id }}),
    prisma.event.create({ data: { name: 'Taylor Graduation Party', eventType: 'GRADUATION', date: futureDate(25), startTime: new Date(futureDate(25).setHours(14, 0)), endTime: new Date(futureDate(25).setHours(18, 0)), guestCount: 80, status: 'CONFIRMED', clientId: clientUsers[6].id, venueId: venues[5].id }}),
    prisma.event.create({ data: { name: 'Martinez 25th Anniversary', eventType: 'ANNIVERSARY', date: futureDate(40), startTime: new Date(futureDate(40).setHours(18, 0)), endTime: new Date(futureDate(40).setHours(22, 0)), guestCount: 75, status: 'INQUIRY', clientId: clientUsers[7].id, venueId: venues[4].id }}),
    prisma.event.create({ data: { name: 'Garcia Holiday Party', eventType: 'HOLIDAY', date: futureDate(55), startTime: new Date(futureDate(55).setHours(19, 0)), endTime: new Date(futureDate(55).setHours(23, 0)), guestCount: 120, status: 'INQUIRY', clientId: clientUsers[8].id, venueId: venues[6].id }}),
    prisma.event.create({ data: { name: 'Williams Baby Shower', eventType: 'OTHER', date: futureDate(18), startTime: new Date(futureDate(18).setHours(13, 0)), endTime: new Date(futureDate(18).setHours(16, 0)), guestCount: 35, status: 'CONFIRMED', clientId: clientUsers[1].id, venueId: venues[1].id }}),
    prisma.event.create({ data: { name: 'Thompson Engagement Party', eventType: 'OTHER', date: futureDate(28), startTime: new Date(futureDate(28).setHours(17, 0)), endTime: new Date(futureDate(28).setHours(21, 0)), guestCount: 65, status: 'CONFIRMED', clientId: clientUsers[2].id, venueId: venues[2].id }}),
    prisma.event.create({ data: { name: 'Corporate Product Launch', eventType: 'CORPORATE', date: futureDate(22), startTime: new Date(futureDate(22).setHours(18, 0)), endTime: new Date(futureDate(22).setHours(22, 0)), guestCount: 150, status: 'PROPOSAL_SENT', clientId: clientUsers[5].id, venueId: venues[10].id }}),
    prisma.event.create({ data: { name: 'Summer Garden Wedding', eventType: 'WEDDING', date: futureDate(75), startTime: new Date(futureDate(75).setHours(16, 0)), endTime: new Date(futureDate(75).setHours(22, 0)), guestCount: 180, status: 'CONFIRMED', clientId: clientUsers[0].id, venueId: venues[5].id }}),
    prisma.event.create({ data: { name: 'Board Meeting Luncheon', eventType: 'CORPORATE', date: futureDate(10), startTime: new Date(futureDate(10).setHours(12, 0)), endTime: new Date(futureDate(10).setHours(14, 0)), guestCount: 25, status: 'CONFIRMED', clientId: clientUsers[1].id, venueId: venues[14].id }}),
    prisma.event.create({ data: { name: 'Charity Golf Outing', eventType: 'FUNDRAISER', date: futureDate(50), startTime: new Date(futureDate(50).setHours(11, 0)), endTime: new Date(futureDate(50).setHours(16, 0)), guestCount: 100, status: 'INQUIRY', clientId: clientUsers[3].id, venueId: venues[11].id }}),
    prisma.event.create({ data: { name: 'Art Gallery Opening', eventType: 'OTHER', date: futureDate(33), startTime: new Date(futureDate(33).setHours(18, 0)), endTime: new Date(futureDate(33).setHours(21, 0)), guestCount: 200, status: 'PROPOSAL_SENT', clientId: clientUsers[2].id, venueId: venues[10].id }})
  ]);

  console.log(`Created ${events.length} events`);

  // ==================== EVENT TIMELINES (20 items per ALL events) ====================
  const timelineActivities = [
    { time: '14:00', activity: 'Venue access begins', notes: 'Start unloading equipment' },
    { time: '14:30', activity: 'Kitchen setup', notes: 'Set up cooking stations' },
    { time: '15:00', activity: 'Table and chair setup', notes: 'Per floor plan' },
    { time: '15:30', activity: 'Linen placement', notes: 'White tablecloths and napkins' },
    { time: '16:00', activity: 'Centerpiece installation', notes: 'Florist arrives' },
    { time: '16:30', activity: 'Bar setup', notes: 'Ice, glasses, beverages' },
    { time: '17:00', activity: 'Sound check', notes: 'Test microphones and music' },
    { time: '17:15', activity: 'Staff briefing', notes: 'Review timeline and assignments' },
    { time: '17:30', activity: 'Final walkthrough', notes: 'Client approval' },
    { time: '18:00', activity: 'Guest arrival begins', notes: 'Cocktail hour starts' },
    { time: '18:30', activity: 'Appetizers served', notes: 'Passed hors doeuvres' },
    { time: '19:00', activity: 'Guests seated for dinner', notes: 'Announce seating' },
    { time: '19:15', activity: 'First course served', notes: 'Salads' },
    { time: '19:45', activity: 'Main course served', notes: 'Entrees plated' },
    { time: '20:30', activity: 'Dessert service', notes: 'Cake cutting if applicable' },
    { time: '21:00', activity: 'Coffee and tea service', notes: 'After-dinner drinks' },
    { time: '21:30', activity: 'Begin breakdown', notes: 'Start clearing back-of-house' },
    { time: '22:00', activity: 'Event concludes', notes: 'Guest departure' },
    { time: '22:30', activity: 'Full breakdown begins', notes: 'Pack all equipment' },
    { time: '23:00', activity: 'Final venue walkthrough', notes: 'Ensure venue is clean' }
  ];

  const timelineData = [];

  // Create timeline for ALL events
  for (const event of events) {
    const eventDate = new Date(event.date);
    for (let i = 0; i < timelineActivities.length; i++) {
      const activity = timelineActivities[i];
      const [hours, minutes] = activity.time.split(':').map(Number);
      const activityTime = new Date(eventDate);
      activityTime.setHours(hours, minutes, 0, 0);

      timelineData.push({
        eventId: event.id,
        time: activityTime,
        activity: activity.activity,
        notes: activity.notes,
        completed: i < 5 // First 5 items marked as completed
      });
    }
  }

  await prisma.eventTimeline.createMany({ data: timelineData });
  console.log(`Created ${timelineData.length} timeline items (20 per event, all ${events.length} events)`);

  // ==================== VEHICLES (15+) ====================
  const vehicles = await Promise.all([
    prisma.vehicle.create({ data: { name: 'Catering Van 1', type: 'VAN', licensePlate: 'CAT-001', capacity: 'Full event for 100 guests', notes: 'Primary delivery van' }}),
    prisma.vehicle.create({ data: { name: 'Catering Van 2', type: 'VAN', licensePlate: 'CAT-002', capacity: 'Full event for 100 guests' }}),
    prisma.vehicle.create({ data: { name: 'Catering Van 3', type: 'VAN', licensePlate: 'CAT-003', capacity: 'Full event for 75 guests' }}),
    prisma.vehicle.create({ data: { name: 'Refrigerated Truck 1', type: 'REFRIGERATED', licensePlate: 'CAT-010', capacity: 'Cold storage for 300 guests' }}),
    prisma.vehicle.create({ data: { name: 'Refrigerated Truck 2', type: 'REFRIGERATED', licensePlate: 'CAT-011', capacity: 'Cold storage for 200 guests' }}),
    prisma.vehicle.create({ data: { name: 'Large Box Truck', type: 'TRUCK', licensePlate: 'CAT-020', capacity: 'Equipment for 500 guests' }}),
    prisma.vehicle.create({ data: { name: 'Medium Box Truck', type: 'TRUCK', licensePlate: 'CAT-021', capacity: 'Equipment for 250 guests' }}),
    prisma.vehicle.create({ data: { name: 'Pickup Truck 1', type: 'TRUCK', licensePlate: 'CAT-030', capacity: 'Small equipment runs' }}),
    prisma.vehicle.create({ data: { name: 'Pickup Truck 2', type: 'TRUCK', licensePlate: 'CAT-031', capacity: 'Small equipment runs' }}),
    prisma.vehicle.create({ data: { name: 'Compact Van', type: 'VAN', licensePlate: 'CAT-040', capacity: 'Quick deliveries, 50 guests' }}),
    prisma.vehicle.create({ data: { name: 'Manager SUV', type: 'CAR', licensePlate: 'CAT-050', capacity: 'Manager transport, small items' }}),
    prisma.vehicle.create({ data: { name: 'Catering Van 4', type: 'VAN', licensePlate: 'CAT-004', capacity: 'Full event for 80 guests' }}),
    prisma.vehicle.create({ data: { name: 'Mobile Kitchen Trailer', type: 'TRUCK', licensePlate: 'CAT-060', capacity: 'Full kitchen on wheels' }}),
    prisma.vehicle.create({ data: { name: 'Beverage Truck', type: 'REFRIGERATED', licensePlate: 'CAT-012', capacity: 'Beverages for 400 guests' }}),
    prisma.vehicle.create({ data: { name: 'Hot Box Van', type: 'VAN', licensePlate: 'CAT-005', capacity: 'Hot food transport' }}),
    prisma.vehicle.create({ data: { name: 'Event Supplies Van', type: 'VAN', licensePlate: 'CAT-006', capacity: 'Linens and decor' }})
  ]);

  console.log(`Created ${vehicles.length} vehicles`);

  // ==================== EQUIPMENT (20+) ====================
  const equipment = await Promise.all([
    prisma.equipment.create({ data: { name: 'Round Chafing Dish', category: 'CHAFING', quantity: 30, available: 30, description: '8 qt round chafing dish with lid' }}),
    prisma.equipment.create({ data: { name: 'Rectangular Chafing Dish', category: 'CHAFING', quantity: 25, available: 25, description: 'Full size rectangular chafer' }}),
    prisma.equipment.create({ data: { name: 'Beverage Dispenser 3 Gallon', category: 'BEVERAGE', quantity: 20, available: 20 }}),
    prisma.equipment.create({ data: { name: 'Coffee Urn 100 Cup', category: 'BEVERAGE', quantity: 10, available: 10 }}),
    prisma.equipment.create({ data: { name: '60" Round Table', category: 'TABLES', quantity: 50, available: 50 }}),
    prisma.equipment.create({ data: { name: '72" Rectangular Table', category: 'TABLES', quantity: 30, available: 30 }}),
    prisma.equipment.create({ data: { name: '48" Round Cocktail Table', category: 'TABLES', quantity: 25, available: 25 }}),
    prisma.equipment.create({ data: { name: 'Chiavari Chair Gold', category: 'CHAIRS', quantity: 300, available: 300 }}),
    prisma.equipment.create({ data: { name: 'Chiavari Chair Silver', category: 'CHAIRS', quantity: 200, available: 200 }}),
    prisma.equipment.create({ data: { name: 'Folding Chair White', category: 'CHAIRS', quantity: 500, available: 500 }}),
    prisma.equipment.create({ data: { name: 'White Tablecloth 120"', category: 'LINENS', quantity: 100, available: 100 }}),
    prisma.equipment.create({ data: { name: 'Ivory Tablecloth 120"', category: 'LINENS', quantity: 75, available: 75 }}),
    prisma.equipment.create({ data: { name: 'Black Tablecloth 120"', category: 'LINENS', quantity: 50, available: 50 }}),
    prisma.equipment.create({ data: { name: 'White Napkins', category: 'LINENS', quantity: 1000, available: 1000 }}),
    prisma.equipment.create({ data: { name: 'Serving Tray Round', category: 'SERVING', quantity: 50, available: 50 }}),
    prisma.equipment.create({ data: { name: 'Serving Tray Rectangular', category: 'SERVING', quantity: 40, available: 40 }}),
    prisma.equipment.create({ data: { name: 'Champagne Tower', category: 'DECOR', quantity: 5, available: 5 }}),
    prisma.equipment.create({ data: { name: 'Ice Sculpture Stand', category: 'DECOR', quantity: 3, available: 3 }}),
    prisma.equipment.create({ data: { name: 'Portable Bar Unit', category: 'BEVERAGE', quantity: 8, available: 8 }}),
    prisma.equipment.create({ data: { name: 'Heat Lamp Station', category: 'SERVING', quantity: 15, available: 15 }}),
    prisma.equipment.create({ data: { name: 'Carving Station', category: 'SERVING', quantity: 10, available: 10 }}),
    prisma.equipment.create({ data: { name: 'Dessert Display Case', category: 'SERVING', quantity: 6, available: 6 }})
  ]);

  console.log(`Created ${equipment.length} equipment items`);

  // ==================== INGREDIENTS (25+) ====================
  const ingredients = await Promise.all([
    prisma.ingredient.create({ data: { name: 'Chicken Breast', unit: 'lb', costPerUnit: 4.50, category: 'MEAT', parLevel: 100, currentStock: 85 }}),
    prisma.ingredient.create({ data: { name: 'Beef Tenderloin', unit: 'lb', costPerUnit: 22.00, category: 'MEAT', parLevel: 50, currentStock: 35 }}),
    prisma.ingredient.create({ data: { name: 'Prime Rib', unit: 'lb', costPerUnit: 18.00, category: 'MEAT', parLevel: 75, currentStock: 60 }}),
    prisma.ingredient.create({ data: { name: 'Lamb Rack', unit: 'lb', costPerUnit: 25.00, category: 'MEAT', parLevel: 30, currentStock: 25 }}),
    prisma.ingredient.create({ data: { name: 'Atlantic Salmon', unit: 'lb', costPerUnit: 14.00, category: 'SEAFOOD', parLevel: 40, currentStock: 45 }}),
    prisma.ingredient.create({ data: { name: 'Jumbo Shrimp', unit: 'lb', costPerUnit: 18.00, category: 'SEAFOOD', parLevel: 30, currentStock: 25 }}),
    prisma.ingredient.create({ data: { name: 'Sea Scallops', unit: 'lb', costPerUnit: 28.00, category: 'SEAFOOD', parLevel: 20, currentStock: 15 }}),
    prisma.ingredient.create({ data: { name: 'Chilean Sea Bass', unit: 'lb', costPerUnit: 35.00, category: 'SEAFOOD', parLevel: 15, currentStock: 10 }}),
    prisma.ingredient.create({ data: { name: 'Romaine Lettuce', unit: 'head', costPerUnit: 2.50, category: 'PRODUCE', parLevel: 50, currentStock: 60 }}),
    prisma.ingredient.create({ data: { name: 'Mixed Greens', unit: 'lb', costPerUnit: 6.00, category: 'PRODUCE', parLevel: 30, currentStock: 35 }}),
    prisma.ingredient.create({ data: { name: 'Asparagus', unit: 'bunch', costPerUnit: 4.00, category: 'PRODUCE', parLevel: 40, currentStock: 45 }}),
    prisma.ingredient.create({ data: { name: 'Fingerling Potatoes', unit: 'lb', costPerUnit: 3.00, category: 'PRODUCE', parLevel: 50, currentStock: 55 }}),
    prisma.ingredient.create({ data: { name: 'Heavy Cream', unit: 'qt', costPerUnit: 5.00, category: 'DAIRY', parLevel: 30, currentStock: 25 }}),
    prisma.ingredient.create({ data: { name: 'Butter Unsalted', unit: 'lb', costPerUnit: 4.50, category: 'DAIRY', parLevel: 40, currentStock: 50 }}),
    prisma.ingredient.create({ data: { name: 'Parmesan Cheese', unit: 'lb', costPerUnit: 16.00, category: 'DAIRY', parLevel: 20, currentStock: 18 }}),
    prisma.ingredient.create({ data: { name: 'Fresh Mozzarella', unit: 'lb', costPerUnit: 10.00, category: 'DAIRY', parLevel: 15, currentStock: 12 }}),
    prisma.ingredient.create({ data: { name: 'Arborio Rice', unit: 'lb', costPerUnit: 4.00, category: 'DRY_GOODS', parLevel: 30, currentStock: 40 }}),
    prisma.ingredient.create({ data: { name: 'Olive Oil Extra Virgin', unit: 'L', costPerUnit: 15.00, category: 'DRY_GOODS', parLevel: 20, currentStock: 15 }}),
    prisma.ingredient.create({ data: { name: 'Balsamic Vinegar', unit: 'L', costPerUnit: 12.00, category: 'DRY_GOODS', parLevel: 10, currentStock: 8 }}),
    prisma.ingredient.create({ data: { name: 'All Purpose Flour', unit: 'lb', costPerUnit: 1.00, category: 'DRY_GOODS', parLevel: 50, currentStock: 60 }}),
    prisma.ingredient.create({ data: { name: 'Dark Chocolate', unit: 'lb', costPerUnit: 12.00, category: 'DRY_GOODS', parLevel: 15, currentStock: 20 }}),
    prisma.ingredient.create({ data: { name: 'Vanilla Beans', unit: 'each', costPerUnit: 3.00, category: 'SPICES', parLevel: 30, currentStock: 25 }}),
    prisma.ingredient.create({ data: { name: 'Fresh Thyme', unit: 'bunch', costPerUnit: 2.50, category: 'PRODUCE', parLevel: 20, currentStock: 25 }}),
    prisma.ingredient.create({ data: { name: 'Fresh Rosemary', unit: 'bunch', costPerUnit: 2.50, category: 'PRODUCE', parLevel: 20, currentStock: 22 }}),
    prisma.ingredient.create({ data: { name: 'Lemons', unit: 'each', costPerUnit: 0.50, category: 'PRODUCE', parLevel: 100, currentStock: 120 }}),
    prisma.ingredient.create({ data: { name: 'Red Wine (Cooking)', unit: 'bottle', costPerUnit: 10.00, category: 'BEVERAGES', parLevel: 12, currentStock: 15 }}),
    prisma.ingredient.create({ data: { name: 'White Wine (Cooking)', unit: 'bottle', costPerUnit: 8.00, category: 'BEVERAGES', parLevel: 12, currentStock: 10 }})
  ]);

  console.log(`Created ${ingredients.length} ingredients`);

  // ==================== RECIPES (15+) ====================
  // Link recipes to menu items
  const menuItemsList = await prisma.menuItem.findMany();
  const getMenuItem = (name) => menuItemsList.find(m => m.name.toLowerCase().includes(name.toLowerCase()));

  const recipes = await Promise.all([
    prisma.recipe.create({ data: { menuItemId: getMenuItem('Filet Mignon')?.id || menuItemsList[0].id, name: 'Filet Mignon with Red Wine Reduction', servings: 4, prepTime: 20, cookTime: 25, instructions: '1. Season filets with salt and pepper\n2. Sear in hot pan 4 min per side\n3. Rest 5 minutes\n4. Make red wine reduction with shallots' }}),
    prisma.recipe.create({ data: { menuItemId: getMenuItem('Salmon')?.id || menuItemsList[1].id, name: 'Grilled Atlantic Salmon', servings: 4, prepTime: 15, cookTime: 12, instructions: '1. Season salmon with herbs\n2. Grill skin-side down 8 minutes\n3. Flip and cook 4 more minutes\n4. Top with dill butter' }}),
    prisma.recipe.create({ data: { menuItemId: getMenuItem('Herb Roasted Chicken')?.id || menuItemsList[2].id, name: 'Herb Roasted Chicken', servings: 6, prepTime: 15, cookTime: 45, instructions: '1. Rub chicken with herb butter\n2. Roast at 425°F for 45 minutes\n3. Rest 10 minutes before slicing' }}),
    prisma.recipe.create({ data: { menuItemId: getMenuItem('Caesar')?.id || menuItemsList[3].id, name: 'Classic Caesar Salad', servings: 8, prepTime: 20, cookTime: 0, instructions: '1. Make dressing with anchovy, garlic, lemon\n2. Toss romaine with dressing\n3. Top with croutons and parmesan' }}),
    prisma.recipe.create({ data: { menuItemId: getMenuItem('Risotto')?.id || menuItemsList[4].id, name: 'Mushroom Risotto', servings: 6, prepTime: 10, cookTime: 30, instructions: '1. Sauté mushrooms\n2. Toast rice, add wine\n3. Add stock gradually\n4. Finish with butter and parmesan' }}),
    prisma.recipe.create({ data: { menuItemId: getMenuItem('Shrimp')?.id || menuItemsList[5].id, name: 'Jumbo Shrimp Cocktail', servings: 8, prepTime: 15, cookTime: 5, instructions: '1. Poach shrimp in court bouillon\n2. Chill immediately\n3. Serve with house cocktail sauce' }}),
    prisma.recipe.create({ data: { menuItemId: getMenuItem('Chocolate Mousse')?.id || menuItemsList[6].id, name: 'Chocolate Mousse', servings: 8, prepTime: 30, cookTime: 0, instructions: '1. Melt chocolate\n2. Whip cream to soft peaks\n3. Fold together gently\n4. Chill 4 hours' }}),
    prisma.recipe.create({ data: { menuItemId: getMenuItem('Carpaccio')?.id || menuItemsList[7].id, name: 'Beef Carpaccio', servings: 6, prepTime: 25, cookTime: 0, instructions: '1. Freeze beef partially\n2. Slice paper thin\n3. Arrange on plates\n4. Top with arugula and parmesan' }}),
    prisma.recipe.create({ data: { menuItemId: getMenuItem('Butternut')?.id || menuItemsList[8].id, name: 'Butternut Squash Soup', servings: 10, prepTime: 15, cookTime: 45, instructions: '1. Roast squash until tender\n2. Sauté onions\n3. Blend with stock\n4. Finish with cream' }}),
    prisma.recipe.create({ data: { menuItemId: getMenuItem('Lamb')?.id || menuItemsList[9].id, name: 'Lamb Chops with Mint Chimichurri', servings: 4, prepTime: 20, cookTime: 12, instructions: '1. Season lamb chops\n2. Grill to medium-rare\n3. Rest 5 minutes\n4. Serve with chimichurri' }}),
    prisma.recipe.create({ data: { menuItemId: getMenuItem('Caprese')?.id || menuItemsList[10].id, name: 'Caprese Skewers', servings: 12, prepTime: 20, cookTime: 0, instructions: '1. Cut mozzarella into cubes\n2. Thread with cherry tomatoes and basil\n3. Drizzle with balsamic glaze' }}),
    prisma.recipe.create({ data: { menuItemId: getMenuItem('Brûlée')?.id || menuItemsList[11].id, name: 'Crème Brûlée', servings: 6, prepTime: 20, cookTime: 45, instructions: '1. Heat cream with vanilla\n2. Temper into egg yolks\n3. Bake in water bath\n4. Torch sugar before serving' }}),
    prisma.recipe.create({ data: { menuItemId: getMenuItem('Scallops')?.id || menuItemsList[12].id, name: 'Bacon-Wrapped Scallops', servings: 8, prepTime: 15, cookTime: 10, instructions: '1. Wrap scallops with bacon\n2. Secure with toothpick\n3. Pan sear until bacon crisp\n4. Serve immediately' }}),
    prisma.recipe.create({ data: { menuItemId: getMenuItem('Mashed')?.id || menuItemsList[13].id, name: 'Garlic Mashed Potatoes', servings: 10, prepTime: 15, cookTime: 25, instructions: '1. Boil potatoes until tender\n2. Roast garlic\n3. Mash with butter and cream\n4. Season to taste' }}),
    prisma.recipe.create({ data: { menuItemId: getMenuItem('Asparagus')?.id || menuItemsList[14].id, name: 'Grilled Asparagus', servings: 8, prepTime: 5, cookTime: 8, instructions: '1. Trim asparagus\n2. Toss with olive oil\n3. Grill until charred\n4. Finish with lemon butter' }}),
    prisma.recipe.create({ data: { menuItemId: getMenuItem('Onion Soup')?.id || menuItemsList[15].id, name: 'French Onion Soup', servings: 8, prepTime: 20, cookTime: 60, instructions: '1. Slowly caramelize onions\n2. Add beef stock and wine\n3. Ladle into bowls\n4. Top with bread and cheese, broil' }})
  ]);

  console.log(`Created ${recipes.length} recipes`);

  // Add recipe ingredients - add 3-5 ingredients to EVERY recipe
  const ingredientsList = await prisma.ingredient.findMany();
  const recipeIngredients = [];

  // Create ingredient mappings for each recipe
  recipes.forEach((recipe, idx) => {
    // Assign 3-5 random ingredients to each recipe based on recipe index
    const numIngredients = 3 + (idx % 3); // 3, 4, or 5 ingredients
    const startIdx = (idx * 3) % ingredientsList.length;

    for (let i = 0; i < numIngredients; i++) {
      const ingredient = ingredientsList[(startIdx + i) % ingredientsList.length];
      if (ingredient) {
        recipeIngredients.push({
          recipeId: recipe.id,
          ingredientId: ingredient.id,
          quantity: 0.5 + (i * 0.5), // 0.5, 1, 1.5, 2, 2.5
          unit: ingredient.unit
        });
      }
    }
  });

  // Filter out any null ingredientIds and create
  const validRecipeIngredients = recipeIngredients.filter(ri => ri.ingredientId);
  if (validRecipeIngredients.length > 0) {
    await prisma.recipeIngredient.createMany({ data: validRecipeIngredients });
  }

  console.log(`Created ${validRecipeIngredients.length} recipe ingredients`);

  // ==================== ORDERS (15+) ====================
  const orders = await Promise.all(
    events.slice(0, 15).map((event, idx) =>
      prisma.order.create({
        data: {
          orderNumber: `ORD-2024-${String(idx + 1).padStart(4, '0')}`,
          eventId: event.id,
          clientId: event.clientId,
          packageId: packages[idx % packages.length].id,  // Link to a menu package
          status: ['PENDING', 'CONFIRMED', 'IN_PREP', 'READY'][idx % 4],
          guestCount: event.guestCount,
          totalAmount: event.guestCount * (50 + idx * 5),
          specialRequests: idx % 3 === 0 ? 'Please include vegetarian options' : null
        }
      })
    )
  );

  console.log(`Created ${orders.length} orders`);

  // ==================== ORDER ITEMS (link orders to menu items) ====================
  const orderItems = [];
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    // Add 3-5 menu items to each order
    const numItems = 3 + (i % 3);
    for (let j = 0; j < numItems; j++) {
      const menuItem = menuItems[(i * 2 + j) % menuItems.length];
      orderItems.push({
        orderId: order.id,
        menuItemId: menuItem.id,
        quantity: 1 + (j % 2),
        unitPrice: menuItem.price,
        notes: j === 0 ? 'Priority item' : null
      });
    }
  }

  await prisma.orderItem.createMany({ data: orderItems });
  console.log(`Created ${orderItems.length} order items`);

  // ==================== INVOICES (15+) ====================
  // Create invoices with more SENT/VIEWED/PARTIALLY_PAID for client portal
  const invoiceStatuses = [
    'SENT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'SENT',     // Pending for client portal
    'PAID', 'PAID', 'PAID',                                   // Some paid
    'SENT', 'VIEWED', 'PARTIALLY_PAID',                       // More pending
    'DRAFT',                                                  // Draft
    'OVERDUE', 'SENT', 'VIEWED'                               // Mix
  ];

  const invoices = await Promise.all(
    events.slice(0, 15).map((event, idx) =>
      prisma.invoice.create({
        data: {
          invoiceNumber: `INV-2024-${String(idx + 1).padStart(4, '0')}`,
          eventId: event.id,
          createdById: users[0].id,
          type: ['DEPOSIT', 'PROGRESS', 'FINAL'][idx % 3],
          status: invoiceStatuses[idx],
          subtotal: event.guestCount * 55,
          taxRate: 8,
          taxAmount: event.guestCount * 55 * 0.08,
          gratuity: event.guestCount * 55 * 0.18,
          total: event.guestCount * 55 * 1.26,
          dueDate: futureDate(30 + idx * 5),
          notes: `Invoice for ${event.name}\nPayment due within 30 days.`
        }
      })
    )
  );

  console.log(`Created ${invoices.length} invoices`);

  // ==================== INVOICE LINE ITEMS ====================
  const invoiceLineItems = [];
  for (const invoice of invoices) {
    const event = events.find(e => e.id === invoice.eventId);
    if (event) {
      invoiceLineItems.push(
        { invoiceId: invoice.id, description: 'Catering Service - Full Package', quantity: event.guestCount, unitPrice: 45, total: event.guestCount * 45 },
        { invoiceId: invoice.id, description: 'Beverage Service', quantity: event.guestCount, unitPrice: 12, total: event.guestCount * 12 },
        { invoiceId: invoice.id, description: 'Service Staff', quantity: Math.ceil(event.guestCount / 20), unitPrice: 150, total: Math.ceil(event.guestCount / 20) * 150 },
        { invoiceId: invoice.id, description: 'Equipment & Rentals', quantity: 1, unitPrice: 450, total: 450 }
      );
    }
  }

  await prisma.invoiceLineItem.createMany({ data: invoiceLineItems });
  console.log(`Created ${invoiceLineItems.length} invoice line items`);

  // ==================== PAYMENTS (15+) ====================
  const payments = await Promise.all(
    invoices.filter((_, idx) => idx % 2 === 0).map((invoice, idx) =>
      prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: invoice.total * (idx % 2 === 0 ? 0.5 : 1),
          method: ['CREDIT_CARD', 'CHECK', 'BANK_TRANSFER', 'CASH'][idx % 4],
          reference: `PAY-${Date.now()}-${idx}`
        }
      })
    )
  );

  console.log(`Created ${payments.length} payments`);

  // ==================== PROPOSALS (15+) ====================
  // Create proposals with variety of statuses - more SENT/VIEWED for client portal testing
  const proposalStatuses = [
    'SENT', 'SENT', 'VIEWED', 'VIEWED', 'SENT',  // First 5 are pending for client portal
    'ACCEPTED', 'ACCEPTED', 'ACCEPTED',           // Some accepted
    'SENT', 'VIEWED',                              // More pending
    'DRAFT', 'DRAFT',                              // Some drafts
    'SENT', 'VIEWED', 'REJECTED'                   // Mix for variety
  ];

  const proposals = await Promise.all(
    events.slice(0, 15).map((event, idx) =>
      prisma.proposal.create({
        data: {
          eventId: event.id,
          createdById: users[0].id,
          status: proposalStatuses[idx],
          totalAmount: event.guestCount * 65,
          validUntil: futureDate(30),
          notes: `Proposal for ${event.name}\n\nIncludes:\n- Full catering service\n- Professional wait staff\n- All tableware and linens\n- Setup and cleanup`,
          signedBy: proposalStatuses[idx] === 'ACCEPTED' ? event.client?.name : null,
          signedAt: proposalStatuses[idx] === 'ACCEPTED' ? new Date() : null
        }
      })
    )
  );

  console.log(`Created ${proposals.length} proposals`);

  // ==================== PROPOSAL MENUS (link proposals to menu packages) ====================
  const proposalMenus = await Promise.all(
    proposals.map((proposal, idx) =>
      prisma.proposalMenu.create({
        data: {
          proposalId: proposal.id,
          packageId: packages[idx % packages.length].id,
          guestCount: events[idx].guestCount,
          pricePerPerson: packages[idx % packages.length].pricePerPerson,
          notes: idx % 3 === 0 ? 'Includes dietary accommodations' : null
        }
      })
    )
  );

  console.log(`Created ${proposalMenus.length} proposal menus`);

  // ==================== PROPOSAL LINE ITEMS ====================
  const lineItemsData = [];
  for (const proposal of proposals) {
    lineItemsData.push(
      { proposalId: proposal.id, description: 'Service Staff (6 hours)', quantity: Math.ceil(events.find(e => e.id === proposal.eventId)?.guestCount / 20) || 4, unitPrice: 150, total: (Math.ceil(events.find(e => e.id === proposal.eventId)?.guestCount / 20) || 4) * 150, category: 'Labor' },
      { proposalId: proposal.id, description: 'Beverage Package', quantity: 1, unitPrice: events.find(e => e.id === proposal.eventId)?.guestCount * 15 || 500, total: events.find(e => e.id === proposal.eventId)?.guestCount * 15 || 500, category: 'Beverages' },
      { proposalId: proposal.id, description: 'Equipment Rental', quantity: 1, unitPrice: 500, total: 500, category: 'Equipment' },
      { proposalId: proposal.id, description: 'Delivery & Setup', quantity: 1, unitPrice: 350, total: 350, category: 'Logistics' }
    );
  }

  await prisma.proposalLineItem.createMany({ data: lineItemsData });
  console.log(`Created ${lineItemsData.length} proposal line items`);

  // ==================== DELIVERIES (15+) ====================
  const allStaff = await prisma.staff.findMany({ include: { user: true } });
  const deliveries = await Promise.all(
    events.slice(0, 15).map((event, idx) =>
      prisma.delivery.create({
        data: {
          eventId: event.id,
          vehicleId: vehicles[idx % vehicles.length].id,
          scheduledTime: new Date(new Date(event.startTime).getTime() - 3 * 60 * 60 * 1000),
          status: ['SCHEDULED', 'LOADING', 'IN_TRANSIT', 'ARRIVED', 'SETUP_COMPLETE'][idx % 5],
          driverName: allStaff.find(s => s.position === 'DRIVER')?.user?.name || 'TBD',
          routeNotes: `Delivery for ${event.name}`,
          setupCrew: '2 person crew'
        }
      })
    )
  );

  console.log(`Created ${deliveries.length} deliveries`);

  // ==================== STAFF ASSIGNMENTS (15+ per event) ====================
  const staffRoles = ['SERVER', 'BARTENDER', 'CHEF', 'SETUP_CREW', 'EVENT_CAPTAIN', 'DRIVER', 'PREP_COOK', 'LINE_COOK'];
  const assignmentData = [];

  for (const event of events) {
    // Create 15 staff assignments per event
    for (let i = 0; i < 15; i++) {
      assignmentData.push({
        staffId: allStaff[i % allStaff.length].id,
        eventId: event.id,
        role: staffRoles[i % staffRoles.length],
        startTime: new Date(new Date(event.startTime).getTime() - 2 * 60 * 60 * 1000),
        endTime: new Date(new Date(event.endTime).getTime() + 1 * 60 * 60 * 1000),
        confirmed: i % 3 !== 0
      });
    }
  }

  await prisma.staffAssignment.createMany({ data: assignmentData });
  console.log(`Created ${assignmentData.length} staff assignments (15 per event)`);

  // ==================== PREP LISTS (15+) ====================
  const prepLists = await Promise.all(
    orders.slice(0, 15).map((order, idx) =>
      prisma.prepList.create({
        data: {
          orderId: order.id,
          date: futureDate(idx + 1),
          status: ['PENDING', 'IN_PROGRESS', 'COMPLETED'][idx % 3],
          assignedTo: allStaff[idx % allStaff.length]?.user?.name,
          items: {
            create: [
              { task: 'Prep vegetables', quantity: `${order.guestCount * 2} oz` },
              { task: 'Marinate proteins', quantity: `${order.guestCount * 6} oz` },
              { task: 'Make sauces', quantity: `${Math.ceil(order.guestCount / 10)} qt` }
            ]
          }
        }
      })
    )
  );

  console.log(`Created ${prepLists.length} prep lists`);

  // ==================== PACK LISTS (15+) ====================
  const packLists = await Promise.all(
    orders.slice(0, 15).map((order, idx) =>
      prisma.packList.create({
        data: {
          orderId: order.id,
          status: ['PENDING', 'IN_PROGRESS', 'COMPLETED'][idx % 3],
          packedBy: allStaff[idx % allStaff.length]?.user?.name,
          items: {
            create: [
              { item: 'Chafing dishes', quantity: Math.ceil(order.guestCount / 25) },
              { item: 'Serving utensils', quantity: 10 },
              { item: 'Plates', quantity: order.guestCount + 20 },
              { item: 'Napkins', quantity: order.guestCount * 2 }
            ]
          }
        }
      })
    )
  );

  console.log(`Created ${packLists.length} pack lists`);

  // ==================== TIME ENTRIES (15+) ====================
  const timeEntries = await Promise.all(
    allStaff.slice(0, 8).flatMap((staff, idx) =>
      Array.from({ length: 3 }, (_, i) => {
        const date = futureDate(-7 + i);
        return prisma.timeEntry.create({
          data: {
            staffId: staff.id,
            date: date,
            clockIn: new Date(date.setHours(9 + idx % 3, 0)),
            clockOut: new Date(date.setHours(17 + idx % 2, 0)),
            breakMinutes: 30,
            totalHours: 7.5 + (idx % 2),
            approved: idx % 2 === 0
          }
        });
      })
    )
  );

  console.log(`Created ${timeEntries.length} time entries`);

  // ==================== SUPPLIERS (15+) ====================
  const suppliers = await Promise.all([
    prisma.supplier.create({ data: { name: 'Premium Meats Inc.', contactName: 'Frank Butcher', email: 'orders@premiummeats.com', phone: '555-2001', address: '100 Meat Packing Ave, Brooklyn, NY 11201', category: 'MEAT', notes: 'Preferred beef supplier, next day delivery' }}),
    prisma.supplier.create({ data: { name: 'Ocean Fresh Seafood', contactName: 'Marina Waters', email: 'supply@oceanfresh.com', phone: '555-2002', address: '50 Fisherman Wharf, Long Island, NY 11101', category: 'SEAFOOD', notes: 'Daily fresh catch, must order by 2pm' }}),
    prisma.supplier.create({ data: { name: 'Green Valley Produce', contactName: 'Herb Gardner', email: 'sales@greenvalley.com', phone: '555-2003', address: '789 Farm Road, Upstate, NY 12345', category: 'PRODUCE', notes: 'Organic options available, Mon/Wed/Fri delivery' }}),
    prisma.supplier.create({ data: { name: 'Artisan Dairy Co.', contactName: 'Millie Creamer', email: 'orders@artisandairy.com', phone: '555-2004', address: '25 Dairy Lane, Vermont, VT 05401', category: 'DAIRY', notes: 'Specialty cheeses, $200 minimum order' }}),
    prisma.supplier.create({ data: { name: 'Wholesale Foods Direct', contactName: 'Bill Bulk', email: 'sales@wholesalefoods.com', phone: '555-2005', address: '500 Industrial Blvd, NJ 07001', category: 'DRY_GOODS', notes: 'Best prices on bulk staples' }}),
    prisma.supplier.create({ data: { name: 'Vintage Wine Merchants', contactName: 'Vince Cellar', email: 'orders@vintagewines.com', phone: '555-2006', address: '1 Wine Road, Napa Valley, CA 94558', category: 'BEVERAGES', notes: 'Premium wines, 2 week lead time' }}),
    prisma.supplier.create({ data: { name: 'Spice World Imports', contactName: 'Saffron Singh', email: 'info@spiceworld.com', phone: '555-2007', address: '88 Spice Market, Queens, NY 11375', category: 'SPICES', notes: 'Exotic spices, wholesale pricing' }}),
    prisma.supplier.create({ data: { name: 'Baker\'s Best Supplies', contactName: 'Betty Dough', email: 'orders@bakersbest.com', phone: '555-2008', address: '42 Bakery Lane, Manhattan, NY 10001', category: 'BAKERY', notes: 'Flour, yeast, baking supplies' }}),
    prisma.supplier.create({ data: { name: 'Party Rentals Plus', contactName: 'Ray Tables', email: 'rentals@partyplus.com', phone: '555-2009', address: '200 Event Drive, Brooklyn, NY 11222', category: 'EQUIPMENT', notes: 'Tables, chairs, linens rental' }}),
    prisma.supplier.create({ data: { name: 'Premium Paper Goods', contactName: 'Paige Napkin', email: 'sales@premiumpapers.com', phone: '555-2010', address: '75 Disposable Way, NJ 07030', category: 'SUPPLIES', notes: 'Eco-friendly options available' }}),
    prisma.supplier.create({ data: { name: 'Fresh Herbs Direct', contactName: 'Basil Green', email: 'herbs@freshdirect.com', phone: '555-2011', address: '33 Garden Center, CT 06001', category: 'PRODUCE', notes: 'Fresh cut herbs, same day delivery' }}),
    prisma.supplier.create({ data: { name: 'Gourmet Chocolate Co.', contactName: 'Coco Bean', email: 'orders@gourmetchoco.com', phone: '555-2012', address: '10 Chocolate Ave, PA 19001', category: 'SPECIALTY', notes: 'Artisan chocolates, min 1 week notice' }}),
    prisma.supplier.create({ data: { name: 'Ice Masters', contactName: 'Jack Frost', email: 'ice@icemasters.com', phone: '555-2013', address: '1 Cold Storage Rd, NJ 07002', category: 'ICE', notes: 'Ice sculptures, block ice, delivery included' }}),
    prisma.supplier.create({ data: { name: 'Clean Kitchen Supplies', contactName: 'Sandy Scrub', email: 'orders@cleankitchen.com', phone: '555-2014', address: '60 Sanitary Blvd, NJ 07003', category: 'CLEANING', notes: 'Commercial cleaning supplies' }}),
    prisma.supplier.create({ data: { name: 'Local Poultry Farm', contactName: 'Henrietta Fowl', email: 'farm@localpoultry.com', phone: '555-2015', address: '150 Country Road, PA 18001', category: 'POULTRY', notes: 'Free-range chickens, duck, quail' }}),
    prisma.supplier.create({ data: { name: 'Coffee Roasters Guild', contactName: 'Joe Beans', email: 'wholesale@coffeeguild.com', phone: '555-2016', address: '22 Roaster Row, Brooklyn, NY 11211', category: 'BEVERAGES', notes: 'Fresh roasted coffee, tea selection' }})
  ]);

  console.log(`Created ${suppliers.length} suppliers`);

  // ==================== PURCHASE ORDERS (15+) ====================
  const purchaseOrders = await Promise.all(
    suppliers.slice(0, 15).map((supplier, idx) =>
      prisma.purchaseOrder.create({
        data: {
          orderNumber: `PO-2024-${String(idx + 1).padStart(4, '0')}`,
          supplierId: supplier.id,
          status: ['DRAFT', 'SENT', 'CONFIRMED', 'RECEIVED', 'CANCELLED'][idx % 5],
          orderDate: new Date(),
          expectedDate: futureDate(7 + idx),
          totalAmount: 500 + idx * 150,
          notes: `Order for upcoming events`,
          items: {
            create: [
              { description: `Item 1 from ${supplier.name}`, quantity: 10 + idx, unit: 'lb', unitPrice: 15, total: (10 + idx) * 15 },
              { description: `Item 2 from ${supplier.name}`, quantity: 5 + idx, unit: 'case', unitPrice: 45, total: (5 + idx) * 45 }
            ]
          }
        }
      })
    )
  );

  console.log(`Created ${purchaseOrders.length} purchase orders`);

  // ==================== GUESTS (15+ per event for ALL events) ====================
  const guestData = [];
  const guestNames = [
    { name: 'Alice Johnson', email: 'alice.j@email.com' },
    { name: 'Bob Williams', email: 'bob.w@email.com' },
    { name: 'Carol Davis', email: 'carol.d@email.com' },
    { name: 'David Miller', email: 'david.m@email.com' },
    { name: 'Emma Wilson', email: 'emma.w@email.com' },
    { name: 'Frank Brown', email: 'frank.b@email.com' },
    { name: 'Grace Lee', email: 'grace.l@email.com' },
    { name: 'Henry Taylor', email: 'henry.t@email.com' },
    { name: 'Isabella Anderson', email: 'isabella.a@email.com' },
    { name: 'Jack Thomas', email: 'jack.t@email.com' },
    { name: 'Karen Martinez', email: 'karen.m@email.com' },
    { name: 'Leo Garcia', email: 'leo.g@email.com' },
    { name: 'Mia Robinson', email: 'mia.r@email.com' },
    { name: 'Nathan Clark', email: 'nathan.c@email.com' },
    { name: 'Olivia Lewis', email: 'olivia.l@email.com' },
    { name: 'Peter Hall', email: 'peter.h@email.com' },
    { name: 'Quinn Young', email: 'quinn.y@email.com' },
    { name: 'Rachel King', email: 'rachel.k@email.com' }
  ];

  // Create guests for ALL events
  for (let i = 0; i < events.length; i++) {
    for (let j = 0; j < guestNames.length; j++) {
      const guest = guestNames[j];
      guestData.push({
        eventId: events[i].id,
        name: guest.name,
        email: `${guest.email.split('@')[0]}.event${i + 1}@email.com`,
        phone: `555-${3000 + i * 100 + j}`,
        isVegetarian: j % 5 === 0,
        isVegan: j % 8 === 0,
        isGlutenFree: j % 6 === 0,
        isDairyFree: j % 7 === 0,
        isNutFree: j % 9 === 0,
        otherAllergies: j % 10 === 0 ? 'Shellfish allergy' : null,
        mealPreference: ['Standard', 'Chicken', 'Fish', 'Vegetarian'][j % 4],
        notes: j % 4 === 0 ? 'VIP guest' : null,
        rsvpStatus: ['PENDING', 'CONFIRMED', 'DECLINED', 'CONFIRMED', 'CONFIRMED'][j % 5]
      });
    }
  }

  await prisma.guest.createMany({ data: guestData });
  console.log(`Created ${guestData.length} guests (18 per event, all ${events.length} events)`);

  // ==================== EVENT PHOTOS (15+ per event for ALL events) ====================
  // Using real placeholder images from Unsplash
  const photoData = [];
  const photoDescriptions = [
    { filename: 'table-setup-1.jpg', caption: 'Beautiful table arrangement', url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800' },
    { filename: 'buffet-spread.jpg', caption: 'Full buffet spread', url: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800' },
    { filename: 'wedding-cake.jpg', caption: 'Custom wedding cake', url: 'https://images.unsplash.com/photo-1535254973040-607b474cb50d?w=800' },
    { filename: 'cocktail-hour.jpg', caption: 'Guests enjoying cocktails', url: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800' },
    { filename: 'plating-action.jpg', caption: 'Plating in the kitchen', url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800' },
    { filename: 'centerpiece.jpg', caption: 'Floral centerpiece', url: 'https://images.unsplash.com/photo-1478146059778-26028b07395a?w=800' },
    { filename: 'appetizers.jpg', caption: 'Passed appetizers', url: 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=800' },
    { filename: 'dessert-table.jpg', caption: 'Dessert station', url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800' },
    { filename: 'venue-overview.jpg', caption: 'Venue overview shot', url: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800' },
    { filename: 'staff-team.jpg', caption: 'Our amazing team', url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800' },
    { filename: 'carving-station.jpg', caption: 'Prime rib carving station', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800' },
    { filename: 'seafood-display.jpg', caption: 'Seafood raw bar', url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800' },
    { filename: 'wine-service.jpg', caption: 'Wine presentation', url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800' },
    { filename: 'dance-floor.jpg', caption: 'Guests on the dance floor', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800' },
    { filename: 'sunset-venue.jpg', caption: 'Sunset at the venue', url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800' },
    { filename: 'table-setup-2.jpg', caption: 'Elegant place settings', url: 'https://images.unsplash.com/photo-1507504031003-b417219a0fde?w=800' },
    { filename: 'chef-action.jpg', caption: 'Chef preparing dishes', url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=800' },
    { filename: 'cocktails-bar.jpg', caption: 'Full bar setup', url: 'https://images.unsplash.com/photo-1574096079513-d8259312b785?w=800' },
    { filename: 'guest-arrival.jpg', caption: 'Guests arriving', url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800' },
    { filename: 'first-dance.jpg', caption: 'First dance moment', url: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800' }
  ];

  // Create 16 photos per event for ALL events
  for (let i = 0; i < events.length; i++) {
    for (let j = 0; j < 16; j++) {
      const photo = photoDescriptions[j % photoDescriptions.length];
      photoData.push({
        eventId: events[i].id,
        filename: `event${i + 1}-${photo.filename}`,
        url: photo.url,
        caption: `${photo.caption} - ${events[i].name}`,
        uploadedBy: users[0].id,
        isPublic: j % 3 !== 0
      });
    }
  }

  await prisma.eventPhoto.createMany({ data: photoData });
  console.log(`Created ${photoData.length} event photos (16 per event, all ${events.length} events)`);

  // ==================== COST ESTIMATES (15+) ====================
  const estimateNames = [
    'Smith Wedding Estimate', 'Tech Corp Event Quote', 'Brown Birthday Budget',
    'Charity Gala Pricing', 'Wilson Party Estimate', 'Anderson Retreat Quote',
    'Taylor Graduation Budget', 'Martinez Anniversary', 'Garcia Holiday Quote',
    'Williams Shower Estimate', 'Thompson Engagement', 'Product Launch Budget',
    'Garden Wedding Quote', 'Board Luncheon Estimate', 'Golf Outing Budget'
  ];

  const costEstimates = await Promise.all(
    events.slice(0, 15).map((event, idx) =>
      prisma.costEstimate.create({
        data: {
          name: estimateNames[idx],
          eventId: event.id,
          guestCount: event.guestCount,
          packageId: packages[idx % packages.length].id,
          profitMarginPercent: 20 + (idx % 15),
          overheadPercent: 12 + (idx % 8),
          taxRate: 8,
          laborCostPerHour: 25,
          foodCost: event.guestCount * 35,
          laborCost: Math.ceil(event.guestCount / 20) * 6 * 25 + 8 * 45,
          equipmentCost: Math.ceil(event.guestCount / 10) * 15,
          additionalCost: 500 + (idx * 50),
          overheadAmount: event.guestCount * 35 * 0.15,
          subtotal: event.guestCount * 35 * 1.15 + 500,
          profitAmount: event.guestCount * 35 * 0.25,
          taxAmount: event.guestCount * 35 * 1.4 * 0.08,
          totalAmount: event.guestCount * 65,
          pricePerPerson: 65,
          staffDetails: [
            { role: 'Executive Chef', hours: 8, hourlyRate: 45 },
            { role: 'Sous Chef', hours: 6, hourlyRate: 35 },
            { role: 'Server', hours: 6, hourlyRate: 22, count: Math.ceil(event.guestCount / 20) }
          ],
          additionalDetails: [
            { description: 'Equipment Rental', amount: 450 },
            { description: 'Delivery Fee', amount: 150 }
          ],
          status: ['DRAFT', 'FINAL', 'CONVERTED_TO_PROPOSAL', 'ARCHIVED'][idx % 4]
        }
      })
    )
  );

  console.log(`Created ${costEstimates.length} cost estimates`);

  console.log('');
  console.log('============================================');
  console.log('Database seeding completed successfully!');
  console.log('============================================');
  console.log('');
  console.log('Test accounts:');
  console.log('  Admin: admin@cateringpro.com / password123');
  console.log('  Manager: sarah@cateringpro.com / password123');
  console.log('  Client: john@smithwedding.com / password123');
  console.log('  Staff: chef.alex@cateringpro.com / password123');
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
