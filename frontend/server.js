const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ========== USERS STORAGE (Simple array - stays in memory while running) ==========
let users = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin' }
];

let currentUser = null;
let nextUserId = 2;

// ========== SLOTS DATA ==========
let slots = [];
let payments = [];
const MONTHLY_RENT = 1000;

// Initialize 10 slots
for (let i = 1; i <= 10; i++) {
    slots.push({
        id: i,
        slotNumber: i,
        monthlyRent: MONTHLY_RENT,
        assignedTo: null,
        renter: {
            name: '',
            address: '',
            contact: '',
            businessPermitNo: '',
            isOccupied: false,
            startDate: null,
            endDate: null,
            daysRemaining: 0,
            penalty: 0,
            penaltyApplied: false,
            outstandingBalance: 0,
            lastPaymentDate: null
        }
    });
}

// Sample data for demo
slots[0].renter = {
    name: 'Juan Dela Cruz',
    address: 'Poblacion, Trinidad, Bohol',
    contact: '09123456789',
    businessPermitNo: 'BP-2026-1001',
    isOccupied: true,
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    daysRemaining: 25,
    penalty: 0,
    penaltyApplied: false,
    outstandingBalance: 0,
    lastPaymentDate: null
};

// ========== HELPER FUNCTIONS ==========
function generatePermitNo() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return 'BP-' + year + '-' + random;
}

function calculateDaysRemaining(endDate) {
    if (!endDate) return 0;
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// ========== REGISTRATION API ==========
app.post('/api/register', (req, res) => {
    console.log('========================================');
    console.log('📝 REGISTRATION REQUEST:');
    console.log(req.body);
    console.log('========================================');
    
    const { username, password, email, fullname, address, contact } = req.body;
    
    // Check if username exists
    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
        console.log('❌ Username already exists:', username);
        return res.status(400).json({ success: false, message: 'Username already exists' });
    }
    
    // Find available slot
    const availableSlot = slots.find(s => !s.renter.isOccupied);
    if (!availableSlot) {
        console.log('❌ No available slots');
        return res.status(400).json({ success: false, message: 'No available slots' });
    }
    
    // Create new user
    const newUser = {
        id: nextUserId++,
        username: username,
        password: password,
        role: 'tenant',
        email: email || '',
        fullname: fullname || username,
        address: address || '',
        contact: contact || '',
        slotId: availableSlot.slotNumber,
        createdAt: new Date().toISOString()
    };
    users.push(newUser);
    console.log('✅ New user created:', newUser);
    console.log('📋 Current users list:', users.map(u => ({ username: u.username, password: u.password, role: u.role })));
    
    // Assign slot to user
    const permitNo = generatePermitNo();
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    const endDateStr = endDate.toISOString().split('T')[0];
    
    availableSlot.renter = {
        name: fullname || username,
        address: address || '',
        contact: contact || '',
        businessPermitNo: permitNo,
        isOccupied: true,
        startDate: startDate,
        endDate: endDateStr,
        daysRemaining: 30,
        penalty: 0,
        penaltyApplied: false,
        outstandingBalance: 0,
        lastPaymentDate: null
    };
    availableSlot.assignedTo = username;
    
    console.log('✅ Slot #' + availableSlot.slotNumber + ' assigned to ' + username);
    console.log('========================================');
    
    res.json({ 
        success: true, 
        message: 'Registration successful!', 
        username: username, 
        slotNumber: availableSlot.slotNumber,
        permitNo: permitNo
    });
});

