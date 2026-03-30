import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../../context/AuthContext';

const LoginScreen: React.FC = () => {
  const {login} = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'login' | 'register'>('login');

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), name.trim());
    } catch (e) {
      Alert.alert('Error', 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.container}>

        {/* Logo / Header */}
        <View style={s.hero}>
          <Text style={s.metroIcon}>🚇</Text>
          <Text style={s.appName}>MetroMile</Text>
          <Text style={s.tagline}>Bengaluru's Smart Carpooling</Text>
        </View>

        {/* Tab toggle */}
        <View style={s.tabRow}>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'login' && s.tabBtnActive]}
            onPress={() => setTab('login')}>
            <Text style={[s.tabText, tab === 'login' && s.tabTextActive]}>
              Login
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'register' && s.tabBtnActive]}
            onPress={() => setTab('register')}>
            <Text style={[s.tabText, tab === 'register' && s.tabTextActive]}>
              Register
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={s.card}>
          <Text style={s.label}>Full Name</Text>
          <TextInput
            style={s.input}
            placeholder="Aarav Kumar"
            placeholderTextColor="#64748b"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Text style={s.label}>Email Address</Text>
          <TextInput
            style={s.input}
            placeholder="you@example.com"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnText}>
                {tab === 'login' ? 'Login →' : 'Create Account →'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={s.footnote}>
          By continuing you agree to our Terms of Service
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#0f172a'},
  container: {flex: 1, justifyContent: 'center', padding: 24},
  hero: {alignItems: 'center', marginBottom: 36},
  metroIcon: {fontSize: 64, marginBottom: 8},
  appName: {fontSize: 36, fontWeight: '800', color: '#f8fafc', letterSpacing: -1},
  tagline: {fontSize: 15, color: '#94a3b8', marginTop: 4},
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabBtn: {flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10},
  tabBtnActive: {backgroundColor: '#6366f1'},
  tabText: {color: '#64748b', fontWeight: '600'},
  tabTextActive: {color: '#fff'},
  card: {backgroundColor: '#1e293b', borderRadius: 20, padding: 24},
  label: {color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12},
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    color: '#f8fafc',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  btn: {
    backgroundColor: '#6366f1',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  btnDisabled: {opacity: 0.6},
  btnText: {color: '#fff', fontSize: 16, fontWeight: '700'},
  footnote: {textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 16},
});

export default LoginScreen;
