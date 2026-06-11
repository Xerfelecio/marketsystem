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
      fetchAvailableSlots();
    } else {
      setShowLogin(true);
      fetchAvailableSlots();
    }
  }, []);

  const fetchAvailableSlots = async () => {
    try {
      const res = await axios.get(API_URL + '/available-slots');
      setAvailableSlots(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchData = async (authToken) => {
    await Promise.all([fetchSlots(authToken), fetchPayments(authToken), fetchDashboard(authToken)]);
  };

  const fetchSlots = async (authToken) => {
    try {
      const res = await axios.get(API_URL + '/slots', {
        headers: { Authorization: Bearer  }
      });
      setSlots(res.data);
      checkDueDates(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchPayments = async (authToken) => {
    try {
      const res = await axios.get(API_URL + '/payments');
      setPayments(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchDashboard = async (authToken) => {
    try {
      const res = await axios.get(API_URL + '/dashboard');
      setDashboard(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const checkDueDates = (slotsData) => {
    const due = [];
    slotsData.forEach(slot => {
      if (slot.renter.isOccupied && slot.renter.daysRemaining <= 3 && slot.renter.daysRemaining > 0) {
        due.push({ id: slot.id, message: slot.renter.name + ' - Rent due in ' + slot.renter.daysRemaining + ' days!' });
      } else if (slot.renter.isOccupied && slot.renter.daysRemaining < 0) {
        const penalty = Math.abs(slot.renter.daysRemaining) * 50;
        due.push({ id: slot.id, message: slot.renter.name + ' - OVERDUE! Penalty: ₱' + penalty });
      }
    });
    setNotifications(due);
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
      } else {
        alert('Invalid credentials');
      }
    } catch (error) {
      alert('Login failed');
    }
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
    if (!registerData.username || !registerData.password || !registerData.fullname || !selectedRegisterSlot) {
      alert('Please fill in all required fields and select a slot');
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
      } else {
        alert(res.data.message);
      }
    } catch (error) {
      alert('Registration failed');
    }
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
      fetchSlots(token);
      setEditingSlot(null);
      setFormData({ name: '', address: '', contact: '', startDate: '', endDate: '' });
      alert('Saved successfully!');
    } catch (error) {
      alert('Error saving');
    }
  };

  const handleVacate = async (slotId) => {
    if (window.confirm('Vacate this slot?')) {
      await axios.delete(API_URL + '/slots/' + slotId + '/vacate', {
        headers: { Authorization: Bearer  }
      });
      fetchSlots(token);
      alert('Slot vacated');
    }
  };

  const handlePayment = async () => {
    if (!paymentAmount || paymentAmount <= 0) {
      alert('Enter valid amount');
      return;
    }
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
    } catch (error) {
      alert('Payment failed');
    }
  };

  const sendReminder = async (slotId) => {
    await axios.post(API_URL + '/send-reminder', { slotId });
    alert('Reminder sent!');
  };

  const generateTextReport = () => {
    let report = 'TRINIDAD PUBLIC MARKET - STALL REPORT\n';
    report += '='.repeat(50) + '\n';
    report += 'Date Generated: ' + new Date().toLocaleString() + '\n\n';
    report += 'SUMMARY\n';
    report += 'Total Slots: 10\n';
    report += 'Occupied: ' + slots.filter(s => s.renter.isOccupied).length + '\n';
    report += 'Vacant: ' + slots.filter(s => !s.renter.isOccupied).length + '\n\n';
    report += 'SLOT DETAILS\n';
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
    URL.revokeObjectURL(link.href);
  };

  const generateHTMLReport = () => { setShowReport(true); };
  const closeReport = () => { setShowReport(false); };
  const printReport = () => { window.print(); };

  const filteredSlots = slots.filter(slot =>
    slot.renter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    slot.slotNumber.toString().includes(searchTerm) ||
    (slot.renter.businessPermitNo || '').includes(searchTerm)
  );

  const occupiedCount = slots.filter(s => s.renter.isOccupied).length;
  const vacantCount = slots.filter(s => !s.renter.isOccupied).length;
  const overdueCount = slots.filter(s => s.renter.isOccupied && s.renter.daysRemaining < 0).length;
  const totalCollected = dashboard?.totalCollected || 0;
  const totalPenalties = dashboard?.totalPenalties || 0;

  const getStatusClass = (slot) => {
    if (!slot.renter.isOccupied) return 'status-vacant';
    if (slot.renter.daysRemaining < 0) return 'status-overdue';
    if (slot.renter.daysRemaining <= 7) return 'status-warning';
    return 'status-occupied';
  };

  const getStatusText = (slot) => {
    if (!slot.renter.isOccupied) return 'VACANT';
    if (slot.renter.daysRemaining < 0) return 'OVERDUE';
    if (slot.renter.daysRemaining <= 7) return 'DUE SOON';
    return 'OCCUPIED';
  };

  // LOGIN PAGE
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

  // REGISTER PAGE
  if (showRegister) {
    return (
      <div className="login-page">
        <div className="login-card register-card">
          <h1>🏪 Create Account</h1>
          <h2>Choose your slot</h2>
          <select value={selectedRegisterSlot} onChange={e => setSelectedRegisterSlot(e.target.value)} className="slot-select">
            <option value="">-- Select a Slot --</option>
            {availableSlots.map(slot => (
              <option key={slot.id} value={slot.slotNumber}>Slot #{slot.slotNumber} - AVAILABLE</option>
            ))}
          </select>
          <input type="text" placeholder="Username *" value={registerData.username} onChange={e => setRegisterData({...registerData, username: e.target.value})} />
          <input type="password" placeholder="Password *" value={registerData.password} onChange={e => setRegisterData({...registerData, password: e.target.value})} />
          <input type="password" placeholder="Confirm Password *" value={registerData.confirmPassword} onChange={e => setRegisterData({...registerData, confirmPassword: e.target.value})} />
          <input type="text" placeholder="Full Name *" value={registerData.fullname} onChange={e => setRegisterData({...registerData, fullname: e.target.value})} />
          <input type="text" placeholder="Address" value={registerData.address} onChange={e => setRegisterData({...registerData, address: e.target.value})} />
          <input type="text" placeholder="Contact Number" value={registerData.contact} onChange={e => setRegisterData({...registerData, contact: e.target.value})} />
          <input type="email" placeholder="Email (optional)" value={registerData.email} onChange={e => setRegisterData({...registerData, email: e.target.value})} />
          <button onClick={handleRegister}>Register</button>
          <button className="register-link-btn" onClick={() => setShowRegister(false)}>Back to Login</button>
        </div>
      </div>
    );
  }

  // MAIN APP
  return (
    <div className="app">
      <div className="header">
        <h1>🏪 Trinidad Public Market</h1>
        <h2>Stall Management System</h2>
        <p>Trinidad, Bohol - 10 Slots | Monthly Rent: ₱{dashboard?.monthlyRent || 1000}</p>
        <div className="user-bar">
          <span className="user-info">👤 {user?.username} ({user?.role})</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="report-bar">
        <button className="btn-report btn-text" onClick={generateTextReport}>📄 Generate Text Report</button>
        <button className="btn-report btn-html" onClick={generateHTMLReport}>📊 View HTML Report</button>
      </div>

      <div className="tabs">
        <button className={activeTab === 'slots' ? 'tab active' : 'tab'} onClick={() => setActiveTab('slots')}>Slots</button>
        <button className={activeTab === 'dashboard' ? 'tab active' : 'tab'} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
        <button className={activeTab === 'payments' ? 'tab active' : 'tab'} onClick={() => setActiveTab('payments')}>Payments</button>
      </div>

      {activeTab === 'slots' && (
        <>
          <div className="search-section">
            <span className="search-label">🔍 Search by name, slot #, or permit no...</span>
            <input className="search-input" type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>

          <div className="stats-row">
            <div className="stat-card"><h4>TOTAL SLOTS</h4><div className="stat-number">10</div></div>
            <div className="stat-card"><h4>OCCUPIED</h4><div className="stat-number">{occupiedCount}</div></div>
            <div className="stat-card"><h4>VACANT</h4><div className="stat-number">{vacantCount}</div></div>
            <div className="stat-card"><h4>OVERDUE</h4><div className="stat-number">{overdueCount}</div></div>
            <div className="stat-card"><h4>COLLECTED</h4><div className="stat-number">₱{totalCollected}</div></div>
            <div className="stat-card"><h4>PENALTIES</h4><div className="stat-number">₱{totalPenalties}</div></div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Slot #</th><th>Status</th><th>Renter Information</th><th>Permit No.</th><th>Rental Period</th><th>Balance</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filteredSlots.map(slot => (
                  <tr key={slot.id}>
                    <td><strong>#{slot.slotNumber}</strong></td>
                    <td><span className={'status ' + getStatusClass(slot)}>{getStatusText(slot)}</span></td>
                    <td>
                      {slot.renter.isOccupied ? (
                        <>
                          <div className="renter-name">{slot.renter.name}</div>
                          <div className="renter-address">{slot.renter.address}</div>
                          <div className="renter-contact">{slot.renter.contact}</div>
                        </>
                      ) : '—'}
                    </td>
                    <td>{slot.renter.businessPermitNo ? <span className="permit">{slot.renter.businessPermitNo}</span> : '—'}</td>
                    <td>{slot.renter.isOccupied ? (slot.renter.startDate || '-') + ' → ' + (slot.renter.endDate || '-') : '—'}</td>
                    <td className={slot.renter.outstandingBalance > 0 ? 'balance-due' : 'balance-paid'}>₱{slot.renter.outstandingBalance || 0}</td>
                    <td className="actions">
                      {slot.renter.isOccupied ? (
                        <>
                          <button className="btn-action btn-edit" onClick={() => handleEdit(slot)}>Edit</button>
                          <button className="btn-action btn-pay" onClick={() => { setSelectedSlotForPayment(slot); setShowPaymentModal(true); }}>Pay</button>
                          <button className="btn-action btn-remind" onClick={() => sendReminder(slot.id)}>Remind</button>
                          {user?.role === 'admin' && <button className="btn-action btn-vacate" onClick={() => handleVacate(slot.id)}>Vacate</button>}
                        </>
                      ) : (
                        <button className="btn-action btn-add" onClick={() => handleEdit(slot)}>+ Add Renter</button>
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
        <div className="dashboard-container">
          <div className="dashboard-header">Dashboard Overview</div>
          <div className="dashboard-stats">
            <div className="dashboard-stat-card"><h4>Total Slots</h4><div className="dashboard-stat-number">10</div></div>
            <div className="dashboard-stat-card"><h4>Occupied</h4><div className="dashboard-stat-number">{dashboard.occupied}</div></div>
            <div className="dashboard-stat-card"><h4>Vacant</h4><div className="dashboard-stat-number">{dashboard.vacant}</div></div>
            <div className="dashboard-stat-card"><h4>Overdue</h4><div className="dashboard-stat-number">{dashboard.overdue}</div></div>
            <div className="dashboard-stat-card"><h4>Collected</h4><div className="dashboard-stat-number">₱{dashboard.totalCollected}</div></div>
            <div className="dashboard-stat-card"><h4>Penalties</h4><div className="dashboard-stat-number">₱{dashboard.totalPenalties}</div></div>
          </div>
          <div className="dashboard-two-col">
            <div className="income-section"><h3>Monthly Income</h3><div className="income-amount">₱{dashboard.totalCollected || 0}</div><div className="income-month">{new Date().toLocaleString('default', { month: 'short' })}</div></div>
            <div className="summary-section"><h3>Quick Summary</h3>
              <div className="summary-item"><span className="summary-label">Total Collected:</span><span className="summary-value">₱{dashboard.totalCollected}</span></div>
              <div className="summary-item"><span className="summary-label">Total Penalties:</span><span className="summary-value">₱{dashboard.totalPenalties}</span></div>
              <div className="summary-item"><span className="summary-label">Outstanding Balance:</span><span className="summary-value">₱{dashboard.totalOutstanding}</span></div>
              <div className="summary-item"><span className="summary-label">Occupancy Rate:</span><span className="summary-value">{(dashboard.occupied / 10 * 100).toFixed(0)}%</span></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="payments-container">
          <div className="payments-header">Payment History</div>
          <table className="payments-table">
            <thead>
              <tr><th>Date</th><th>Slot #</th><th>Renter Name</th><th>Amount</th><th>Method</th><th>OR Number</th></tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan="6" style={{textAlign: 'center', padding: '30px'}}>No payments recorded yet</td></tr>
              ) : (
                payments.map(p => (
                  <tr key={p.id}>
                    <td>{new Date(p.date).toLocaleDateString()}</td>
                    <td>#{p.slotNumber}</td>
                    <td>{p.renterName}</td>
                    <td className="amount-paid">₱{p.amount}</td>
                    <td>{p.paymentMethod}</td>
                    <td><code>{p.orNumber}</code></td>
                  </table>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingSlot && (
        <div className="modal-overlay" onClick={() => setEditingSlot(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>{editingSlot.renter.isOccupied ? 'Edit Renter' : 'Add New Renter'} - Slot #{editingSlot.slotNumber}</h3></div>
            <div className="modal-body">
              <input placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input placeholder="Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              <input placeholder="Contact No." value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
              <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
              <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
            </div>
            <div className="modal-footer">
              <button className="btn-save" onClick={handleSave}>Save</button>
              <button className="btn-cancel" onClick={() => setEditingSlot(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && selectedSlotForPayment && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>💰 Payment - Slot #{selectedSlotForPayment.slotNumber}</h3></div>
            <div className="modal-body">
              <p><strong>Renter:</strong> {selectedSlotForPayment.renter.name}</p>
              <p><strong>Outstanding:</strong> ₱{selectedSlotForPayment.renter.outstandingBalance || 0}</p>
              <input type="number" placeholder="Amount" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option>Cash</option><option>GCash</option><option>Bank Transfer</option>
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn-save" onClick={handlePayment}>Process Payment</button>
              <button className="btn-cancel" onClick={() => setShowPaymentModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showReport && (
        <div className="modal-overlay" onClick={closeReport}>
          <div className="modal-box report-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>📄 Market Stall Report</h3></div>
            <div className="modal-body">
              <p><strong>Date Generated:</strong> {new Date().toLocaleString()}</p>
              <h4>Summary</h4>
              <table className="report-table"><thead><tr><th>Total Slots</th><th>Occupied</th><th>Vacant</th><th>Occupancy Rate</th></tr></thead><tbody><tr><td style={{textAlign:'center'}}>10</td><td style={{textAlign:'center'}}>{occupiedCount}</td><td style={{textAlign:'center'}}>{vacantCount}</td><td style={{textAlign:'center'}}>{(occupiedCount/10*100).toFixed(0)}%</td></tr></tbody></table>
              <h4>Slot Details</h4>
              <table className="report-table"><thead><tr><th>Slot #</th><th>Status</th><th>Renter Name</th><th>Address</th><th>Contact</th><th>Permit No.</th></tr></thead>
              <tbody>{slots.map(slot => (<tr key={slot.id}><td style={{textAlign:'center'}}>{slot.slotNumber}</td><td>{slot.renter.isOccupied ? 'Occupied' : 'Vacant'}</td><td>{slot.renter.name || '-'}</td><td>{slot.renter.address || '-'}</td><td>{slot.renter.contact || '-'}</td><td>{slot.renter.businessPermitNo || '-'}</td></tr>))}</tbody></table>
            </div>
            <div className="modal-footer"><button className="btn-save" onClick={printReport}>Print Report</button><button className="btn-cancel" onClick={closeReport}>Close</button></div>
          </div>
        </div>
      )}

      <div className="bell-wrapper">
        <div className="bell" onClick={() => setShowNotifications(!showNotifications)}>
          🔔 {notifications.length > 0 && <span className="bell-badge">{notifications.length}</span>}
          {showNotifications && notifications.length > 0 && (
            <div className="notif-panel"><h4>⚠️ Alerts</h4>{notifications.map(n => <div key={n.id} className="notif-item">{n.message}</div>)}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
