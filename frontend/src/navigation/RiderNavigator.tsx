import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
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
        height: 60,
        paddingBottom: 8,
      },
      tabBarActiveTintColor: '#581C87',
      tabBarInactiveTintColor: '#9CA3AF',
      tabBarIcon: ({color, size}) => {
        let iconName = 'home';
        if (route.name === 'Home') iconName = 'home-variant';
        else if (route.name === 'Track') iconName = 'map-marker-radius';
        else if (route.name === 'History') iconName = 'history';
        else if (route.name === 'Profile') iconName = 'account-circle';
        return <Icon name={iconName} size={size} color={color} />;
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
