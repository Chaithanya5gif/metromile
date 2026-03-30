import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import {getUserRides} from '../../services/api';

const STATUS_COLORS: Record<string, string> = {
  completed: '#10b981',
  active: '#6366f1',
  accepted: '#6366f1',
  pending: '#f59e0b',
  matched: '#3b82f6',
  cancelled: '#ef4444',
};

const RideHistoryScreen: React.FC = () => {
  const {user} = useAuth();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRides = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getUserRides(user.id);
      setRides(data);
    } catch (_e) {
      setRides([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchRides();
    }, [fetchRides]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRides();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color="#6366f1" style={{marginTop: 60}} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <Text style={s.pageTitle}>Ride History</Text>
      <FlatList
        data={rides}
        keyExtractor={item => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
        ListEmptyComponent={
          <View style={s.emptyCard}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={s.emptyText}>No rides yet. Book your first ride!</Text>
          </View>
        }
        renderItem={({item}) => (
          <View style={s.rideCard}>
            <View style={s.rideHeader}>
              <View style={{flex: 1}}>
                <Text style={s.station}>{item.metro_station}</Text>
                <Text style={s.area}>→ {item.destination_area}</Text>
              </View>
              <View
                style={[
                  s.badge,
                  {backgroundColor: (STATUS_COLORS[item.status] || '#94a3b8') + '22'},
                ]}>
                <Text
                  style={[
                    s.badgeText,
                    {color: STATUS_COLORS[item.status] || '#94a3b8'},
                  ]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={s.rideMeta}>
              <Text style={s.metaText}>🗓 {formatDate(item.created_at)}</Text>
              <Text style={s.metaText}>👥 {item.seats_needed} seat(s)</Text>
              <Text style={s.fare}>₹{item.fare_per_person?.toFixed(0)}/person</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#0f172a'},
  pageTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
    padding: 20,
    paddingBottom: 8,
  },
  list: {padding: 16, paddingTop: 8, paddingBottom: 40},
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyIcon: {fontSize: 40, marginBottom: 12},
  emptyText: {color: '#64748b', fontSize: 14, textAlign: 'center'},
  rideCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  rideHeader: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12},
  station: {color: '#f8fafc', fontSize: 16, fontWeight: '700'},
  area: {color: '#94a3b8', fontSize: 13, marginTop: 4},
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {fontSize: 10, fontWeight: '800', letterSpacing: 0.5},
  rideMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
  },
  metaText: {color: '#64748b', fontSize: 12},
  fare: {color: '#6366f1', fontSize: 15, fontWeight: '800'},
});

export default RideHistoryScreen;
