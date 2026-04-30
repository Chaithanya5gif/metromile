import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import {getDriverByUser, driverCompleteRide, updateDriverLocation} from '../../services/api';
import wsService from '../../services/websocket';
import Geolocation from '@react-native-community/geolocation';
import OSMMap from '../../components/OSMMap';

const BENGALURU = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

const ActiveRideScreen: React.FC = () => {
  const {user} = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {rideId, riderId} = route.params || {};

  const [driver, setDriver] = useState<any>(null);
  const [driverLoc, setDriverLoc] = useState({lat: 12.9716, lng: 77.5946});
  const [completing, setCompleting] = useState(false);
  const watchId = useRef<number | null>(null);

  const loadDriver = useCallback(async () => {
    if (!user) return;
    try {
      const d = await getDriverByUser(user.id);
      setDriver(d);
    } catch (_e) {}
  }, [user]);

  useEffect(() => {
    loadDriver();
  }, [loadDriver]);

  // Real GPS tracking — broadcast location to rider via WebSocket
  useEffect(() => {
    if (!driver || !rideId || !riderId) return;

    const startTracking = async () => {
      if (Platform.OS === 'android') {
        try {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          );
        } catch (_e) {}
      }

      watchId.current = Geolocation.watchPosition(
        (position) => {
          const {latitude, longitude} = position.coords;
          setDriverLoc({lat: latitude, lng: longitude});

          // Send real location via WebSocket to the rider
          wsService.sendLocation(riderId as string, latitude, longitude);

          // Also persist to DB
          if (driver?.id) {
            updateDriverLocation(driver.id, latitude, longitude).catch(() => {});
          }
        },
        (_error) => {
          console.log('Active Ride GPS error, using fallback');
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 5,
          interval: 3000,
          fastestInterval: 1500,
        },
      );
    };

    startTracking();

    return () => {
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver, rideId, riderId]);

  const handleComplete = async () => {
    if (!driver || !rideId) { return; }
    Alert.alert('Complete Ride?', 'This will end the ride and notify the passenger.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Complete',
        style: 'default',
        onPress: async () => {
          setCompleting(true);
          try {
            await driverCompleteRide(driver.id, rideId);
            // Notify rider via WS
            wsService.send({
              type: 'ride_completed',
              rider_id: riderId,
              ride_id: rideId,
              fare: driver?.total_earnings ?? 75,
            });
            if (watchId.current !== null) {
              Geolocation.clearWatch(watchId.current);
            }
            navigation.navigate('DriverTabs');
          } catch (_e) {
            Alert.alert('Error', 'Could not complete ride.');
          } finally {
            setCompleting(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.topBar}>
        <Text style={s.title}>Active Ride 🚀</Text>
        <View style={s.liveBadge}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Map */}
      <OSMMap
        latitude={driverLoc.lat}
        longitude={driverLoc.lng}
        zoom={15}
        darkMode={true}
        style={s.map}
        markers={[
          {
            lat: driverLoc.lat,
            lng: driverLoc.lng,
            title: 'You',
            emoji: '🚗',
            label: 'YOU',
          },
          {
            lat: BENGALURU.latitude,
            lng: BENGALURU.longitude,
            title: 'Pickup',
            emoji: '📍',
            label: 'PICKUP',
          },
        ]}
        routePath={[
          {lat: driverLoc.lat, lng: driverLoc.lng},
          {lat: driverLoc.lat + 0.01, lng: driverLoc.lng + 0.01},
          {lat: BENGALURU.latitude, lng: BENGALURU.longitude},
        ]}
      />

      {/* Bottom card */}
      <View style={s.bottomCard}>
        <Text style={s.broadcastNote}>
          📡 Broadcasting location every 5s to passenger
        </Text>
        {driver && (
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Text style={s.statNum}>{driver.total_rides}</Text>
              <Text style={s.statLbl}>Rides</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statNum}>⭐ {driver.rating?.toFixed(1) || '5.0'}</Text>
              <Text style={s.statLbl}>Rating</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statNum}>{driver.vehicle_number}</Text>
              <Text style={s.statLbl}>Vehicle</Text>
            </View>
          </View>
        )}
        <TouchableOpacity
          style={[s.completeBtn, completing && s.completeBtnDisabled]}
          onPress={handleComplete}
          disabled={completing}>
          {completing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.completeBtnText}>✓ Mark as Arrived</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#FFFFFF'},
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {color: '#111827', fontSize: 20, fontWeight: '800'},
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b98122',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  liveDot: {width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981'},
  liveText: {color: '#10b981', fontSize: 12, fontWeight: '800'},
  map: {flex: 1},
  markerWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  bottomCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  broadcastNote: {color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginBottom: 16},
  statsRow: {flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16},
  statBox: {alignItems: 'center'},
  statNum: {color: '#10b981', fontSize: 16, fontWeight: '800'},
  statLbl: {color: '#9CA3AF', fontSize: 11, marginTop: 2},
  completeBtn: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  completeBtnDisabled: {opacity: 0.5},
  completeBtnText: {color: '#fff', fontSize: 17, fontWeight: '800'},
});

export default ActiveRideScreen;
