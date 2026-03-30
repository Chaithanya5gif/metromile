import React from 'react';
import {ActivityIndicator, View} from 'react-native';
import {useAuth} from '../context/AuthContext';
import LoginScreen from '../screens/shared/LoginScreen';
import RiderNavigator from './RiderNavigator';
import DriverNavigator from './DriverNavigator';

const AppNavigator: React.FC = () => {
  const {user, isDriver, isLoading} = useAuth();

  if (isLoading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', backgroundColor: '#FFFFFF'}}>
        <ActivityIndicator size="large" color="#581C87" />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return isDriver ? <DriverNavigator /> : <RiderNavigator />;
};

export default AppNavigator;
