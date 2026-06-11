const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = 'trinidad-market-secret-2026';
const MONTHLY_RENT = 1000;

// ========== DATA ==========
let users = [
    { id: 1, username: 'admin', password: 'admin123', role: 'admin' },
    { id: 2, username: 'tenant1', password: 'tenant123', role: 'tenant', slotId: 1 },
    { id: 3, username: 'tenant2', password: 'tenant123', role: 'tenant', slotId: 2 }
];

let slots = [];
let payments = [];
let nextUserId = 4;
let nextPaymentId = 1;

// Initialize 10 slots
for (let i = 1; i <= 10; i++) {
    slots.push({
        id: i,
        slotNumber: i,
        monthlyRent: MONTHLY_RENT,
        assignedTo: null,
        renter: {
            name: '', address: '', contact: '', businessPermitNo: '', isOccupied: false,
            startDate: null, endDate: null, daysRemaining: 0, penalty: 0,
            penaltyApplied: false, outstandingBalance: 0, lastPaymentDate: null
        }
    });
}

// Sample occupied slot
slots[0].renter = {
    name: 'Juan Dela Cruz', address: 'Poblacion, Trinidad, Bohol', contact: '09123456789',
    businessPermitNo: 'BP-2026-1001', isOccupied: true, startDate: '2026-06-01',
    endDate: '2026-06-30', daysRemaining: 19, penalty: 0, penaltyApplied: false,
    outstandingBalance: 0, lastPaymentDate: null
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
    const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return diffDays;
}

function generateReceiptNumber() {
    return 'RCP-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

// ========== MIDDLEWARE ==========
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        req.user = null;
        return next();
    }
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) req.user = null;
        else req.user = user;
        next();
    });
}

// ========== AUTH API ==========
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, slotId: user.slotId },
            SECRET_KEY,
            { expiresIn: '24h' }
        );
        res.json({ 
            success: true, 
            token,
            user: { id: user.id, username: user.username, role: user.role, slotId: user.slotId }
        });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.post('/api/logout', (req, res) => {
    res.json({ success: true });
});

app.get('/api/current-user', authenticateToken, (req, res) => {
    res.json(req.user || null);
});

app.post('/api/register', (req, res) => {
    const { username, password, fullname, address, contact, email, selectedSlot } = req.body;
    
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ success: false, message: 'Username already exists' });
    }
    
    const slot = slots.find(s => s.slotNumber === parseInt(selectedSlot));
    if (!slot || slot.renter.isOccupied) {
        return res.status(400).json({ success: false, message: 'Slot not available' });
    }
    
    const newUser = {
        id: nextUserId++, username, password, role: 'tenant',
        email: email || '', fullname: fullname || username,
        address: address || '', contact: contact || '',
        slotId: slot.slotNumber, createdAt: new Date().toISOString()
    };
    users.push(newUser);
    
    const permitNo = generatePermitNo();
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    
    slot.renter = {
        name: fullname || username, address: address || '', contact: contact || '',
        businessPermitNo: permitNo, isOccupied: true,
        startDate: startDate, endDate: endDate.toISOString().split('T')[0],
        daysRemaining: 30, penalty: 0, penaltyApplied: false,
        outstandingBalance: 0, lastPaymentDate: null
    };
    slot.assignedTo = username;
    
    res.json({ success: true, message: 'Registration successful!', username, slotNumber: slot.slotNumber, permitNo });
});

// ========== SLOTS API ==========
app.get('/api/slots', authenticateToken, (req, res) => {
    let filteredSlots = slots;
    
    // IMPORTANT: Tenant can only see their own slot
    if (req.user && req.user.role === 'tenant' && req.user.slotId) {
        filteredSlots = slots.filter(s => s.slotNumber === req.user.slotId);
    }
    // Admin sees all slots (no filtering)
    
    const updatedSlots = filteredSlots.map(slot => {
        if (slot.renter.isOccupied && slot.renter.endDate) {
            slot.renter.daysRemaining = calculateDaysRemaining(slot.renter.endDate);
        }
        return slot;
    });
    res.json(updatedSlots);
});

app.get('/api/available-slots', (req, res) => {
    res.json(slots.filter(s => !s.renter.isOccupied));
});

