import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import {
  getDriverByUser,
  registerDriver,
  toggleDriverAvailability,
  updateUserRole,
  getDriverRides,
  acceptRide,
} from '../../services/api';
import wsService from '../../services/websocket';
import MapView, {Marker, PROVIDER_DEFAULT} from 'react-native-maps';
import {midnightMapStyle} from '../../styles/MapStyle';

const BENGALURU = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const DriverHomeScreen: React.FC = () => {
  const {user} = useAuth();
  const navigation = useNavigation<any>();
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [pendingRides, setPendingRides] = useState<any[]>([]);

  const loadDriver = useCallback(async () => {
    if (!user) return;
    try {
      const d = await getDriverByUser(user.id);
      setDriver(d);
    } catch (_err) {
      try {
        const d = await registerDriver({
          user_id: user.id,
          vehicle_number: 'KA01AB1234',
          vehicle_type: 'Car',
        });
        setDriver(d);
      } catch (_e2) {}
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchRequests = useCallback(async () => {
    if (!user || !driver?.is_available) return;
    try {
      const data = await getDriverRides(user.id);
      setPendingRides(data);
    } catch (_e) {}
  }, [user, driver?.is_available]);

  useEffect(() => {
    loadDriver();
  }, [loadDriver]);

  useEffect(() => {
    if (user && driver?.is_available) {
      wsService.connect(user.id);
      const interval = setInterval(fetchRequests, 5000);
      fetchRequests();
      return () => {
        wsService.disconnect();
        clearInterval(interval);
      };
    }
  }, [user, driver?.is_available, fetchRequests]);

  const handleToggle = async () => {
    if (!user) return;
    setToggling(true);
    try {
      const res = await toggleDriverAvailability(user.id);
      setDriver({...driver, is_available: res.is_available});
      if (!res.is_available) {
        setPendingRides([]);
      }
    } catch (_e) {
      Alert.alert('Error', 'Could not update availability.');
    } finally {
      setToggling(false);
    }
  };

  const handleAccept = async (rideId: number) => {
    if (!user) return;
    try {
      await acceptRide(user.id, rideId);
      Alert.alert('Accepted!', 'Go to the pickup location.');
      navigation.navigate('Rides');
    } catch (_e) {
      Alert.alert('Error', 'Ride might no longer be available.');
      fetchRequests();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator color="#4B164C" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const latestReq = pendingRides[0];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
        
        {/* Superior Header */}
        <View style={s.topBar}>
          <View style={s.headerAvatar}>
            <Text style={{fontSize: 22}}>🧔</Text>
          </View>
          <Text style={s.brandTitle}>MetroMile</Text>
          <View style={s.toggleGroup}>
            <TouchableOpacity 
              style={[s.toggleBtn, driver?.is_available && s.toggleBtnActive]} 
              onPress={handleToggle}
              disabled={toggling}>
              <Text style={[s.toggleText, driver?.is_available && s.toggleTextActive]}>Available</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[s.toggleBtn, !driver?.is_available && s.toggleBtnActiveOffline]} 
              onPress={handleToggle}
              disabled={toggling}>
              <Text style={[s.toggleText, !driver?.is_available && s.toggleTextActive]}>Busy</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Map Card */}
        <View style={s.mapCardWrap}>
          <MapView
            provider={PROVIDER_DEFAULT}
            style={s.mapPreview}
            initialRegion={BENGALURU}
            customMapStyle={midnightMapStyle}
            scrollEnabled={false}>
            <Marker coordinate={BENGALURU} />
          </MapView>
          {driver?.is_available && (
            <View style={s.trackingPill}>
              <View style={s.liveDot} />
              <Text style={s.trackingText}>Live Tracking Active</Text>
            </View>
          )}
        </View>

        {/* Earnings Info */}
        <View style={s.earningsSection}>
          <Text style={s.earningsLabel}>TODAY'S EARNINGS</Text>
          <Text style={s.earningsAmt}>₹{(driver?.total_earnings ?? 0).toFixed(2)}</Text>
          <View style={s.progressBar}>
            <View style={[s.progressFill, {width: `${Math.min((driver?.total_earnings || 0) / 10, 100)}%`}]} />
          </View>
        </View>

        {/* Request Card */}
        {latestReq ? (
          <View style={s.requestCard}>
            <View style={s.reqHeader}>
              <View style={s.newBadge}><Text style={s.newBadgeText}>NEW REQUEST</Text></View>
              <Text style={s.reqFare}>₹{(latestReq.fare_per_person || 75).toFixed(0)}</Text>
            </View>
            
            <Text style={s.reqTitle}>Ride to {latestReq.destination_area}</Text>
            <Text style={s.reqEst}>EST. FARE / SEAT</Text>

            <View style={s.locRow}>
               <View style={s.locDot} />
               <View>
                 <Text style={s.locLabel}>PICKUP</Text>
                 <Text style={s.locMain}>{latestReq.metro_station} Metro</Text>
               </View>
            </View>

            <View style={s.locRow}>
               <View style={s.locSquare} />
               <View>
                 <Text style={s.locLabel}>DESTINATION</Text>
                 <Text style={s.locMain}>{latestReq.destination_area}</Text>
               </View>
            </View>

            <View style={s.actionRow}>
              <TouchableOpacity style={s.declineBtn} onPress={fetchRequests}>
                <Text style={s.declineText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.acceptBtn} onPress={() => handleAccept(latestReq.id)}>
                <Text style={s.acceptText}>Accept Request →</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={s.emptyRequests}>
            <Text style={{fontSize: 40, marginBottom: 12}}>😴</Text>
            <Text style={s.emptyText}>No pending requests.</Text>
            <Text style={s.emptySub}>Staying available increases your chances!</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#FAF5FF'},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  brandTitle: {fontSize: 20, fontWeight: '800', color: '#4B164C', flex: 1},
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F3E8FF',
    borderRadius: 20,
    padding: 4,
  },
  toggleBtn: {paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16},
  toggleBtnActive: {backgroundColor: '#4B164C'},
  toggleBtnActiveOffline: {backgroundColor: '#E5E7EB'},
  toggleText: {fontSize: 12, fontWeight: '700', color: '#6B7280'},
  toggleTextActive: {color: '#fff'},
  mapCardWrap: {
    margin: 16,
    height: 200,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  mapPreview: {flex: 1},
  trackingPill: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {width: 8, height: 8, borderRadius: 4, backgroundColor: '#DB2777'},
  trackingText: {fontSize: 12, fontWeight: '700', color: '#4B164C'},
  earningsSection: {padding: 24},
  earningsLabel: {fontSize: 12, fontWeight: '700', color: '#6B7280', letterSpacing: 1},
  earningsAmt: {fontSize: 48, fontWeight: '800', color: '#4B164C', marginTop: 4},
  progressBar: {height: 6, backgroundColor: '#F3E8FF', borderRadius: 3, marginTop: 16, overflow: 'hidden'},
  progressFill: {width: '65%', height: '100%', backgroundColor: '#DB2777'},
  requestCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  reqHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
  newBadge: {backgroundColor: '#DB2777', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8},
  newBadgeText: {color: '#fff', fontSize: 10, fontWeight: '800'},
  reqFare: {fontSize: 28, fontWeight: '800', color: '#4B164C'},
  reqTitle: {fontSize: 22, fontWeight: '800', color: '#4B164C'},
  reqEst: {fontSize: 10, fontWeight: '700', color: '#9CA3AF', marginBottom: 20, marginTop: 4, textAlign: 'right'},
  locRow: {flexDirection: 'row', gap: 16, marginBottom: 20},
  locDot: {width: 12, height: 12, borderRadius: 6, backgroundColor: '#DB2777', marginTop: 4},
  locSquare: {width: 12, height: 12, backgroundColor: '#4B164C', marginTop: 4},
  locLabel: {fontSize: 10, fontWeight: '700', color: '#9CA3AF', marginBottom: 2},
  locMain: {fontSize: 15, fontWeight: '700', color: '#4B164C'},
  actionRow: {flexDirection: 'row', gap: 12, marginTop: 10},
  declineBtn: {
    flex: 1,
    padding: 18,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#4B164C',
    alignItems: 'center',
  },
  declineText: {color: '#4B164C', fontWeight: '800', fontSize: 16},
  acceptBtn: {
    flex: 1.5,
    padding: 18,
    borderRadius: 30,
    backgroundColor: '#4B164C',
    alignItems: 'center',
  },
  acceptText: {color: '#fff', fontWeight: '800', fontSize: 16},
  emptyRequests: {
    margin: 16,
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F3E8FF',
    borderStyle: 'dashed',
  },
  emptyText: {fontSize: 18, fontWeight: '800', color: '#4B164C', marginBottom: 4},
  emptySub: {fontSize: 13, color: '#9CA3AF', textAlign: 'center'},
});

export default DriverHomeScreen;