// ========== LOGIN API ==========
app.post('/api/login', (req, res) => {
    console.log('========================================');
    console.log('🔐 LOGIN ATTEMPT:');
    console.log('Username:', req.body.username);
    console.log('Password:', req.body.password);
    console.log('Current users:', users.map(u => ({ username: u.username, password: u.password })));
    console.log('========================================');
    
    const { username, password } = req.body;
    
    // Find user
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = { 
            id: user.id, 
            username: user.username, 
            role: user.role, 
            slotId: user.slotId 
        };
        console.log('✅ LOGIN SUCCESS:', currentUser);
        res.json({ success: true, user: currentUser });
    } else {
        console.log('❌ LOGIN FAILED for:', username);
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.post('/api/logout', (req, res) => {
    currentUser = null;
    res.json({ success: true });
});

app.get('/api/current-user', (req, res) => {
    res.json(currentUser || null);
});

// ========== SLOTS API ==========
app.get('/api/slots', (req, res) => {
    let filteredSlots = slots;
    if (currentUser && currentUser.role === 'tenant' && currentUser.slotId) {
        filteredSlots = slots.filter(s => s.slotNumber === currentUser.slotId);
    }
    
    const updatedSlots = filteredSlots.map(slot => {
        if (slot.renter.isOccupied && slot.renter.endDate) {
            slot.renter.daysRemaining = calculateDaysRemaining(slot.renter.endDate);
        }
        return slot;
    });
    res.json(updatedSlots);
});

app.post('/api/slots/:slotId/rent', (req, res) => {
    const { name, address, contact, startDate, endDate } = req.body;
    const slotId = parseInt(req.params.slotId);
    const permitNo = generatePermitNo();
    const daysRemaining = calculateDaysRemaining(endDate);
    
    const index = slots.findIndex(s => s.id === slotId);
    if (index !== -1 && currentUser?.role === 'admin') {
        slots[index].renter = {
            name, address, contact,
            businessPermitNo: permitNo,
            isOccupied: true,
            startDate, endDate,
            daysRemaining,
            penalty: 0,
            penaltyApplied: false,
            outstandingBalance: 0,
            lastPaymentDate: null
        };
        res.json(slots[index]);
    } else {
        res.status(403).json({ error: 'Unauthorized' });
    }
});

app.put('/api/slots/:slotId/edit', (req, res) => {
    const { name, address, contact, startDate, endDate } = req.body;
    const slotId = parseInt(req.params.slotId);
    const daysRemaining = calculateDaysRemaining(endDate);
    
    const index = slots.findIndex(s => s.id === slotId);
    if (index !== -1 && currentUser?.role === 'admin') {
        slots[index].renter.name = name;
        slots[index].renter.address = address;
        slots[index].renter.contact = contact;
        slots[index].renter.startDate = startDate;
        slots[index].renter.endDate = endDate;
        slots[index].renter.daysRemaining = daysRemaining;
        res.json(slots[index]);
    } else {
        res.status(403).json({ error: 'Unauthorized' });
    }
});

app.delete('/api/slots/:slotId/vacate', (req, res) => {
    const slotId = parseInt(req.params.slotId);
    const index = slots.findIndex(s => s.id === slotId);
    
    if (index !== -1 && currentUser?.role === 'admin') {
        slots[index].renter = {
            name: '', address: '', contact: '',
            businessPermitNo: '', isOccupied: false,
            startDate: null, endDate: null,
            daysRemaining: 0, penalty: 0,
            penaltyApplied: false, outstandingBalance: 0,
            lastPaymentDate: null
        };
        slots[index].assignedTo = null;
        res.json(slots[index]);
    } else {
        res.status(403).json({ error: 'Unauthorized' });
    }
});

// ========== PAYMENT API ==========
app.post('/api/payments', (req, res) => {
    const { slotId, amount, paymentMethod, orNumber } = req.body;
    const index = slots.findIndex(s => s.id === slotId);
    
    if (index !== -1) {
        const payment = {
            id: payments.length + 1,
            slotId: slotId,
            slotNumber: slots[index].slotNumber,
            renterName: slots[index].renter.name,
            amount: amount,
            paymentMethod: paymentMethod,
            orNumber: orNumber || 'OR-' + new Date().getTime(),
            date: new Date().toISOString()
        };
        payments.push(payment);
        
        const balance = (slots[index].renter.outstandingBalance || 0) - amount;
        slots[index].renter.outstandingBalance = balance > 0 ? balance : 0;
        slots[index].renter.lastPaymentDate = new Date().toISOString();
        
        res.json(payment);
    } else {
        res.status(404).json({ error: 'Slot not found' });
    }
});

app.get('/api/payments', (req, res) => {
    res.json(payments);
});

// ========== DASHBOARD API ==========
app.get('/api/dashboard', (req, res) => {
    const occupiedCount = slots.filter(s => s.renter.isOccupied).length;
    const vacantCount = slots.filter(s => !s.renter.isOccupied).length;
    const overdueCount = slots.filter(s => s.renter.isOccupied && s.renter.daysRemaining < 0).length;
    const totalPenalties = slots.reduce((sum, s) => sum + (s.renter.penalty || 0), 0);
    const totalOutstanding = slots.reduce((sum, s) => sum + (s.renter.outstandingBalance || 0), 0);
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    
    const monthlyIncome = {};
    payments.forEach(p => {
        const month = new Date(p.date).toLocaleString('default', { month: 'short' });
        monthlyIncome[month] = (monthlyIncome[month] || 0) + p.amount;
    });
    
    res.json({
        occupied: occupiedCount,
        vacant: vacantCount,
        overdue: overdueCount,
        totalPenalties: totalPenalties,
        totalOutstanding: totalOutstanding,
        totalCollected: totalCollected,
        monthlyIncome: monthlyIncome,
        monthlyRent: MONTHLY_RENT
    });
});

// ========== SMS REMINDER ==========
app.post('/api/send-reminder', (req, res) => {
    const { slotId } = req.body;
    const slot = slots.find(s => s.id === slotId);
    if (slot && slot.renter.isOccupied) {
        console.log('📱 Reminder sent to ' + slot.renter.contact);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Slot not found' });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log('========================================');
    console.log('  🏪 TRINIDAD PUBLIC MARKET SYSTEM');
    console.log('  Backend running on port ' + PORT);
    console.log('========================================');
    console.log('  ADMIN LOGIN:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('========================================');
    console.log('  ✅ Ready for registration!');
    console.log('========================================');
});
