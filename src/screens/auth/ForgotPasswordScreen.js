import React, { useContext, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { ThemeContext } from '../../theme/ThemeContext';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { rf, rp, rs, inputHeight, buttonHeight, keyboardBehavior, keyboardOffset, wp } from '../../theme/responsive';
import DOBPicker from '../../components/DOBPicker';
import { BASE_URL } from '../../config/api';

export default function ForgotPasswordScreen({ navigation }) {
  const { theme } = useContext(ThemeContext);

  const [phone,       setPhone]       = useState('');
  const [dob,         setDob]         = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [step,        setStep]        = useState(1); // 1 = verify, 2 = new password

  const handleVerify = async () => {
    if (!phone.trim()) return Alert.alert('Validation', 'Phone number is required.');
    if (!dob.trim())   return Alert.alert('Validation', 'Date of birth is required.');

    setLoading(true);
    try {
      // Check if phone + dob match (dry run — just verify)
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, dob, newPassword: 'temp_verify_only_123' }),
      });
      const data = await res.json();

      if (res.status === 404) return Alert.alert('Error', 'No account found with this phone number.');
      if (res.status === 401) return Alert.alert('Error', 'Date of birth does not match.');

      // If verification passed, go to step 2
      setStep(2);
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!newPassword.trim())  return Alert.alert('Validation', 'Enter new password.');
    if (newPassword.length < 6) return Alert.alert('Validation', 'Password must be at least 6 characters.');
    if (newPassword !== confirmPass) return Alert.alert('Validation', 'Passwords do not match.');

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, dob, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) return Alert.alert('Error', data.error || 'Failed to reset password.');

      Alert.alert('Success', 'Password reset successfully! Please login.', [
        { text: 'Login', onPress: () => navigation.replace('Login') },
      ]);
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={keyboardBehavior} keyboardVerticalOffset={keyboardOffset}>
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: theme.backgroundColor }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/logo/Milk-Book-Logo-no-bg.png')}
            style={styles.logo} resizeMode="contain"
          />
          <Text style={[styles.title, { color: theme.textColor }]}>Forgot Password</Text>
          <Text style={[styles.subtitle, { color: theme.textColor }]}>
            {step === 1
              ? 'Enter your phone number and date of birth to verify your identity'
              : 'Set your new password'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.cardBackground || theme.backgroundColor }]}>

          {step === 1 ? (
            <>
              {/* Step 1 — Verify */}
              <Text style={[styles.label, { color: theme.textColor }]}>Phone Number</Text>
              <TextInput
                style={[styles.input, { color: theme.textColor, borderColor: theme.borderlineColor }]}
                value={phone} onChangeText={setPhone}
                placeholder="Enter your phone number"
                placeholderTextColor="#999" keyboardType="phone-pad"
              />

              <DOBPicker value={dob} onChange={setDob} theme={theme} />

              <TouchableOpacity
                style={[styles.button, loading && { opacity: 0.7 }]}
                onPress={handleVerify} disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <View style={styles.btnContent}>
                    <MaterialIcon name="verified-user" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Verify Identity</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Step 2 — New password */}
              <Text style={[styles.label, { color: theme.textColor }]}>New Password</Text>
              <View style={[styles.passwordRow, { borderColor: theme.borderlineColor }]}>
                <TextInput
                  style={[styles.passwordInput, { color: theme.textColor }]}
                  value={newPassword} onChangeText={setNewPassword}
                  placeholder="Min 6 characters"
                  placeholderTextColor="#999" secureTextEntry={!showPass}
                />
                <TouchableOpacity onPress={() => setShowPass(v => !v)}>
                  <MaterialIcon name={showPass ? 'visibility-off' : 'visibility'} size={22} color="#999" />
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: theme.textColor }]}>Confirm Password</Text>
              <TextInput
                style={[styles.input, { color: theme.textColor, borderColor: theme.borderlineColor }]}
                value={confirmPass} onChangeText={setConfirmPass}
                placeholder="Re-enter new password"
                placeholderTextColor="#999" secureTextEntry={!showPass}
              />

              <TouchableOpacity
                style={[styles.button, loading && { opacity: 0.7 }]}
                onPress={handleReset} disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <View style={styles.btnContent}>
                    <MaterialIcon name="lock-reset" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Reset Password</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                <Text style={[styles.backText, { color: theme.textColor }]}>← Back</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Back to login */}
          <TouchableOpacity style={styles.linkContainer} onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.linkText, { color: theme.textColor }]}>
              Remember password? <Text style={styles.linkHighlight}>Login</Text>
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { flexGrow: 1, padding: rp(20), justifyContent: 'center' },
  header:       { alignItems: 'center', marginBottom: rp(24) },
  logo:         { width: wp(25), height: wp(25), marginBottom: rp(10) },
  title:        { fontSize: rf(24), fontWeight: 'bold', marginTop: rp(4) },
  subtitle:     { fontSize: rf(12), opacity: 0.6, marginTop: rp(6), textAlign: 'center', paddingHorizontal: rp(10) },
  card:         { padding: rp(20), borderRadius: rs(12), elevation: 2 },
  label:        { fontSize: rf(13), fontWeight: '600', marginBottom: rp(6) },
  input:        { borderWidth: 1, marginBottom: rp(14), paddingHorizontal: rp(12), height: inputHeight, borderRadius: rs(8), fontSize: rf(14) },
  passwordRow:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: rs(8), paddingHorizontal: rp(12), height: inputHeight, marginBottom: rp(14) },
  passwordInput:{ flex: 1, fontSize: rf(14) },
  button:       { backgroundColor: '#2E86DE', height: buttonHeight, borderRadius: rs(10), alignItems: 'center', justifyContent: 'center', marginTop: rp(4) },
  btnContent:   { flexDirection: 'row', alignItems: 'center' },
  buttonText:   { color: '#fff', fontSize: rf(15), fontWeight: '600' },
  backBtn:      { alignItems: 'center', marginTop: rp(12) },
  backText:     { fontSize: rf(13), opacity: 0.7 },
  linkContainer:{ alignItems: 'center', marginTop: rp(16) },
  linkText:     { fontSize: rf(13) },
  linkHighlight:{ color: '#2E86DE', fontWeight: '600' },
});