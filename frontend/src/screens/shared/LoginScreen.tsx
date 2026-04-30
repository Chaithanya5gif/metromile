import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {WebView, WebViewMessageEvent} from 'react-native-webview';
import {useAuth} from '../../context/AuthContext';

const LoginScreen: React.FC = () => {
  const {login} = useAuth();
  const [loading, setLoading] = useState(true);

  const handleMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'CLERK_AUTH' && data.user) {
        // We received the user token/details from the Vite web app
        const {email, fullName} = data.user;
        if (email) {
          await login(email, fullName || 'Metro User');
        }
      }
    } catch (e) {
      console.error('Error parsing webview message', e);
    }
  };

  const CLERK_URL = 'https://metromile.vercel.app';

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <View style={s.header}>
          <Image 
            source={require('../../assets/logo.png')} 
            style={s.logo}
            resizeMode="contain"
          />
          <Text style={s.welcomeText}>MetroMile</Text>
          <Text style={s.tagline}>Secure Auth Portal</Text>
        </View>

        <View style={s.webContainer}>
          {loading && (
            <View style={s.loader}>
              <ActivityIndicator size="large" color="#4B164C" />
              <Text style={{marginTop: 10, color: '#4B164C'}}>Loading Secure Login...</Text>
            </View>
          )}
          <WebView
            source={{uri: CLERK_URL}}
            onLoadEnd={() => setLoading(false)}
            onMessage={handleMessage}
            style={s.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
            mixedContentMode="always"
            onError={(e) => {
              Alert.alert('Connection Error', 'Ensure the Vite dev server is running on port 5173');
              setLoading(false);
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#FAF5FF'},
  container: {flex: 1},
  header: {
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#4B164C',
  },
  tagline: {
    fontSize: 14,
    color: '#A855F7',
    fontWeight: '600',
    marginTop: 4,
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    zIndex: 10,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 10,
  },
});

export default LoginScreen;
