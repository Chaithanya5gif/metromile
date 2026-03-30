import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
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
} from '../../services/api';
import wsService from '../../services/websocket';

const DriverHomeScreen: React.FC = () => {
  const {user, switchRole} = useAuth();
  const navigation = useNavigation<any>();
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const loadDriver = useCallback(async () => {
    if (!user) return;
    try {
      const d = await getDriverByUser(user.id);
      setDriver(d);
    } catch (_err) {
      // Driver not registered yet — create with placeholder vehicle
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

  useEffect(() => {
    loadDriver();
  }, [loadDriver]);

  useEffect(() => {
    if (user && driver?.is_available) {
      wsService.connect(user.id);
    }
    return () => wsService.disconnect();
  }, [user, driver?.is_available]);

  const handleToggle = async (val: boolean) => {
    if (!driver) return;
    setToggling(true);
    try {
      await toggleDriverAvailability(driver.id, val);
      setDriver({...driver, is_available: val});
      if (val) {
        wsService.connect(user!.id);
      } else {
        wsService.disconnect();
      }
    } catch (_e) {
      Alert.alert('Error', 'Could not update availability.');
    } finally {
      setToggling(false);
    }
  };

  const switchToRider = async () => {
    switchRole('rider');
    if (user) {
      await updateUserRole(user.id, 'rider').catch(() => {});
    }
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
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Welcome back,</Text>
            <Text style={s.driverName}>
              {user?.full_name?.split(' ')[0] || 'Driver'} 🚗
            </Text>
          </View>
          <TouchableOpacity style={s.switchBtn} onPress={switchToRider}>
            <Text style={s.switchBtnText}>Switch to Rider</Text>
          </TouchableOpacity>
        </View>

        {/* Online/Offline card */}
        <View style={[s.statusCard, driver?.is_available ? s.statusCardOnline : s.statusCardOffline]}>
          <View>
            <Text style={s.statusTitle}>
              {driver?.is_available ? '🟢 Online' : '🔴 Offline'}
            </Text>
            <Text style={s.statusSub}>
              {driver?.is_available
                ? 'You are visible to passengers'
                : 'Go online to receive ride requests'}
            </Text>
          </View>
          {toggling ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Switch
              value={driver?.is_available || false}
              onValueChange={handleToggle}
              trackColor={{false: '#334155', true: '#10b981'}}
              thumbColor="#fff"
            />
          )}
        </View>

        {/* Stats Grid */}
        <View style={s.statsGrid}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{driver?.total_rides ?? 0}</Text>
            <Text style={s.statLabel}>Total Rides</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>⭐ {driver?.rating?.toFixed(1) ?? '5.0'}</Text>
            <Text style={s.statLabel}>Rating</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>₹{(driver?.total_earnings ?? 0).toFixed(0)}</Text>
            <Text style={s.statLabel}>Earnings</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{driver?.vehicle_type ?? 'Car'}</Text>
            <Text style={s.statLabel}>Vehicle</Text>
          </View>
        </View>

        {/* Vehicle Info */}
        {driver && (
          <View style={s.vehicleCard}>
            <Text style={s.vehicleIcon}>🚙</Text>
            <View>
              <Text style={s.vehicleNum}>{driver.vehicle_number}</Text>
              <Text style={s.vehicleType}>{driver.vehicle_type}</Text>
            </View>
          </View>
        )}

        {/* Go to Rides */}
        <TouchableOpacity
          style={s.ridesBtn}
          onPress={() => navigation.navigate('Rides')}>
          <Text style={s.ridesBtnText}>View Pending Rides →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#0f172a'},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 8,
  },
  greeting: {color: '#94a3b8', fontSize: 14},
  driverName: {color: '#f8fafc', fontSize: 26, fontWeight: '800'},
  switchBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  switchBtnText: {color: '#94a3b8', fontSize: 12, fontWeight: '600'},
  statusCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusCardOnline: {backgroundColor: '#064e3b'},
  statusCardOffline: {backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155'},
  statusTitle: {color: '#f8fafc', fontSize: 20, fontWeight: '800', marginBottom: 4},
  statusSub: {color: '#94a3b8', fontSize: 12, maxWidth: 200},
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statNum: {color: '#10b981', fontSize: 22, fontWeight: '800'},
  statLabel: {color: '#64748b', fontSize: 12, marginTop: 4},
  vehicleCard: {
    marginHorizontal: 16,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  vehicleIcon: {fontSize: 32},
  vehicleNum: {color: '#f8fafc', fontSize: 18, fontWeight: '800'},
  vehicleType: {color: '#94a3b8', fontSize: 13},
  ridesBtn: {
    marginHorizontal: 16,
    backgroundColor: '#10b981',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#10b981',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  ridesBtnText: {color: '#fff', fontSize: 16, fontWeight: '800'},
});

export default DriverHomeScreen;
