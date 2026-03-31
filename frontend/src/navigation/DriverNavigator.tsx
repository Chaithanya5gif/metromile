import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {View, Text} from 'react-native';
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
        borderTopColor: '#F3E8FF',
        height: 70,
        paddingBottom: 8,
        paddingTop: 8,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: -4},
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      tabBarShowLabel: false,
      tabBarIcon: ({focused}) => {
        let iconName = 'view-dashboard';
        let label = 'HOME';

        if (route.name === 'Dashboard') {
          iconName = 'home-variant';
          label = 'HOME';
        } else if (route.name === 'Rides') {
          iconName = 'car-multiple';
          label = 'RIDES';
        } else if (route.name === 'Earnings') {
          iconName = 'cash-multiple';
          label = 'WALLET';
        } else if (route.name === 'Profile') {
          iconName = 'account';
          label = 'PROFILE';
        }

        if (focused) {
          return (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#581C87',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 8,
                elevation: 4,
                shadowColor: '#581C87',
                shadowOffset: {width: 0, height: 4},
                shadowOpacity: 0.3,
                shadowRadius: 4,
              }}>
              <Icon name={iconName} size={28} color="#FFFFFF" />
            </View>
          );
        }

        return (
          <View style={{alignItems: 'center', justifyContent: 'center'}}>
            <Icon name={iconName} size={26} color="#9CA3AF" />
            <Text style={{color: '#9CA3AF', fontSize: 10, fontWeight: '700', marginTop: 4, letterSpacing: 0.5}}>
              {label}
            </Text>
          </View>
        );
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
