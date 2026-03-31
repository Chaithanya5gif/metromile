import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {View, Text} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import HomeScreen from '../screens/rider/HomeScreen';
import BookRideScreen from '../screens/rider/BookRideScreen';
import TrackRideScreen from '../screens/rider/TrackRideScreen';
import PaymentScreen from '../screens/rider/PaymentScreen';
import RatingScreen from '../screens/rider/RatingScreen';
import RideHistoryScreen from '../screens/rider/RideHistoryScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const RiderTabs: React.FC = () => (
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
        
        if (route.name === 'Home') {
          iconName = 'home-variant';
          label = 'HOME';
        } else if (route.name === 'Track') {
          iconName = 'car';
          label = 'RIDES';
        } else if (route.name === 'History') {
          iconName = 'clock-time-four-outline';
          label = 'HISTORY';
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
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Track" component={TrackRideScreen} />
    <Tab.Screen name="History" component={RideHistoryScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const RiderNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="RiderTabs" component={RiderTabs} />
    <Stack.Screen name="BookRide" component={BookRideScreen} />
    <Stack.Screen name="Payment" component={PaymentScreen} />
    <Stack.Screen name="Rating" component={RatingScreen} />
  </Stack.Navigator>
);

export default RiderNavigator;
