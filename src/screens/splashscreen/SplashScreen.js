import React, { useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { rf, wp, rp } from '../../theme/responsive';
import { ThemeContext } from '../../theme/ThemeContext'; // adjust path if needed

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const { theme } = useContext(ThemeContext);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current; // scale animation for logo

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace('Home');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
        <Image
          source={require('../../assets/logo/Milk-Book-Logo-no-bg.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: theme.textColor }]}>Milk Management App</Text>
        <Text style={[styles.subtitle, { color: theme.textColor }]}>Welcome!</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logo:      { width: wp(32), height: wp(32), marginBottom: rp(20) },
  title:     { fontSize: rf(24), fontWeight: 'bold', textAlign: 'center' },
  subtitle:  { fontSize: rf(16), marginTop: rp(10) },
});