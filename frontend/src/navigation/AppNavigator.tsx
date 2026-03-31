import React from 'react';
import {ActivityIndicator, View} from 'react-native';
import {useAuth} from '../context/AuthContext';
import SplashScreen from '../screens/shared/SplashScreen';
import LoginScreen from '../screens/shared/LoginScreen';
import RiderNavigator from './RiderNavigator';
import DriverNavigator from './DriverNavigator';

const AppNavigator: React.FC = () => {
  const {user, isDriver, isLoading} = useAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return isDriver ? <DriverNavigator /> : <RiderNavigator />;
};

export default AppNavigator;
