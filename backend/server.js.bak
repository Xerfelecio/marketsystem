const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// ========== EMAIL CONFIGURATION (GMAIL) ==========
// IMPORTANT: Replace with your actual Gmail credentials
// For Gmail, you need to use an "App Password" not your regular password
// Go to: Google Account > Security > 2-Step Verification > App Passwords
const EMAIL_USER = 'your_email@gmail.com';  // CHANGE THIS
const EMAIL_PASS = 'your_app_password';     // CHANGE THIS

let transporter = null;

function setupEmail() {
    if (EMAIL_USER !== 'your_email@gmail.com' && EMAIL_PASS !== 'your_app_password') {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: EMAIL_USER, pass: EMAIL_PASS }
        });
        console.log('========================================');
        console.log('  EMAIL CONFIGURED: Gmail');
        console.log('  Sending from: ' + EMAIL_USER);
        console.log('========================================');
    } else {
        // Use Ethereal for testing if no Gmail configured
        setupEthereal();
    }
}

async function setupEthereal() {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass }
    });
    console.log('========================================');
    console.log('  ETHEREAL TEST ACCOUNT (fake email)');
    console.log('  Email: ' + testAccount.user);
    console.log('  Password: ' + testAccount.pass);
    console.log('  View emails: https://ethereal.email/login');
    console.log('========================================');
}

setupEmail();

// ========== STORAGE ==========
const resetTokens = [];
const MONTHLY_RENT = 1000;

let users = [
    { id: 1, username: 'admin', password: 'admin123', role: 'admin', email: 'admin@trinidadmarket.com', fullname: 'Administrator', slotId: null },
    { id: 2, username: 'tenant1', password: 'tenant123', role: 'tenant', email: 'tenant1@example.com', fullname: 'Juan Dela Cruz', slotId: 1 }
];

let currentUser = null;
let slots = [];
let payments = [];
let nextUserId = 3;
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
    endDate: '2026-06-30', daysRemaining: 24, penalty: 0, penaltyApplied: false,
    outstandingBalance: 0, lastPaymentDate: null
};

payments.push({
    id: nextPaymentId++, slotId: 1, slotNumber: 1, renterName: 'Juan Dela Cruz',
    amount: 1000, paymentMethod: 'Cash', orNumber: 'RCP-2026-0001', date: new Date().toISOString()
});

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

function generateResetCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmail(to, subject, htmlContent) {
    if (!transporter) return false;
    try {
        const info = await transporter.sendMail({
            from: '"Trinidad Public Market" <noreply@trinidadmarket.com>',
            to: to,
            subject: subject,
            html: htmlContent
        });
        console.log('Email sent to: ' + to);
        if (info.messageId) console.log('Message ID: ' + info.messageId);
        return true;
    } catch (error) {
        console.error('Email error:', error.message);
        return false;
    }
}

// ========== API ENDPOINTS ==========
app.get('/api/current-user', (req, res) => { res.json(currentUser); });

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        currentUser = { id: user.id, username: user.username, role: user.role, slotId: user.slotId };
        res.json({ success: true, user: currentUser });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.post('/api/logout', (req, res) => {
    currentUser = null;
    res.json({ success: true });
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

// ========== FORGOT PASSWORD ==========
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    console.log('Forgot password request for:', email);
    
    const user = users.find(u => u.email === email);
    if (!user) {
        return res.status(404).json({ success: false, message: 'Email not found' });
    }
    
    const code = generateResetCode();
    const expires = Date.now() + 3600000;
    
    resetTokens.push({ email, code, expires });
    
    // Clean expired tokens
    for (let i = resetTokens.length - 1; i >= 0; i--) {
        if (resetTokens[i].expires < Date.now()) resetTokens.splice(i, 1);
    }
    
    const html = '<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">' +
        '<h2 style="color: #2d5a2c;">Password Reset Request</h2>' +
        '<p>Dear ' + (user.fullname || user.username) + ',</p>' +
        '<p>We received a request to reset your password.</p>' +
        '<p>Your password reset code is:</p>' +
        '<div style="background: #f0f7f0; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 8px;">' + code + '</div>' +
        '<p>This code will expire in <strong>1 hour</strong>.</p>' +
        '<p>If you did not request this, please ignore this email.</p>' +
        '<hr>' +
        '<p style="font-size: 12px; color: #666;">Trinidad Public Market</p>' +
        '</div>';
    
    const sent = await sendEmail(email, 'Password Reset Code - Trinidad Public Market', html);
    
    if (sent) {
        res.json({ success: true, message: 'Reset code sent to your email' });
    } else {
        res.status(500).json({ success: false, message: 'Failed to send email. Please check email configuration.' });
    }
});

app.post('/api/reset-password', (req, res) => {
    const { email, code, newPassword } = req.body;
    console.log('Reset password attempt for:', email);
    
    const token = resetTokens.find(t => t.email === email && t.code === code && t.expires > Date.now());
    if (!token) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset code' });
    }
    
    const user = users.find(u => u.email === email);
    if (user) {
        user.password = newPassword;
        const index = resetTokens.findIndex(t => t.email === email && t.code === code);
        if (index !== -1) resetTokens.splice(index, 1);
        
        res.json({ success: true, message: 'Password reset successful! You can now login.' });
    } else {
        res.status(404).json({ success: false, message: 'User not found' });
    }
});

// ========== SLOTS API ==========
app.get('/api/slots', (req, res) => {
    let filtered = slots;
    if (currentUser && currentUser.role === 'tenant' && currentUser.slotId) {
        filtered = slots.filter(s => s.slotNumber === currentUser.slotId);
    }
    res.json(filtered);
});

app.get('/api/available-slots', (req, res) => {
    res.json(slots.filter(s => !s.renter.isOccupied));
});

app.post('/api/slots/:slotId/rent', (req, res) => {
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

app.put('/api/slots/:slotId/edit', (req, res) => {
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

app.delete('/api/slots/:slotId/vacate', (req, res) => {
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
app.post('/api/payments', (req, res) => {
    const { slotId, amount, paymentMethod } = req.body;
    const index = slots.findIndex(s => s.id === slotId);
    if (index !== -1) {
        const orNumber = 'RCP-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 10000)).padStart(4, '0');
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

const PORT = 5000;
app.listen(PORT, () => {
    console.log('========================================');
    console.log('  TRINIDAD PUBLIC MARKET SYSTEM');
    console.log('  Backend running on port ' + PORT);
    console.log('========================================');
    console.log('  LOGIN CREDENTIALS:');
    console.log('  Admin: admin / admin123');
    console.log('  Tenant: tenant1 / tenant123');
    console.log('========================================');
});

