import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function App() {
  const [slots, setSlots] = useState([]);
  const [payments, setPayments] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSlotForPayment, setSelectedSlotForPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedRegisterSlot, setSelectedRegisterSlot] = useState('');
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({ 
    username: '', password: '', confirmPassword: '',
    fullname: '', address: '', contact: '', email: ''
  });
  const [showReport, setShowReport] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('slots');
  const [formData, setFormData] = useState({ name: '', address: '', contact: '', startDate: '', endDate: '' });

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setShowLogin(false);
      fetchData(savedToken);
    }
    fetchAvailableSlots();
  }, []);

  const fetchAvailableSlots = async () => {
    try {
      const res = await axios.get(API_URL + '/available-slots');
      setAvailableSlots(res.data);
    } catch (error) { console.error(error); }
  };

  const fetchData = async (authToken) => {
    try {
      const res = await axios.get(API_URL + '/slots', { headers: { Authorization: Bearer  } });
      setSlots(res.data);
      const payRes = await axios.get(API_URL + '/payments');
      setPayments(payRes.data);
      const dashRes = await axios.get(API_URL + '/dashboard');
      setDashboard(dashRes.data);
    } catch (error) { console.error(error); }
  };

  const handleLogin = async () => {
    try {
      const res = await axios.post(API_URL + '/login', loginData);
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setToken(res.data.token);
        setUser(res.data.user);
        setShowLogin(false);
        fetchData(res.data.token);
      } else { alert('Invalid credentials'); }
    } catch (error) { alert('Login failed'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setShowLogin(true);
  };

  const handleRegister = async () => {
    if (registerData.password !== registerData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    try {
      const res = await axios.post(API_URL + '/register', {
        username: registerData.username,
        password: registerData.password,
        fullname: registerData.fullname,
        address: registerData.address,
        contact: registerData.contact,
        email: registerData.email,
        selectedSlot: selectedRegisterSlot
      });
      if (res.data.success) {
        alert('Registration successful! You can now login.');
        setShowRegister(false);
        setSelectedRegisterSlot('');
        setRegisterData({ username: '', password: '', confirmPassword: '', fullname: '', address: '', contact: '', email: '' });
        fetchAvailableSlots();
      } else { alert(res.data.message); }
    } catch (error) { alert('Registration failed'); }
  };

  const generateTextReport = () => {
    let report = 'TRINIDAD PUBLIC MARKET REPORT\n';
    report += 'Date: ' + new Date().toLocaleString() + '\n\n';
    slots.forEach(slot => {
      report += 'Slot #' + slot.slotNumber + ': ';
      report += slot.renter.isOccupied ? 'OCCUPIED - ' + slot.renter.name : 'VACANT';
      report += '\n';
    });
    const blob = new Blob([report], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'market-report.txt';
    link.click();
  };

  const generateHTMLReport = () => setShowReport(true);
  const closeReport = () => setShowReport(false);
  const printReport = () => window.print();

  const sendReminder = async (slotId) => {
    await axios.post(API_URL + '/send-reminder', { slotId });
    alert('Reminder sent!');
  };

  const handleEdit = (slot) => {
    setEditingSlot(slot);
    setFormData({
      name: slot.renter.name,
      address: slot.renter.address,
      contact: slot.renter.contact,
      startDate: slot.renter.startDate || '',
      endDate: slot.renter.endDate || '',
    });
  };

  const handleSave = async () => {
    try {
      if (editingSlot.renter.isOccupied) {
        await axios.put(API_URL + '/slots/' + editingSlot.id + '/edit', formData, {
          headers: { Authorization: Bearer  }
        });
      } else {
        await axios.post(API_URL + '/slots/' + editingSlot.id + '/rent', formData, {
          headers: { Authorization: Bearer  }
        });
      }
      fetchData(token);
      setEditingSlot(null);
      alert('Saved!');
    } catch (error) { alert('Error saving'); }
  };

  const handleVacate = async (slotId) => {
    if (window.confirm('Vacate this slot?')) {
      await axios.delete(API_URL + '/slots/' + slotId + '/vacate', {
        headers: { Authorization: Bearer  }
      });
      fetchData(token);
      alert('Slot vacated');
    }
  };

  const handlePayment = async () => {
    if (!paymentAmount || paymentAmount <= 0) { alert('Enter amount'); return; }
    try {
      await axios.post(API_URL + '/payments', {
        slotId: selectedSlotForPayment.id,
        amount: parseFloat(paymentAmount),
        paymentMethod: paymentMethod
      });
      alert('Payment recorded!');
      setShowPaymentModal(false);
      setPaymentAmount('');
      fetchData(token);
    } catch (error) { alert('Payment failed'); }
  };

  if (showLogin && !showRegister) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>🏪 Trinidad Public Market</h1>
          <h2>Stall Management System</h2>
          <input type="text" placeholder="Username" value={loginData.username} onChange={e => setLoginData({...loginData, username: e.target.value})} />
          <input type="password" placeholder="Password" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} onKeyPress={e => e.key === 'Enter' && handleLogin()} />
          <button onClick={handleLogin}>Login</button>
          <button className="register-link-btn" onClick={() => setShowRegister(true)}>Create New Account</button>
        </div>
      </div>
    );
  }

  if (showRegister) {
    return (
      <div className="login-page">
        <div className="login-card register-card">
          <h1>🏪 Create Account</h1>
          <h2>Choose your slot</h2>
          <select value={selectedRegisterSlot} onChange={e => setSelectedRegisterSlot(e.target.value)}>
            <option value="">-- Select a Slot --</option>
            {availableSlots.map(slot => (
              <option key={slot.id} value={slot.slotNumber}>Slot #{slot.slotNumber} - AVAILABLE</option>
            ))}
          </select>
          <input type="text" placeholder="Username" value={registerData.username} onChange={e => setRegisterData({...registerData, username: e.target.value})} />
          <input type="password" placeholder="Password" value={registerData.password} onChange={e => setRegisterData({...registerData, password: e.target.value})} />
          <input type="password" placeholder="Confirm Password" value={registerData.confirmPassword} onChange={e => setRegisterData({...registerData, confirmPassword: e.target.value})} />
          <input type="text" placeholder="Full Name" value={registerData.fullname} onChange={e => setRegisterData({...registerData, fullname: e.target.value})} />
          <input type="text" placeholder="Address" value={registerData.address} onChange={e => setRegisterData({...registerData, address: e.target.value})} />
          <input type="text" placeholder="Contact Number" value={registerData.contact} onChange={e => setRegisterData({...registerData, contact: e.target.value})} />
          <input type="email" placeholder="Email" value={registerData.email} onChange={e => setRegisterData({...registerData, email: e.target.value})} />
          <button onClick={handleRegister}>Register</button>
          <button className="register-link-btn" onClick={() => setShowRegister(false)}>Back to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <h1>🏪 Trinidad Public Market</h1>
        <h2>Stall Management System</h2>
        <p>Trinidad, Bohol - 10 Slots | Monthly Rent: ₱1000</p>
        <div className="user-bar">
          <span>👤 {user?.username} ({user?.role})</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="tabs">
        <button className={activeTab === 'slots' ? 'active' : ''} onClick={() => setActiveTab('slots')}>Slots</button>
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
        <button className={activeTab === 'payments' ? 'active' : ''} onClick={() => setActiveTab('payments')}>Payments</button>
      </div>

      {activeTab === 'slots' && (
        <>
          <div className="search-section">
            <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Slot</th><th>Status</th><th>Renter</th><th>Permit</th><th>Period</th><th>Balance</th><th>Actions</th></tr></thead>
              <tbody>
                {slots.filter(s => s.renter.name.includes(searchTerm)).map(slot => (
                  <tr key={slot.id}>
                    <td>{slot.slotNumber}</td>
                    <td>{slot.renter.isOccupied ? 'Occupied' : 'Vacant'}</td>
                    <td>{slot.renter.name || '-'}</td>
                    <td>{slot.renter.businessPermitNo || '-'}</td>
                    <td>{slot.renter.startDate || '-'} → {slot.renter.endDate || '-'}</td>
                    <td>₱{slot.renter.outstandingBalance || 0}</td>
                    <td>
                      {slot.renter.isOccupied ? (
                        <>
                          <button onClick={() => handleEdit(slot)}>Edit</button>
                          <button onClick={() => { setSelectedSlotForPayment(slot); setShowPaymentModal(true); }}>Pay</button>
                          {user?.role === 'admin' && <button onClick={() => handleVacate(slot.id)}>Vacate</button>}
                        </>
                      ) : (
                        <button onClick={() => handleEdit(slot)}>Add Renter</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'dashboard' && dashboard && (
        <div>
          <h3>Dashboard</h3>
          <p>Occupied: {dashboard.occupied}</p>
          <p>Vacant: {dashboard.vacant}</p>
          <p>Collected: ₱{dashboard.totalCollected}</p>
        </div>
      )}

      {activeTab === 'payments' && (
        <div>
          <h3>Payments</h3>
          <table className="payments-table">
            <thead><tr><th>Date</th><th>Slot</th><th>Renter</th><th>Amount</th><th>Method</th></tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}><td>{new Date(p.date).toLocaleDateString()}</td><td>#{p.slotNumber}</td><td>{p.renterName}</td><td>₱{p.amount}</td><td>{p.paymentMethod}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingSlot && (
        <div className="modal">
          <div className="modal-content">
            <h3>{editingSlot.renter.isOccupied ? 'Edit' : 'Add'} Renter</h3>
            <input placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <input placeholder="Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            <input placeholder="Contact" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
            <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
            <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
            <button onClick={handleSave}>Save</button>
            <button onClick={() => setEditingSlot(null)}>Cancel</button>
          </div>
        </div>
      )}

      {showPaymentModal && selectedSlotForPayment && (
        <div className="modal">
          <div className="modal-content">
            <h3>Payment for Slot #{selectedSlotForPayment.slotNumber}</h3>
            <input type="number" placeholder="Amount" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option>Cash</option><option>GCash</option><option>Bank Transfer</option>
            </select>
            <button onClick={handlePayment}>Pay</button>
            <button onClick={() => setShowPaymentModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {showReport && (
        <div className="modal">
          <div className="modal-content">
            <h3>Report</h3>
            <pre>{JSON.stringify(slots, null, 2)}</pre>
            <button onClick={printReport}>Print</button>
            <button onClick={closeReport}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
