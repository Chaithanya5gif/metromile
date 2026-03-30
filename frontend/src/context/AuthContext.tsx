import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createOrUpdateUser, setAuthToken} from '../services/api';

interface UserData {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: 'rider' | 'driver';
}

interface AuthContextType {
  user: UserData | null;
  token: string;
  isDriver: boolean;
  isLoading: boolean;
  login: (email: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: 'rider' | 'driver') => void;
  setUser: (u: UserData) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        const stored = await AsyncStorage.getItem('metromile_user');
        const storedToken = await AsyncStorage.getItem('metromile_token');
        if (stored) {
          const parsed: UserData = JSON.parse(stored);
          setUser(parsed);
          if (storedToken) {
            setToken(storedToken);
            setAuthToken(storedToken);
          }
        }
      } catch (_e) {
        // ignore
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  const login = useCallback(async (email: string, fullName: string) => {
    // Generate a simple deterministic ID from email for demo
    const fakeId = `user_${email.replace(/[^a-z0-9]/gi, '_')}`;
    const fakeToken = `demo_token_${fakeId}`;

    try {
      const serverUser = await createOrUpdateUser({
        id: fakeId,
        email,
        full_name: fullName,
        role: 'rider',
      });

      const userData: UserData = {
        id: serverUser.id,
        email: serverUser.email,
        full_name: serverUser.full_name,
        phone: serverUser.phone,
        role: serverUser.role || 'rider',
      };

      setUser(userData);
      setToken(fakeToken);
      setAuthToken(fakeToken);
      await AsyncStorage.setItem('metromile_user', JSON.stringify(userData));
      await AsyncStorage.setItem('metromile_token', fakeToken);
    } catch (e) {
      // If API fails, use local user
      const localUser: UserData = {
        id: fakeId,
        email,
        full_name: fullName,
        role: 'rider',
      };
      setUser(localUser);
      setToken(fakeToken);
      await AsyncStorage.setItem('metromile_user', JSON.stringify(localUser));
      await AsyncStorage.setItem('metromile_token', fakeToken);
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setToken('');
    setAuthToken('');
    await AsyncStorage.removeItem('metromile_user');
    await AsyncStorage.removeItem('metromile_token');
  }, []);

  const switchRole = useCallback(
    (role: 'rider' | 'driver') => {
      if (!user) return;
      const updated = {...user, role};
      setUser(updated);
      AsyncStorage.setItem('metromile_user', JSON.stringify(updated));
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isDriver: user?.role === 'driver',
        isLoading,
        login,
        logout,
        switchRole,
        setUser,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
