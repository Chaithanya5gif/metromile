import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import {getUserRides, updateUserRole} from '../../services/api';

const HomeScreen: React.FC = () => {
  const {user, isDriver, switchRole} = useAuth();
  const navigation = useNavigation<any>();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRides = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getUserRides(user.id);
      setRides(data.slice(0, 5));
    } catch (_e) {
      setRides([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRides();
  }, [fetchRides]);

  const handleRoleToggle = async (val: boolean) => {
    const newRole = val ? 'driver' : 'rider';
    switchRole(newRole);
    if (user) {
      try {
        await updateUserRole(user.id, newRole);
      } catch (_e) {}
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRides();
  };

  const completedRides = rides.filter(r => r.status === 'completed').length;
  const totalSpent = rides
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + (r.fare_per_person || 0), 0);

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      completed: '#10b981',
      active: '#581C87',
      accepted: '#581C87',
      pending: '#f59e0b',
      matched: '#3b82f6',
      cancelled: '#ef4444',
    };
    return map[status] || '#6B7280';
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#581C87" />
        }>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Good day,</Text>
            <Text style={s.userName}>
              {user?.full_name?.split(' ')[0] ?? 'Rider'} 👋
            </Text>
          </View>
          <View style={s.roleToggle}>
            <Text style={s.roleLabel}>{isDriver ? '🚗 Driver' : '🧑 Rider'}</Text>
            <Switch
              value={isDriver}
              onValueChange={handleRoleToggle}
              trackColor={{false: '#F3E8FF', true: '#10b981'}}
              thumbColor={isDriver ? '#fff' : '#581C87'}
            />
          </View>
        </View>

        {/* Stats Row */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{completedRides}</Text>
            <Text style={s.statLabel}>Total Rides</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>₹{totalSpent.toFixed(0)}</Text>
            <Text style={s.statLabel}>Total Spent</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>4.8 ⭐</Text>
            <Text style={s.statLabel}>Your Rating</Text>
          </View>
        </View>

        {/* Book Ride CTA */}
        <TouchableOpacity
          style={s.ctaCard}
          onPress={() => navigation.navigate('BookRide')}
          activeOpacity={0.85}>
          <Text style={s.ctaIcon}>🚇</Text>
          <View style={s.ctaText}>
            <Text style={s.ctaTitle}>Book a Carpool Ride</Text>
            <Text style={s.ctaSub}>Find co-riders & split fare</Text>
          </View>
          <Text style={s.ctaArrow}>→</Text>
        </TouchableOpacity>

        {/* Find Pool CTA */}
        <TouchableOpacity
          style={s.poolCtaCard}
          onPress={() => navigation.navigate('FindPool')}
          activeOpacity={0.85}>
          <Text style={s.ctaIcon}>🤝</Text>
          <View style={s.ctaText}>
            <Text style={s.ctaTitle}>Join an Open Pool</Text>
            <Text style={[s.ctaSub, {color: '#A7F3D0'}]}>Browse live rides & save money</Text>
          </View>
          <Text style={s.ctaArrow}>→</Text>
        </TouchableOpacity>

        {/* Recent Rides */}
        <Text style={s.sectionTitle}>Recent Rides</Text>
        {loading ? (
          <ActivityIndicator color="#581C87" style={{marginTop: 24}} />
        ) : rides.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyIcon}>🗺️</Text>
            <Text style={s.emptyText}>No rides yet. Book your first one!</Text>
          </View>
        ) : (
          <FlatList
            data={rides}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            renderItem={({item}) => (
              <View style={s.rideCard}>
                <View style={s.rideLeft}>
                  <Text style={s.rideStation}>{item.metro_station}</Text>
                  <Text style={s.rideArrow}>→ {item.destination_area}</Text>
                </View>
                <View style={s.rideRight}>
                  <View
                    style={[s.badge, {backgroundColor: statusColor(item.status) + '22'}]}>
                    <Text style={[s.badgeText, {color: statusColor(item.status)}]}>
                      {item.status}
                    </Text>
                  </View>
                  <Text style={s.rideFare}>₹{item.fare_per_person?.toFixed(0)}</Text>
                </View>
              </View>
            )}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#FFFFFF'},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 8,
  },
  greeting: {color: '#6B7280', fontSize: 14},
  userName: {color: '#111827', fontSize: 26, fontWeight: '800'},
  roleToggle: {alignItems: 'center', gap: 4},
  roleLabel: {color: '#6B7280', fontSize: 12, fontWeight: '600'},
  statsRow: {flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16},
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  statNum: {color: '#111827', fontSize: 20, fontWeight: '800'},
  statLabel: {color: '#9CA3AF', fontSize: 11, marginTop: 4},
  ctaCard: {
    marginHorizontal: 16,
    backgroundColor: '#581C87',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#581C87',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  poolCtaCard: {
    marginHorizontal: 16,
    backgroundColor: '#059669',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#059669',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaIcon: {fontSize: 32, marginRight: 12},
  ctaText: {flex: 1},
  ctaTitle: {color: '#fff', fontSize: 18, fontWeight: '700'},
  ctaSub: {color: '#c7d2fe', fontSize: 13, marginTop: 2},
  ctaArrow: {color: '#fff', fontSize: 24, fontWeight: '700'},
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  emptyCard: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {fontSize: 40, marginBottom: 8},
  emptyText: {color: '#9CA3AF', fontSize: 14, textAlign: 'center'},
  rideCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rideLeft: {flex: 1},
  rideStation: {color: '#111827', fontSize: 15, fontWeight: '700'},
  rideArrow: {color: '#6B7280', fontSize: 13, marginTop: 4},
  rideRight: {alignItems: 'flex-end'},
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
  badgeText: {fontSize: 11, fontWeight: '700', textTransform: 'uppercase'},
  rideFare: {color: '#581C87', fontSize: 16, fontWeight: '800'},
});

export default HomeScreen;