app.post('/api/slots/:slotId/rent', authenticateToken, (req, res) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized - Admin only' });
    }
    
    const { name, address, contact, startDate, endDate } = req.body;
    const slotId = parseInt(req.params.slotId);
    const index = slots.findIndex(s => s.id === slotId);
    
    if (index !== -1) {
        slots[index].renter = {
            name, address, contact, businessPermitNo: generatePermitNo(), isOccupied: true,
            startDate, endDate, daysRemaining: calculateDaysRemaining(endDate),
            penalty: 0, penaltyApplied: false, outstandingBalance: 0, lastPaymentDate: null
        };
        res.json(slots[index]);
    } else {
        res.status(404).json({ error: 'Slot not found' });
    }
});

app.put('/api/slots/:slotId/edit', authenticateToken, (req, res) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized - Admin only' });
    }
    
    const { name, address, contact, startDate, endDate } = req.body;
    const slotId = parseInt(req.params.slotId);
    const index = slots.findIndex(s => s.id === slotId);
    
    if (index !== -1) {
        slots[index].renter.name = name;
        slots[index].renter.address = address;
        slots[index].renter.contact = contact;
        slots[index].renter.startDate = startDate;
        slots[index].renter.endDate = endDate;
        slots[index].renter.daysRemaining = calculateDaysRemaining(endDate);
        res.json(slots[index]);
    } else {
        res.status(404).json({ error: 'Slot not found' });
    }
});

app.delete('/api/slots/:slotId/vacate', authenticateToken, (req, res) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized - Admin only' });
    }
    
    const slotId = parseInt(req.params.slotId);
    const index = slots.findIndex(s => s.id === slotId);
    
    if (index !== -1) {
        slots[index].renter = {
            name: '', address: '', contact: '', businessPermitNo: '', isOccupied: false,
            startDate: null, endDate: null, daysRemaining: 0, penalty: 0,
            penaltyApplied: false, outstandingBalance: 0, lastPaymentDate: null
        };
        slots[index].assignedTo = null;
        res.json(slots[index]);
    } else {
        res.status(404).json({ error: 'Slot not found' });
    }
});

// ========== PAYMENT API ==========
app.post('/api/payments', authenticateToken, (req, res) => {
    const { slotId, amount, paymentMethod } = req.body;
    const index = slots.findIndex(s => s.id === slotId);
    
    if (index !== -1) {
        const orNumber = generateReceiptNumber();
        const payment = {
            id: nextPaymentId++, slotId, slotNumber: slots[index].slotNumber,
            renterName: slots[index].renter.name, amount, paymentMethod, orNumber, date: new Date().toISOString()
        };
        payments.push(payment);
        const balance = (slots[index].renter.outstandingBalance || 0) - amount;
        slots[index].renter.outstandingBalance = balance > 0 ? balance : 0;
        slots[index].renter.lastPaymentDate = new Date().toISOString();
        res.json({ success: true, payment, receipt: { orNumber, amount, date: payment.date, renter: slots[index].renter.name, slotNumber: slots[index].slotNumber } });
    } else {
        res.status(404).json({ error: 'Slot not found' });
    }
});

app.get('/api/payments', (req, res) => { res.json(payments); });

// ========== DASHBOARD API ==========
app.get('/api/dashboard', (req, res) => {
    const occupied = slots.filter(s => s.renter.isOccupied).length;
    const vacant = slots.filter(s => !s.renter.isOccupied).length;
    const overdue = slots.filter(s => s.renter.isOccupied && calculateDaysRemaining(s.renter.endDate) < 0).length;
    const penalties = slots.reduce((sum, s) => sum + (s.renter.penalty || 0), 0);
    const outstanding = slots.reduce((sum, s) => sum + (s.renter.outstandingBalance || 0), 0);
    const collected = payments.reduce((sum, p) => sum + p.amount, 0);
    const monthlyIncome = {};
    payments.forEach(p => {
        const month = new Date(p.date).toLocaleString('default', { month: 'short' });
        monthlyIncome[month] = (monthlyIncome[month] || 0) + p.amount;
    });
    res.json({ occupied, vacant, overdue, totalPenalties: penalties, totalOutstanding: outstanding, totalCollected: collected, monthlyIncome, monthlyRent: MONTHLY_RENT });
});

// ========== SMS REMINDER ==========
app.post('/api/send-reminder', (req, res) => {
    const { slotId } = req.body;
    const slot = slots.find(s => s.id === slotId);
    if (slot && slot.renter.isOccupied) {
        console.log('SMS sent to ' + slot.renter.contact);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Slot not found' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('========================================');
    console.log('  TRINIDAD PUBLIC MARKET SYSTEM');
    console.log('  Backend running on port ' + PORT);
    console.log('========================================');
    console.log('  Admin: admin / admin123');
    console.log('  Tenant: tenant1 / tenant123');
    console.log('========================================');
});
