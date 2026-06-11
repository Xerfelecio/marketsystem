import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, StyleSheet, ScrollView } from 'react-native';
import axios from 'axios';

const API_URL = 'http://YOUR_COMPUTER_IP:5000/api'; // CHANGE THIS TO YOUR PC's IP

export default function App() {
  const [slots, setSlots] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState({ name: '', address: '', contact: '' });

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    try {
      const res = await axios.get(${API_URL}/slots);
      setSlots(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = async () => {
    if (selectedSlot.renter.isOccupied) {
      await axios.put(${API_URL}/slots//edit, formData);
    } else {
      await axios.post(${API_URL}/slots//rent, formData);
    }
    fetchSlots();
    setModalVisible(false);
    setFormData({ name: '', address: '', contact: '' });
  };

  const handleVacate = async (slotId) => {
    await axios.delete(${API_URL}/slots//vacate);
    fetchSlots();
  };

  const renderSlot = ({ item }) => (
    <View style={styles.slotCard}>
      <Text style={styles.slotTitle}>Slot #{item.slotNumber}</Text>
      {item.renter.isOccupied ? (
        <>
          <Text><Text style={styles.bold}>Name:</Text> {item.renter.name}</Text>
          <Text><Text style={styles.bold}>Address:</Text> {item.renter.address}</Text>
          <Text><Text style={styles.bold}>Contact:</Text> {item.renter.contact}</Text>
          <Text><Text style={styles.bold}>Permit No.:</Text> {item.renter.businessPermitNo}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.editBtn} onPress={() => {
              setSelectedSlot(item);
              setFormData({ name: item.renter.name, address: item.renter.address, contact: item.renter.contact });
              setModalVisible(true);
            }}>
              <Text style={styles.btnText}>✏️ Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.vacateBtn} onPress={() => handleVacate(item.slotNumber)}>
              <Text style={styles.btnText}>🚪 Vacate</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.vacant}>🟢 VACANT</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => {
            setSelectedSlot(item);
            setFormData({ name: '', address: '', contact: '' });
            setModalVisible(true);
          }}>
            <Text style={styles.btnText}>➕ Add Renter</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🏪 Public Market Stall System</Text>
      <Text style={styles.subheader}>Gerardo, Tandag City - 10 Slots</Text>
      <FlatList data={slots} keyExtractor={(item) => item._id} renderItem={renderSlot} />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedSlot?.renter.isOccupied ? 'Edit Renter' : 'Add Renter'}</Text>
            <Text>Slot #{selectedSlot?.slotNumber}</Text>
            <TextInput style={styles.input} placeholder="Full Name" value={formData.name} onChangeText={(text) => setFormData({...formData, name: text})} />
            <TextInput style={styles.input} placeholder="Address" value={formData.address} onChangeText={(text) => setFormData({...formData, address: text})} />
            <TextInput style={styles.input} placeholder="Contact No." value={formData.contact} onChangeText={(text) => setFormData({...formData, contact: text})} />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.btnText}>💾 Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.btnText}>❌ Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f7f0', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#2d5a2c', textAlign: 'center', marginTop: 40 },
  subheader: { textAlign: 'center', marginBottom: 20 },
  slotCard: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, borderLeftWidth: 8, borderLeftColor: '#2d5a2c' },
  slotTitle: { fontSize: 18, fontWeight: 'bold', color: '#2d5a2c', marginBottom: 8 },
  bold: { fontWeight: 'bold' },
  vacant: { color: '#4caf50', fontWeight: 'bold', fontSize: 16, textAlign: 'center', marginVertical: 10 },
  buttonRow: { flexDirection: 'row', marginTop: 10 },
  editBtn: { backgroundColor: '#4CAF50', padding: 8, borderRadius: 5, marginRight: 10, flex: 1, alignItems: 'center' },
  vacateBtn: { backgroundColor: '#f44336', padding: 8, borderRadius: 5, flex: 1, alignItems: 'center' },
  addBtn: { backgroundColor: '#4CAF50', padding: 10, borderRadius: 5, marginTop: 10, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginVertical: 5, borderRadius: 5 },
  saveBtn: { backgroundColor: '#4CAF50', padding: 10, borderRadius: 5, marginTop: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#999', padding: 10, borderRadius: 5, marginTop: 5, alignItems: 'center' },
});
