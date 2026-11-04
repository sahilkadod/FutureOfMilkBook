import React, { useContext, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { selectUser, selectToken } from '../../redux/slices/authSlice';
import { ThemeContext } from '../../theme/ThemeContext';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { rf, rp, rs, inputHeight, buttonHeight, keyboardBehavior, keyboardOffset, wp } from '../../theme/responsive';
import { BASE_URL } from '../../config/api';

const AVATAR_COLORS = ['#2E7D32', '#1565C0', '#6A1B9A', '#AD1457', '#E65100'];
const SCREEN = { MAIN: 'main', EDIT: 'edit', PASSWORD: 'password' };

export default function ProfileScreen() {
  const { theme } = useContext(ThemeContext);
  const dispatch  = useDispatch();
  const user      = useSelector(selectUser);
  const token     = useSelector(selectToken);

  const [screen, setScreen] = useState(SCREEN.MAIN);
  const [name,   setName]   = useState(user?.name  || '');
  const [phone,  setPhone]  = useState(user?.phone || '');
  const [loadingInfo, setLoadingInfo] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);

  const avatarColor = AVATAR_COLORS[(user?.name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

  const handleUpdateInfo = async () => {
    if (!name.trim()) return Alert.alert('Validation', 'Name is required.');
    setLoadingInfo(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (!res.ok) return Alert.alert('Error', data.error || 'Failed to update');
      const updatedUser = { ...user, name, phone };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      dispatch({ type: 'auth/updateUser', payload: updatedUser });
      Alert.alert('Success', 'Profile updated!');
      setScreen(SCREEN.MAIN);
    } catch { Alert.alert('Error', 'Network error. Please try again.'); }
    finally { setLoadingInfo(false); }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure? This will permanently delete your account and ALL your data including customers, milk entries and rates. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${BASE_URL}/auth/delete-account`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
              });
              const data = await res.json();
              if (!res.ok) return Alert.alert('Error', data.error || 'Failed to delete account');
              // Clear local data and logout
              dispatch({ type: 'auth/logout/fulfilled' });
            } catch {
              Alert.alert('Error', 'Network error. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleUpdatePassword = async () => {
    if (!oldPassword.trim()) return Alert.alert('Validation', 'Enter current password.');
    if (newPassword.length < 6) return Alert.alert('Validation', 'New password must be 6+ characters.');
    if (newPassword !== confirmPass) return Alert.alert('Validation', 'Passwords do not match.');
    setLoadingPass(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/update-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) return Alert.alert('Error', data.error || 'Failed to update');
      setOldPassword(''); setNewPassword(''); setConfirmPass('');
      Alert.alert('Success', 'Password updated!');
      setScreen(SCREEN.MAIN);
    } catch { Alert.alert('Error', 'Network error. Please try again.'); }
    finally { setLoadingPass(false); }
  };

  const renderMain = () => (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      {/* Avatar banner */}
      <View style={[styles.avatarCard, { backgroundColor: avatarColor }]}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || '?'}</Text>
        </View>
        <Text style={styles.avatarName}>{user?.name}</Text>
        <Text style={styles.avatarSub}>MilkBook Member</Text>
      </View>

      {/* Details */}
      <View style={[styles.card, { backgroundColor: theme.cardBackground || theme.backgroundColor }]}>
        <Text style={[styles.sectionTitle, { color: '#888' }]}>Account Details</Text>
        <InfoRow icon="person" label="Full Name" value={user?.name} theme={theme} />
        <InfoRow icon="phone" label="Phone" value={user?.phone || 'Not set'} theme={theme} />
      </View>

      {/* Options */}
      <View style={[styles.card, { backgroundColor: theme.cardBackground || theme.backgroundColor }]}>
        <Text style={[styles.sectionTitle, { color: '#888' }]}>Settings</Text>
        <OptionRow
          icon="edit" label="Edit Profile" sub="Update your name and phone" color="#2E7D32"
          onPress={() => { setName(user?.name || ''); setPhone(user?.phone || ''); setScreen(SCREEN.EDIT); }}
          theme={theme}
        />
        <View style={[styles.divider, { backgroundColor: theme.borderlineColor }]} />
        <OptionRow
          icon="lock" label="Change Password" sub="Update your account password" color="#1565C0"
          onPress={() => { setOldPassword(''); setNewPassword(''); setConfirmPass(''); setScreen(SCREEN.PASSWORD); }}
          theme={theme}
        />
      </View>

      {/* Danger zone */}
      <View style={[styles.card, { backgroundColor: theme.cardBackground || theme.backgroundColor }]}>
        <Text style={[styles.sectionTitle, { color: '#e74c3c' }]}>Danger Zone</Text>
        <OptionRow
          icon="delete-forever" label="Delete Account" sub="Permanently delete your account and all data" color="#e74c3c"
          onPress={handleDeleteAccount}
          theme={theme}
        />
      </View>
    </ScrollView>
  );

  const renderEdit = () => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={keyboardBehavior} keyboardVerticalOffset={keyboardOffset}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.backgroundColor }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: theme.cardBackground || theme.backgroundColor }]}>
          <Text style={[styles.label, { color: theme.textColor }]}>Full Name</Text>
          <TextInput style={[styles.input, { color: theme.textColor, borderColor: theme.borderlineColor }]}
            value={name} onChangeText={setName} placeholder="Enter your name" placeholderTextColor="#999" />
          <Text style={[styles.label, { color: theme.textColor }]}>Phone Number</Text>
          <TextInput style={[styles.input, { color: theme.textColor, borderColor: theme.borderlineColor }]}
            value={phone} onChangeText={setPhone} placeholder="Enter your phone" placeholderTextColor="#999" keyboardType="phone-pad" />
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#2E7D32' }, loadingInfo && styles.btnDisabled]}
            onPress={handleUpdateInfo} disabled={loadingInfo}>
            {loadingInfo ? <ActivityIndicator color="#fff" /> : (
              <View style={styles.btnContent}>
                <MaterialIcon name="save" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.btnText}>Save Changes</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderPassword = () => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={keyboardBehavior} keyboardVerticalOffset={keyboardOffset}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.backgroundColor }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: theme.cardBackground || theme.backgroundColor }]}>
          <Text style={[styles.label, { color: theme.textColor }]}>Current Password</Text>
          <View style={[styles.passwordRow, { borderColor: theme.borderlineColor }]}>
            <TextInput style={[styles.passwordInput, { color: theme.textColor }]}
              value={oldPassword} onChangeText={setOldPassword} placeholder="Enter current password"
              placeholderTextColor="#999" secureTextEntry={!showOld} />
            <TouchableOpacity onPress={() => setShowOld(v => !v)}>
              <MaterialIcon name={showOld ? 'visibility-off' : 'visibility'} size={22} color="#999" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.label, { color: theme.textColor }]}>New Password</Text>
          <View style={[styles.passwordRow, { borderColor: theme.borderlineColor }]}>
            <TextInput style={[styles.passwordInput, { color: theme.textColor }]}
              value={newPassword} onChangeText={setNewPassword} placeholder="Min 6 characters"
              placeholderTextColor="#999" secureTextEntry={!showNew} />
            <TouchableOpacity onPress={() => setShowNew(v => !v)}>
              <MaterialIcon name={showNew ? 'visibility-off' : 'visibility'} size={22} color="#999" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.label, { color: theme.textColor }]}>Confirm New Password</Text>
          <TextInput style={[styles.input, { color: theme.textColor, borderColor: theme.borderlineColor }]}
            value={confirmPass} onChangeText={setConfirmPass} placeholder="Re-enter new password"
            placeholderTextColor="#999" secureTextEntry={!showNew} />
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#1565C0' }, loadingPass && styles.btnDisabled]}
            onPress={handleUpdatePassword} disabled={loadingPass}>
            {loadingPass ? <ActivityIndicator color="#fff" /> : (
              <View style={styles.btnContent}>
                <MaterialIcon name="lock" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.btnText}>Update Password</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <View style={{ flex: 1 }}>
      {screen !== SCREEN.MAIN && (
        <TouchableOpacity
          style={[styles.backBar, { backgroundColor: theme.cardBackground || theme.backgroundColor, borderBottomColor: theme.borderlineColor }]}
          onPress={() => setScreen(SCREEN.MAIN)}
        >
          <IonIcon name="arrow-back" size={22} color={theme.textColor} />
          <Text style={[styles.backText, { color: theme.textColor }]}>
            {screen === SCREEN.EDIT ? 'Edit Profile' : 'Change Password'}
          </Text>
        </TouchableOpacity>
      )}
      {screen === SCREEN.MAIN     && renderMain()}
      {screen === SCREEN.EDIT     && renderEdit()}
      {screen === SCREEN.PASSWORD && renderPassword()}
    </View>
  );
}

const InfoRow = ({ icon, label, value, theme }) => (
  <View style={styles.infoRow}>
    <MaterialIcon name={icon} size={20} color="#888" style={{ marginRight: rp(12) }} />
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.textColor }]}>{value}</Text>
    </View>
  </View>
);

const OptionRow = ({ icon, label, sub, color, onPress, theme }) => (
  <TouchableOpacity style={styles.optionRow} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.optionIcon, { backgroundColor: color + '18' }]}>
      <MaterialIcon name={icon} size={20} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.optionLabel, { color: theme.textColor }]}>{label}</Text>
      <Text style={styles.optionSub}>{sub}</Text>
    </View>
    <IonIcon name="chevron-forward" size={20} color="#ccc" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container:    { flexGrow: 1, padding: rp(16) },
  avatarCard:   { borderRadius: rs(16), padding: rp(24), alignItems: 'center', marginBottom: rp(16) },
  avatarCircle: { width: wp(20), height: wp(20), borderRadius: wp(10), backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: rp(12) },
  avatarText:   { fontSize: rf(32), fontWeight: '800', color: '#fff' },
  avatarName:   { fontSize: rf(20), fontWeight: '800', color: '#fff', marginBottom: rp(4) },
  avatarSub:    { fontSize: rf(12), color: 'rgba(255,255,255,0.75)' },
  card:         { borderRadius: rs(14), padding: rp(16), marginBottom: rp(14), elevation: 1 },
  sectionTitle: { fontSize: rf(11), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: rp(12) },
  infoRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: rp(10) },
  infoLabel:    { fontSize: rf(11), color: '#888', marginBottom: rp(2) },
  infoValue:    { fontSize: rf(15), fontWeight: '600' },
  optionRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: rp(12) },
  optionIcon:   { width: rs(42), height: rs(42), borderRadius: rs(12), alignItems: 'center', justifyContent: 'center', marginRight: rp(12) },
  optionLabel:  { fontSize: rf(14), fontWeight: '600', marginBottom: rp(2) },
  optionSub:    { fontSize: rf(11), color: '#999' },
  divider:      { height: 1, marginVertical: rp(2) },
  backBar:      { flexDirection: 'row', alignItems: 'center', gap: rp(12), padding: rp(14), borderBottomWidth: 1 },
  backText:     { fontSize: rf(16), fontWeight: '700' },
  label:        { fontSize: rf(12), fontWeight: '600', marginBottom: rp(6) },
  input:        { borderWidth: 1, borderRadius: rs(8), paddingHorizontal: rp(12), height: inputHeight, marginBottom: rp(14), fontSize: rf(14) },
  passwordRow:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: rs(8), paddingHorizontal: rp(12), height: inputHeight, marginBottom: rp(14) },
  passwordInput:{ flex: 1, fontSize: rf(14) },
  btn:          { height: buttonHeight, borderRadius: rs(10), alignItems: 'center', justifyContent: 'center', marginTop: rp(4) },
  btnDisabled:  { opacity: 0.6 },
  btnContent:   { flexDirection: 'row', alignItems: 'center' },
  btnText:      { color: '#fff', fontSize: rf(14), fontWeight: '700' },
});