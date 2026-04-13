import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabase';
import AlertModal from '../components/AlertModal';
import { useTheme } from '../context/ThemeContext';

export default function AuthScreen() {
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [alert, setAlert] = useState<{ visible: boolean; title: string; message: string; type: any }>
    ({ visible: false, title: '', message: '', type: 'info' });

  const showAlert = (title: string, message: string, type: any = 'error') =>
    setAlert({ visible: true, title, message, type });

  const validate = () => {
    if (!email.trim()) { showAlert('Missing Email', 'Please enter your email address.'); return false; }
    if (!email.includes('@')) { showAlert('Invalid Email', 'Please enter a valid email address.'); return false; }
    if (!isLogin && !username.trim()) { showAlert('Missing Name', 'Please enter your full name.'); return false; }
    if (!password) { showAlert('Missing Password', 'Please enter your password.'); return false; }
    if (!isLogin && password.length < 8) { showAlert('Weak Password', 'Password must be at least 8 characters.'); return false; }
    return true;
  };

  const handleAuth = async () => {
    if (!validate()) return;
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setLoading(false);
      if (error) return showAlert('Authentication Error', error.message);
    } else {
      // Block non-DLSL from registering
      if (!email.trim().endsWith('@dlsl.edu.ph')) {
        setLoading(false);
        return showAlert('Invalid Email', 'Please use your DLSL email address (@dlsl.edu.ph).');
      }

      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) { setLoading(false); return showAlert('Authentication Error', error.message); }

      // Save username to profiles
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          username: username.trim(),
          role: 'user',
        });
      }

      setLoading(false);
      showAlert('Account Created', 'Welcome to DLSL Lost & Found!', 'success');
    }
  };

  const s = makeStyles(colors, isDark);

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Logo */}
          <View style={s.logoArea}>
            <Text style={s.logoIcon}>🔍</Text>
            <Text style={s.logoTitle}>L&F System</Text>
            <Text style={s.logoSub}>De La Salle Lipa</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>{isLogin ? 'Welcome back' : 'Create account'}</Text>
            <Text style={s.cardSub}>{isLogin ? 'Sign in to your DLSL account' : 'Register with your DLSL email'}</Text>

            {/* Username — only on register */}
            {!isLogin && (
              <>
                <Text style={s.label}>Full Name</Text>
                <TextInput
                  style={s.input}
                  placeholder="Juan dela Cruz"
                  placeholderTextColor={colors.placeholder}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </>
            )}

            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              placeholder={isLogin ? 'your@email.com' : 'yourname@dlsl.edu.ph'}
              placeholderTextColor={colors.placeholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={s.label}>Password</Text>
            <View style={s.passwordRow}>
              <TextInput
                style={s.passwordInput}
                placeholder={isLogin ? 'Enter password' : 'Min. 8 characters'}
                placeholderTextColor={colors.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
                <Text style={s.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.btn} onPress={handleAuth} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.toggle} onPress={() => { setIsLogin(!isLogin); setEmail(''); setPassword(''); setUsername(''); }}>
            <Text style={s.toggleText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Text style={s.toggleHighlight}>{isLogin ? 'Register' : 'Sign In'}</Text>
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      <AlertModal
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoArea: { alignItems: 'center', marginBottom: 36 },
  logoIcon: { fontSize: 52, marginBottom: 10 },
  logoTitle: { fontSize: 28, fontWeight: '700', color: colors.text },
  logoSub: { fontSize: 14, color: colors.subtext, marginTop: 4 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: isDark ? 0.3 : 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 },
  cardSub: { fontSize: 14, color: colors.subtext, marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '600', color: colors.subtext, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.input, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text },
  passwordRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.input, borderRadius: 12 },
  passwordInput: { flex: 1, padding: 14, fontSize: 15, color: colors.text },
  eyeBtn: { paddingHorizontal: 14 },
  eyeIcon: { fontSize: 18 },
  btn: { backgroundColor: colors.accent, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 24 },
  btnText: { color: colors.card, fontWeight: '700', fontSize: 16 },
  toggle: { alignItems: 'center', marginTop: 24 },
  toggleText: { fontSize: 14, color: colors.subtext },
  toggleHighlight: { color: colors.info, fontWeight: '600' },
});