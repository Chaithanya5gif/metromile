import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import {getDriverByUser, acceptRide} from '../../services/api';
import wsService from '../../services/websocket';

const DriverRidesScreen: React.FC = () => {
  const {user} = useAuth();
  const navigation = useNavigation<any>();
  const [pendingRides, setPendingRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [driver, setDriver] = useState<any>(null);

  const loadDriver = useCallback(async () => {
    if (!user) return;
    try {
      const d = await getDriverByUser(user.id);
      setDriver(d);
    } catch (_e) {}
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadDriver();
      setLoading(false);
    }, [loadDriver]),
  );

  // Listen for ride requests via WebSocket
  useEffect(() => {
    const handleRideRequest = (data: any) => {
      if (data.type === 'ride_request') {
        setPendingRides(prev => {
          const exists = prev.some(r => r.ride_id === data.ride_id);
          if (exists) return prev;
          return [
            {
              ride_id: data.ride_id,
              station: data.station,
              destination: data.destination,
              fare: data.fare,
              seats: data.seats,
              rider_id: data.rider_id,
              expires: Date.now() + 120000, // 2 min timeout
            },
            ...prev,
          ];
        });
      }
    };

    wsService.on('ride_request', handleRideRequest);
    return () => wsService.off('ride_request', handleRideRequest);
  }, []);

  // Remove expired rides every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setPendingRides(prev => prev.filter(r => r.expires > now));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (ride: any) => {
    if (!driver) {
      Alert.alert('Error', 'Driver profile not loaded.');
      return;
    }
    setAccepting(ride.ride_id);
    try {
      await acceptRide(driver.id, ride.ride_id);
      // Notify rider via WS
      wsService.send({
        type: 'ride_accepted',
        rider_id: ride.rider_id,
        driver_id: driver.id,
        driver_name: user?.full_name,
        vehicle_number: driver.vehicle_number,
        vehicle_type: driver.vehicle_type,
        rating: driver.rating,
        ride_id: ride.ride_id,
      });
      setPendingRides(prev => prev.filter(r => r.ride_id !== ride.ride_id));
      navigation.navigate('ActiveRide', {rideId: ride.ride_id, riderId: ride.rider_id});
    } catch (_e) {
      Alert.alert('Error', 'Could not accept ride. It may have been taken.');
    } finally {
      setAccepting(null);
    }
  };

  const timeLeft = (expires: number) => {
    const secs = Math.max(0, Math.floor((expires - Date.now()) / 1000));
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color="#10b981" style={{marginTop: 60}} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <Text style={s.pageTitle}>Pending Rides</Text>
      <FlatList
        data={pendingRides}
        keyExtractor={item => item.ride_id}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.emptyCard}>
            <Text style={s.emptyIcon}>📡</Text>
            <Text style={s.emptyTitle}>Waiting for Rides</Text>
            <Text style={s.emptyText}>
              Go online on the Dashboard to receive ride requests
            </Text>
          </View>
        }
        renderItem={({item}) => (
          <View style={s.rideCard}>
            <View style={s.cardHeader}>
              <Text style={s.stationText}>{item.station}</Text>
              <View style={s.timerPill}>
                <Text style={s.timerText}>⏱ {timeLeft(item.expires)}</Text>
              </View>
            </View>
            <Text style={s.destination}>→ {item.destination}</Text>
            <View style={s.metaRow}>
              <Text style={s.metaItem}>👥 {item.seats} seat(s)</Text>
              <Text style={s.metaItem}>💰 ₹{item.fare}/person</Text>
            </View>
            <TouchableOpacity
              style={[s.acceptBtn, accepting === item.ride_id && s.acceptBtnDisabled]}
              onPress={() => handleAccept(item)}
              disabled={accepting === item.ride_id}>
              {accepting === item.ride_id ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.acceptBtnText}>✓ Accept Ride</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#FFFFFF'},
  pageTitle: {color: '#111827', fontSize: 24, fontWeight: '800', padding: 20, paddingBottom: 8},
  list: {padding: 16, paddingTop: 8, paddingBottom: 40},
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    marginTop: 32,
  },
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyTitle: {color: '#111827', fontSize: 18, fontWeight: '700', marginBottom: 8},
  emptyText: {color: '#9CA3AF', textAlign: 'center', fontSize: 14},
  rideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6},
  stationText: {color: '#111827', fontSize: 17, fontWeight: '800'},
  timerPill: {backgroundColor: '#f59e0b22', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4},
  timerText: {color: '#f59e0b', fontWeight: '700', fontSize: 13},
  destination: {color: '#6B7280', fontSize: 14, marginBottom: 12},
  metaRow: {flexDirection: 'row', gap: 16, marginBottom: 16},
  metaItem: {color: '#9CA3AF', fontSize: 14},
  acceptBtn: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  acceptBtnDisabled: {opacity: 0.5},
  acceptBtnText: {color: '#fff', fontSize: 15, fontWeight: '800'},
});

export default DriverRidesScreen;
