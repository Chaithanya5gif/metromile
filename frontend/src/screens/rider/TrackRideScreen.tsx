import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import wsService from '../../services/websocket';
import {verifyRideOTP, startRide} from '../../services/api';
import OSMMap from '../../components/OSMMap';

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
  const [routePath, setRoutePath] = useState<{lat: number; lng: number}[]>([]);
  const [rideStatus, setRideStatus] = useState<string>('pending');
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  const getVehicleEmoji = () => {
    const type = driverInfo?.vehicle_type?.toLowerCase();
    if (type === 'bike') return '🛵';
    if (type === 'auto') return '🛺';
    if (type === 'mini') return '🚗';
    return '✨'; // priority/premium
  };

  const handleLocationUpdate = useCallback((data: any) => {
    if (data.type === 'location' && data.lat && data.lng) {
      setDriverLocation({lat: data.lat, lng: data.lng});
      // Append to route path for polyline
      setRoutePath(prev => [...prev, {lat: data.lat, lng: data.lng}]);
      // The OSMMap component handles animating to the latest point based on props
    }
  }, []);

  const handleRideAccepted = useCallback((data: any) => {
    if (data.type === 'ride_accepted') {
      setRideStatus(data.status || 'accepted');
      setDriverInfo(data);
      
      // Only show OTP modal for multi-passenger vehicles
      if (data.needs_otp && data.otp) {
        // Show OTP modal when driver arrives (simulated after 5 seconds for demo)
        setTimeout(() => {
          setShowOTPModal(true);
        }, 5000);
      } else {
        // Bike/Scooter - ride starts immediately, no OTP needed
        setRideStatus('active');
      }
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
      accepted: '#581C87',
      active: '#10b981',
      completed: '#10b981',
    };
    return map[rideStatus] || '#6B7280';
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

  const handleShareSafety = async () => {
    try {
      const message = `Track my MetroMile ride! I'm in a ${driverInfo?.vehicle_type || 'vehicle'} (Driver: ${driverInfo?.driver_name || 'Assigned'}). Live map: https://metromile.app/track/${rideId}`;
      await Share.share({
        message,
        title: 'MetroMile Live Track',
      });
    } catch (error) {}
  };

  const handleVerifyOTP = async () => {
    if (!rideId || !otpInput.trim()) {
      Alert.alert('Error', 'Please enter OTP');
      return;
    }
    setVerifying(true);
    try {
      await verifyRideOTP(rideId, otpInput.trim());
      await startRide(rideId);
      setShowOTPModal(false);
      setRideStatus('active');
      Alert.alert('Success', 'Ride started! 🚀');
    } catch (_e) {
      Alert.alert('Invalid OTP', 'Please check the OTP and try again');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Back button */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.topTitle}>Live Tracking</Text>
        <TouchableOpacity onPress={handleShareSafety} style={s.shareBtn}>
          <Text style={s.shareBtnText}>🛡️ Share</Text>
        </TouchableOpacity>
      </View>

      {rideStatus === 'accepted' || rideStatus === 'active' ? (
        <View style={s.liveNotice}>
          <Text style={s.liveNoticeText}>🟢 Live GPS Connected</Text>
        </View>
      ) : null}

      {/* Map */}
      <OSMMap
        latitude={driverLocation ? driverLocation.lat : BENGALURU.latitude}
        longitude={driverLocation ? driverLocation.lng : BENGALURU.longitude}
        zoom={14}
        darkMode={false}
        style={s.map}
        routePath={routePath}
        showUserLocation={true}
        markers={[
          ...(driverLocation
            ? [
                {
                  lat: driverLocation.lat,
                  lng: driverLocation.lng,
                  title: 'Driver',
                  emoji: getVehicleEmoji(),
                  label: 'DRIVER',
                },
              ]
            : []),
          {
            lat: BENGALURU.latitude,
            lng: BENGALURU.longitude,
            title: 'Pickup',
            emoji: '🚇',
            label: 'PICKUP',
          },
        ]}
      />

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
          <ActivityIndicator color="#581C87" style={{marginTop: 12}} />
        )}

        {!rideId && (
          <Text style={s.noRideText}>No active ride. Book one first!</Text>
        )}
      </View>

      {/* OTP Verification Modal */}
      <Modal
        visible={showOTPModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOTPModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>🔐 Enter Pickup OTP</Text>
            <Text style={s.modalSubtitle}>
              Ask the driver for the 4-digit OTP
            </Text>
            <TextInput
              style={s.otpInput}
              value={otpInput}
              onChangeText={setOtpInput}
              placeholder="Enter OTP"
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
            />
            <TouchableOpacity
              style={[s.verifyBtn, verifying && s.verifyBtnDisabled]}
              onPress={handleVerifyOTP}
              disabled={verifying}>
              {verifying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.verifyBtnText}>Verify & Start Ride</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => setShowOTPModal(false)}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#FFFFFF'},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  backBtn: {},
  backText: {color: '#581C87', fontSize: 16, fontWeight: '600'},
  topTitle: {color: '#111827', fontSize: 18, fontWeight: '800'},
  shareBtn: {backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12},
  shareBtnText: {color: '#10b981', fontSize: 13, fontWeight: '700'},
  liveNotice: {
    backgroundColor: '#000',
    padding: 6,
    alignItems: 'center',
  },
  liveNoticeText: {color: '#10b981', fontSize: 11, fontWeight: '700', letterSpacing: 1},
  map: {flex: 1},
  driverMarker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#581C87',
  },
  pickupMarker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DB2777',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 140,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 8,
  },
  statusText: {color: '#111827', fontSize: 16, fontWeight: '700'},
  driverInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
  },
  driverName: {color: '#111827', fontSize: 15, fontWeight: '700'},
  driverVehicle: {color: '#6B7280', fontSize: 13},
  ratingPill: {
    backgroundColor: '#f59e0b22',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ratingText: {color: '#f59e0b', fontWeight: '700'},
  noRideText: {color: '#9CA3AF', textAlign: 'center', marginTop: 12},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  otpInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
    width: '100%',
    marginBottom: 16,
  },
  verifyBtn: {
    backgroundColor: '#581C87',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  verifyBtnDisabled: {opacity: 0.5},
  verifyBtnText: {color: '#fff', fontSize: 17, fontWeight: '800'},
  cancelBtn: {
    padding: 12,
  },
  cancelBtnText: {color: '#6B7280', fontSize: 15, fontWeight: '600'},
});

export default TrackRideScreen;
