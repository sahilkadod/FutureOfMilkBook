import React, { useContext, useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  ScrollView, Platform, ActivityIndicator, Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  loginUser,
  clearAuthError,
  selectAuthLoading,
  selectAuthError,
} from '../../redux/slices/authSlice';
import { ThemeContext } from '../../theme/ThemeContext';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { rf, rp, rs, inputHeight, buttonHeight, keyboardBehavior, keyboardOffset, wp } from '../../theme/responsive';

export default function LoginScreen({ navigation }) {
  const { theme } = useContext(ThemeContext);
  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotHint, setShowForgotHint] = useState(false);

  useEffect(() => {
    if (error) {
      if (error.toLowerCase().includes('invalid') || error.toLowerCase().includes('password')) {
        setShowForgotHint(true);
      }
      Alert.alert('Login Failed', error);
      dispatch(clearAuthError());
    }
  }, [error]);

  const handleLogin = async () => {
    if (!phone.trim()) return Alert.alert('Validation', 'Phone number is required.');
    if (!password.trim()) return Alert.alert('Validation', 'Password is required.');
    dispatch(loginUser({ phone, password }));
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
          <Text style={[styles.subtitle, { color: theme.textColor }]}>Sign in to your account</Text>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground || theme.backgroundColor }]}>

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

          {/* Password */}
          <Text style={[styles.label, { color: theme.textColor }]}>Password</Text>
          <View style={[styles.passwordContainer, { borderColor: theme.borderlineColor }]}>
            <TextInput
              placeholder="Enter your password"
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

          {/* Forgot hint after wrong password */}
          {showForgotHint && (
            <TouchableOpacity
              style={styles.hintBanner}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.hintText}>
                💡 Wrong password? <Text style={styles.hintLink}>Reset your password</Text>
              </Text>
            </TouchableOpacity>
          )}

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.buttonContent}>
                <MaterialIcon name="login" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Login</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotContainer}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Register Link */}
          <TouchableOpacity
            style={styles.linkContainer}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={[styles.linkText, { color: theme.textColor }]}>
              Don't have an account?{' '}
              <Text style={styles.linkHighlight}>Register</Text>
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
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: rs(8), paddingHorizontal: rp(12), marginBottom: rp(18), height: inputHeight },
  passwordInput:     { flex: 1, fontSize: rf(14) },
  button:            { backgroundColor: '#2E86DE', height: buttonHeight, borderRadius: rs(10), alignItems: 'center', justifyContent: 'center' },
  buttonContent:     { flexDirection: 'row', alignItems: 'center' },
  buttonText:        { color: '#fff', fontSize: rf(15), fontWeight: '600' },
  hintBanner:        { backgroundColor: '#FFF3CD', borderWidth: 1, borderColor: '#FFCA28', borderRadius: rs(8), padding: rp(10), marginBottom: rp(10) },
  hintText:          { fontSize: rf(12), color: '#856404', textAlign: 'center' },
  hintLink:          { fontWeight: '700', color: '#2E86DE', textDecorationLine: 'underline' },
  forgotContainer:   { alignItems: 'flex-end', marginTop: rp(8), marginBottom: rp(4) },
  forgotText:        { fontSize: rf(12), color: '#2E86DE', fontWeight: '600' },
  linkContainer:     { alignItems: 'center', marginTop: rp(14) },
  linkText:          { fontSize: rf(13) },
  linkHighlight:     { color: '#2E86DE', fontWeight: '600' },
});