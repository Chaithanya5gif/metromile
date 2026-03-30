import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import DriverHomeScreen from '../screens/driver/DriverHomeScreen';
import DriverRidesScreen from '../screens/driver/DriverRidesScreen';
import ActiveRideScreen from '../screens/driver/ActiveRideScreen';
import EarningsScreen from '../screens/driver/EarningsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const DriverTabs: React.FC = () => (
  <Tab.Navigator
    screenOptions={({route}) => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#FFFFFF',
        borderTopColor: '#2E1065',
        height: 60,
        paddingBottom: 8,
      },
      tabBarActiveTintColor: '#10b981',
      tabBarInactiveTintColor: '#9CA3AF',
      tabBarIcon: ({color, size}) => {
        let iconName = 'home';
        if (route.name === 'Dashboard') iconName = 'view-dashboard';
        else if (route.name === 'Rides') iconName = 'car-multiple';
        else if (route.name === 'Earnings') iconName = 'cash-multiple';
        else if (route.name === 'Profile') iconName = 'account-circle';
        return <Icon name={iconName} size={size} color={color} />;
      },
    })}>
    <Tab.Screen name="Dashboard" component={DriverHomeScreen} />
    <Tab.Screen name="Rides" component={DriverRidesScreen} />
    <Tab.Screen name="Earnings" component={EarningsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const DriverNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="DriverTabs" component={DriverTabs} />
    <Stack.Screen name="ActiveRide" component={ActiveRideScreen} />
  </Stack.Navigator>
);

export default DriverNavigator;
