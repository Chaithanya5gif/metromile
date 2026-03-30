import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MapView, {Marker, PROVIDER_DEFAULT} from 'react-native-maps';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import wsService from '../../services/websocket';

const BENGALURU = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const TrackRideScreen: React.FC = () => {
  const {user} = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const rideId = route.params?.rideId;

  const [driverLocation, setDriverLocation] = useState<{lat: number; lng: number} | null>(null);
  const [rideStatus, setRideStatus] = useState<string>('pending');
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const mapRef = useRef<MapView>(null);

  const handleLocationUpdate = useCallback((data: any) => {
    if (data.type === 'location' && data.lat && data.lng) {
      setDriverLocation({lat: data.lat, lng: data.lng});
      mapRef.current?.animateToRegion({
        latitude: data.lat,
        longitude: data.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  }, []);

  const handleRideAccepted = useCallback((data: any) => {
    if (data.type === 'ride_accepted') {
      setRideStatus('accepted');
      setDriverInfo(data);
    }
  }, []);

  const handleRideCompleted = useCallback((data: any) => {
    if (data.type === 'ride_completed') {
      setRideStatus('completed');
      // Navigate to payment
      setTimeout(() => {
        navigation.navigate('Payment', {rideId: data.ride_id || rideId});
      }, 1500);
    }
  }, [navigation, rideId]);

  useEffect(() => {
    if (!user) return;
    wsService.connect(user.id);
    wsService.on('location', handleLocationUpdate);
    wsService.on('ride_accepted', handleRideAccepted);
    wsService.on('ride_completed', handleRideCompleted);

    return () => {
      wsService.off('location', handleLocationUpdate);
      wsService.off('ride_accepted', handleRideAccepted);
      wsService.off('ride_completed', handleRideCompleted);
    };
  }, [user, handleLocationUpdate, handleRideAccepted, handleRideCompleted]);

  const statusColor = () => {
    const map: Record<string, string> = {
      pending: '#f59e0b',
      matched: '#3b82f6',
      accepted: '#6366f1',
      active: '#10b981',
      completed: '#10b981',
    };
    return map[rideStatus] || '#94a3b8';
  };

  const statusLabel = () => {
    const map: Record<string, string> = {
      pending: '⏳ Waiting for driver...',
      matched: '🔗 Matched! Driver assigning...',
      accepted: '🚗 Driver on the way!',
      active: '🚀 Ride in progress',
      completed: '✅ Arrived!',
    };
    return map[rideStatus] || 'Tracking...';
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Back button */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.topTitle}>Live Tracking</Text>
        <View style={{width: 60}} />
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={s.map}
        initialRegion={BENGALURU}>
        {driverLocation && (
          <Marker
            coordinate={{
              latitude: driverLocation.lat,
              longitude: driverLocation.lng,
            }}
            title="Driver"
            description="Your driver">
            <View style={s.driverMarker}>
              <Text style={{fontSize: 24}}>🚗</Text>
            </View>
          </Marker>
        )}
        {/* Pickup marker */}
        <Marker coordinate={{latitude: 12.9716, longitude: 77.5946}} title="Pickup">
          <View style={s.pickupMarker}>
            <Text style={{fontSize: 20}}>🚇</Text>
          </View>
        </Marker>
      </MapView>

      {/* Status Card */}
      <View style={s.statusCard}>
        <View style={[s.statusDot, {backgroundColor: statusColor()}]} />
        <Text style={s.statusText}>{statusLabel()}</Text>

        {driverInfo && (
          <View style={s.driverInfoRow}>
            <View>
              <Text style={s.driverName}>{driverInfo.driver_name || 'Driver'}</Text>
              <Text style={s.driverVehicle}>
                {driverInfo.vehicle_number} · {driverInfo.vehicle_type}
              </Text>
            </View>
            <View style={s.ratingPill}>
              <Text style={s.ratingText}>⭐ {driverInfo.rating || '5.0'}</Text>
            </View>
          </View>
        )}

        {rideStatus === 'pending' && (
          <ActivityIndicator color="#6366f1" style={{marginTop: 12}} />
        )}

        {!rideId && (
          <Text style={s.noRideText}>No active ride. Book one first!</Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#0f172a'},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#0f172a',
  },
  backBtn: {},
  backText: {color: '#6366f1', fontSize: 16, fontWeight: '600'},
  topTitle: {color: '#f8fafc', fontSize: 18, fontWeight: '800'},
  map: {flex: 1},
  driverMarker: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  pickupMarker: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 4,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  statusCard: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 140,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 8,
  },
  statusText: {color: '#f8fafc', fontSize: 16, fontWeight: '700'},
  driverInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
  },
  driverName: {color: '#f8fafc', fontSize: 15, fontWeight: '700'},
  driverVehicle: {color: '#94a3b8', fontSize: 13},
  ratingPill: {
    backgroundColor: '#f59e0b22',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ratingText: {color: '#f59e0b', fontWeight: '700'},
  noRideText: {color: '#64748b', textAlign: 'center', marginTop: 12},
});

export default TrackRideScreen;
