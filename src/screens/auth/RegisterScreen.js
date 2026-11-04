import React, { useContext, useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  ScrollView, Platform, ActivityIndicator, Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  registerUser,
  clearAuthError,
  selectAuthLoading,
  selectAuthError,
} from '../../redux/slices/authSlice';
import { ThemeContext } from '../../theme/ThemeContext';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { rf, rp, rs, inputHeight, buttonHeight, keyboardBehavior, keyboardOffset, wp } from '../../theme/responsive';
import DOBPicker from '../../components/DOBPicker';

export default function RegisterScreen({ navigation }) {
  const { theme } = useContext(ThemeContext);
  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dob, setDob] = useState('');
  const [showLoginHint, setShowLoginHint] = useState(false);

  useEffect(() => {
    if (error) {
      if (error.toLowerCase().includes('already registered') || error.toLowerCase().includes('already in use')) {
        setShowLoginHint(true);
      } else {
        setShowLoginHint(false);
      }
      Alert.alert('Registration Failed', error);
      dispatch(clearAuthError());
    }
  }, [error]);

  const handleRegister = () => {
    if (!name.trim()) return Alert.alert('Validation', 'Name is required.');
    if (!phone.trim()) return Alert.alert('Validation', 'Phone number is required.');
    if (!password.trim()) return Alert.alert('Validation', 'Password is required.');
    if (password.length < 6) return Alert.alert('Validation', 'Password must be at least 6 characters.');
    if (password !== confirmPassword) return Alert.alert('Validation', 'Passwords do not match.');
    if (!dob.trim()) return Alert.alert('Validation', 'Date of birth is required.');
    dispatch(registerUser({ name, phone, password, dob }));
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={keyboardBehavior} keyboardVerticalOffset={keyboardOffset}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: theme.backgroundColor }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/logo/Milk-Book-Logo-no-bg.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: theme.textColor }]}>MilkBook</Text>
          <Text style={[styles.subtitle, { color: theme.textColor }]}>Create your account</Text>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground || theme.backgroundColor }]}>

          {/* Name */}
          <Text style={[styles.label, { color: theme.textColor }]}>Full Name</Text>
          <TextInput
            placeholder="Enter your full name"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
            style={[styles.input, { color: theme.textColor, borderColor: theme.borderlineColor }]}
          />

          {/* Phone */}
          <Text style={[styles.label, { color: theme.textColor }]}>Phone Number</Text>
          <TextInput
            placeholder="Enter your phone number"
            placeholderTextColor="#999"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={[styles.input, { color: theme.textColor, borderColor: theme.borderlineColor }]}
          />

          {/* DOB */}
          <DOBPicker value={dob} onChange={setDob} theme={theme} />

          {/* Password */}
          <Text style={[styles.label, { color: theme.textColor }]}>Password</Text>
          <View style={[styles.passwordContainer, { borderColor: theme.borderlineColor }]}>
            <TextInput
              placeholder="Minimum 6 characters"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={[styles.passwordInput, { color: theme.textColor }]}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <MaterialIcon
                name={showPassword ? 'visibility-off' : 'visibility'}
                size={22}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <Text style={[styles.label, { color: theme.textColor }]}>Confirm Password</Text>
          <TextInput
            placeholder="Re-enter your password"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            style={[styles.input, { color: theme.textColor, borderColor: theme.borderlineColor }]}
          />

          {/* Phone already registered hint */}
          {showLoginHint && (
            <View style={styles.hintBanner}>
              <Text style={styles.hintText}>
                📱 This phone is already registered.
              </Text>
              <View style={styles.hintActions}>
                <TouchableOpacity
                  style={styles.hintBtn}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={styles.hintBtnText}>Login</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.hintBtn, { backgroundColor: '#e74c3c' }]}
                  onPress={() => navigation.navigate('ForgotPassword')}
                >
                  <Text style={styles.hintBtnText}>Reset Password</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.buttonContent}>
                <MaterialIcon name="person-add" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Create Account</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <TouchableOpacity
            style={styles.linkContainer}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={[styles.linkText, { color: theme.textColor }]}>
              Already have an account?{' '}
              <Text style={styles.linkHighlight}>Login</Text>
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:         { flexGrow: 1, padding: rp(20), justifyContent: 'center' },
  header:            { alignItems: 'center', marginBottom: rp(24) },
  logo:              { width: wp(30), height: wp(30), marginBottom: rp(10) },
  title:             { fontSize: rf(26), fontWeight: 'bold', marginTop: rp(4) },
  subtitle:          { fontSize: rf(13), opacity: 0.6, marginTop: rp(4) },
  card:              { padding: rp(20), borderRadius: rs(12), elevation: 2 },
  label:             { fontSize: rf(13), fontWeight: '600', marginBottom: rp(6) },
  input:             { borderWidth: 1, marginBottom: rp(14), paddingHorizontal: rp(12), height: inputHeight, borderRadius: rs(8), fontSize: rf(14) },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: rs(8), paddingHorizontal: rp(12), marginBottom: rp(14), height: inputHeight },
  passwordInput:     { flex: 1, fontSize: rf(14) },
  button:            { backgroundColor: '#2E86DE', height: buttonHeight, borderRadius: rs(10), alignItems: 'center', justifyContent: 'center', marginTop: rp(4) },
  buttonContent:     { flexDirection: 'row', alignItems: 'center' },
  buttonText:        { color: '#fff', fontSize: rf(15), fontWeight: '600' },
  hintBanner:        { backgroundColor: '#FFF3CD', borderWidth: 1, borderColor: '#FFCA28', borderRadius: rs(8), padding: rp(12), marginBottom: rp(10) },
  hintText:          { fontSize: rf(12), color: '#856404', textAlign: 'center', marginBottom: rp(8) },
  hintActions:       { flexDirection: 'row', gap: rp(8), justifyContent: 'center' },
  hintBtn:           { backgroundColor: '#2E86DE', paddingHorizontal: rp(16), paddingVertical: rp(8), borderRadius: rs(8) },
  hintBtnText:       { color: '#fff', fontSize: rf(12), fontWeight: '700' },
  linkContainer:     { alignItems: 'center', marginTop: rp(14) },
  linkText:          { fontSize: rf(13) },
  linkHighlight:     { color: '#2E86DE', fontWeight: '600' },
});