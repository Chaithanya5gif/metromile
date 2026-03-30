import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import {getDriverByUser} from '../../services/api';

const PEAK_TIPS = [
  {time: '8–10 AM', label: 'Morning Rush', multiplier: '1.3x', icon: '🌅'},
  {time: '12–2 PM', label: 'Lunch Hour', multiplier: '1.1x', icon: '☀️'},
  {time: '6–9 PM', label: 'Evening Rush', multiplier: '1.5x', icon: '🌆'},
  {time: '10 PM+', label: 'Night Surge', multiplier: '1.2x', icon: '🌙'},
];

const EarningsScreen: React.FC = () => {
  const {user} = useAuth();
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDriver = useCallback(async () => {
    if (!user?.id) return;
    try {
      const d = await getDriverByUser(user.id);
      setDriver(d);
    } catch (_e) {}
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchDriver();
    }, [fetchDriver]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDriver();
  };

  // Simulated stats
  const todayEarnings = driver ? Math.min(driver.total_earnings * 0.2, driver.total_earnings).toFixed(0) : '0';
  const weekEarnings = driver ? Math.min(driver.total_earnings * 0.6, driver.total_earnings).toFixed(0) : '0';
  const perRide = driver && driver.total_rides > 0
    ? (driver.total_earnings / driver.total_rides).toFixed(0)
    : '75';

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color="#10b981" style={{marginTop: 60}} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }>

        {/* Header */}
        <Text style={s.pageTitle}>Earnings 💰</Text>

        {/* Hero Card */}
        <View style={s.heroCard}>
          <Text style={s.heroLabel}>Total Lifetime Earnings</Text>
          <Text style={s.heroAmt}>₹{(driver?.total_earnings ?? 0).toFixed(2)}</Text>
          <View style={s.heroMeta}>
            <View style={s.heroPill}>
              <Text style={s.heroPillText}>
                {driver?.total_rides ?? 0} Rides Completed
              </Text>
            </View>
            <View style={s.heroPill}>
              <Text style={s.heroPillText}>
                ⭐ {driver?.rating?.toFixed(1) ?? '5.0'} Avg Rating
              </Text>
            </View>
          </View>
        </View>

        {/* Period Breakdown */}
        <View style={s.statsGrid}>
          <View style={s.statCard}>
            <Text style={s.statPeriod}>Today</Text>
            <Text style={s.statAmt}>₹{todayEarnings}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statPeriod}>This Week</Text>
            <Text style={s.statAmt}>₹{weekEarnings}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statPeriod}>Avg / Ride</Text>
            <Text style={s.statAmt}>₹{perRide}</Text>
          </View>
        </View>

        {/* Peak Hours */}
        <Text style={s.sectionTitle}>Peak Hour Tips 🔥</Text>
        {PEAK_TIPS.map(tip => (
          <View key={tip.label} style={s.tipCard}>
            <Text style={s.tipIcon}>{tip.icon}</Text>
            <View style={s.tipBody}>
              <Text style={s.tipLabel}>{tip.label}</Text>
              <Text style={s.tipTime}>{tip.time}</Text>
            </View>
            <View style={s.multiplierBadge}>
              <Text style={s.multiplierText}>{tip.multiplier}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#FFFFFF'},
  pageTitle: {color: '#111827', fontSize: 24, fontWeight: '800', padding: 20, paddingBottom: 8},
  heroCard: {
    marginHorizontal: 16,
    backgroundColor: '#4C1D95',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroLabel: {color: '#FAF5FF', fontSize: 13, fontWeight: '600'},
  heroAmt: {color: '#ffffff', fontSize: 52, fontWeight: '800', marginVertical: 8},
  heroMeta: {flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center'},
  heroPill: {backgroundColor: '#2E1065', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6},
  heroPillText: {color: '#FAF5FF', fontSize: 12, fontWeight: '600'},
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  statPeriod: {color: '#9CA3AF', fontSize: 11, fontWeight: '600', marginBottom: 4},
  statAmt: {color: '#10b981', fontSize: 18, fontWeight: '800'},
  sectionTitle: {color: '#111827', fontSize: 18, fontWeight: '700', paddingHorizontal: 16, marginBottom: 12},
  tipCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  tipIcon: {fontSize: 28},
  tipBody: {flex: 1},
  tipLabel: {color: '#111827', fontSize: 14, fontWeight: '700'},
  tipTime: {color: '#9CA3AF', fontSize: 12, marginTop: 2},
  multiplierBadge: {backgroundColor: '#10b98122', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6},
  multiplierText: {color: '#10b981', fontWeight: '800', fontSize: 15},
});

export default EarningsScreen;
