import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  TextInput,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import {findAvailableRides, bookRide} from '../../services/api';
import {LOCAL_STATIONS, LOCAL_AREAS} from '../../data/stations';

const LINE_CONFIG = [
  {key: 'purple' as const, label: 'Purple', color: '#7C3AED', apiKey: 'purple_line'},
  {key: 'green' as const, label: 'Green', color: '#10B981', apiKey: 'green_line'},
  {key: 'yellow' as const, label: 'Yellow', color: '#EAB308', apiKey: 'yellow_line'},
];

const VEHICLE_ICONS: Record<string, string> = {
  auto: '🛺',
  mini: '🚗',
  priority: '✨',
  bike: '🛵',
};

const FindPoolScreen: React.FC = () => {
  const {user} = useAuth();
  const navigation = useNavigation<any>();

  const [step, setStep] = useState<'station' | 'area' | 'results'>('station');
  const [line, setLine] = useState<'purple' | 'green' | 'yellow'>('purple');
  // Initialise with local data immediately — no network call needed for browsing
  const [stations, setStations] = useState<{purple_line: string[]; green_line: string[]; yellow_line: string[]}>(LOCAL_STATIONS);
  const [areas, setAreas] = useState<string[]>([]);
  const [selectedStation, setSelectedStation] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [stationSearch, setStationSearch] = useState('');
  const [poolRides, setPoolRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState<number | null>(null);



  const activeLineConfig = LINE_CONFIG.find(l => l.key === line)!;
  const allLineStations =
    line === 'purple' ? stations.purple_line : line === 'green' ? stations.green_line : stations.yellow_line;
  const filteredStations = stationSearch
    ? allLineStations.filter(s => s.toLowerCase().includes(stationSearch.toLowerCase()))
    : allLineStations;

  const handleStationSelect = (station: string) => {
    setSelectedStation(station);
    setSelectedArea('');
    // Use local areas immediately
    const localAreas = LOCAL_AREAS[station] || [];
    setAreas(localAreas);
    setStep('area');
  };

  const handleAreaSelect = async (area: string) => {
    setSelectedArea(area);
    setLoading(true);
    setStep('results');
    try {
      const rides = await findAvailableRides(selectedStation, area);
      // Only show rides that have seats available (not the user's own ride)
      const open = rides.filter(
        (r: any) => r.status === 'pending' && r.rider_id !== user?.id && r.is_carpool === true
      );
      setPoolRides(open);
    } catch (_e) {
      setPoolRides([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (ride: any) => {
    if (!user) return;
    setJoining(ride.id);
    try {
      await bookRide(ride.id, user.id, 1, selectedStation, selectedArea);
      Alert.alert(
        '🎉 Joined Pool!',
        `You've joined the ride from ${ride.metro_station} to ${ride.destination_area}.\nFare: ₹${ride.fare_per_person?.toFixed(0)} per person.`,
        [
          {
            text: 'Track Ride',
            onPress: () =>
              navigation.navigate('RiderTabs', {
                screen: 'Track',
                params: {rideId: ride.id},
              }),
          },
          {text: 'OK', onPress: () => navigation.goBack()},
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Could not join pool. Try another ride.');
    } finally {
      setJoining(null);
    }
  };

  const handleBack = () => {
    if (step === 'results') {
      setStep('area');
      setPoolRides([]);
    } else if (step === 'area') {
      setStep('station');
      setSelectedStation('');
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleBack} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {step === 'station' ? 'Your Metro Station' : step === 'area' ? 'Your Destination' : 'Open Pools'}
        </Text>
        <View style={{width: 50}} />
      </View>

      {/* Info Banner */}
      <View style={s.infoBanner}>
        <Text style={s.infoBannerText}>🤝 Find a live pool ride and split the fare with other riders</Text>
      </View>

      {/* Selected Summary */}
      {selectedStation ? (
        <View style={s.selectedInfo}>
          <View style={s.selectedRow}>
            <View style={[s.selectedDot, {backgroundColor: activeLineConfig.color}]} />
            <Text style={s.selectedText}>{selectedStation}</Text>
          </View>
          {selectedArea ? (
            <>
              <Text style={s.selectedArrow}>↓</Text>
              <View style={s.selectedRow}>
                <View style={[s.selectedDot, {backgroundColor: '#EF4444'}]} />
                <Text style={s.selectedText}>{selectedArea}</Text>
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {/* STEP 1: Station Selection */}
      {step === 'station' && (
        <View style={{flex: 1}}>
          <View style={s.lineRow}>
            {LINE_CONFIG.map(l => (
              <TouchableOpacity
                key={l.key}
                style={[s.lineBtn, line === l.key && {backgroundColor: l.color}]}
                onPress={() => {setLine(l.key); setStationSearch('');}}>
                <Text style={[s.lineBtnText, line === l.key && {color: '#fff'}]}>
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.searchBar}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              style={s.searchInput}
              placeholder="Search station..."
              placeholderTextColor="#9CA3AF"
              value={stationSearch}
              onChangeText={setStationSearch}
            />
            {stationSearch ? (
              <TouchableOpacity onPress={() => setStationSearch('')}>
                <Text style={s.clearBtn}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={s.countLabel}>
            {filteredStations.length} station{filteredStations.length !== 1 ? 's' : ''}
          </Text>

          <FlatList
            data={filteredStations}
            keyExtractor={item => item}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingBottom: 20}}
            renderItem={({item, index}) => (
              <TouchableOpacity style={s.stationItem} onPress={() => handleStationSelect(item)} activeOpacity={0.7}>
                <View style={[s.stationDot, {backgroundColor: activeLineConfig.color + '30'}]}>
                  <View style={[s.stationDotInner, {backgroundColor: activeLineConfig.color}]} />
                </View>
                <View style={s.stationContent}>
                  <Text style={s.stationName}>{item}</Text>
                  <Text style={s.stationIndex}>Station {index + 1}</Text>
                </View>
                <Text style={s.stationArrow}>→</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* STEP 2: Area Selection */}
      {step === 'area' && (
        <View style={{flex: 1}}>
          <Text style={s.stepTitle}>Where are you heading?</Text>
          <FlatList
            data={areas}
            keyExtractor={item => item}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingBottom: 20}}
            numColumns={2}
            columnWrapperStyle={{gap: 10}}
            renderItem={({item}) => (
              <TouchableOpacity style={s.areaCard} onPress={() => handleAreaSelect(item)} activeOpacity={0.7}>
                <Text style={s.areaIcon}>📍</Text>
                <Text style={s.areaName} numberOfLines={2}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* STEP 3: Pool Results */}
      {step === 'results' && (
        <View style={{flex: 1}}>
          {loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="large" color="#7C3AED" />
              <Text style={s.loadingText}>Searching for open pools...</Text>
            </View>
          ) : poolRides.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyIcon}>🔍</Text>
              <Text style={s.emptyTitle}>No open pools found</Text>
              <Text style={s.emptySub}>
                Nobody has started a pool for {selectedStation} → {selectedArea} yet.
              </Text>
              <TouchableOpacity
                style={s.createPoolBtn}
                onPress={() => navigation.navigate('BookRide')}>
                <Text style={s.createPoolBtnText}>Start a Pool Instead →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 40}}>
              <Text style={s.countLabel}>{poolRides.length} open pool{poolRides.length !== 1 ? 's' : ''} found</Text>

              {poolRides.map(ride => (
                <View key={ride.id} style={s.poolCard}>
                  {/* Route */}
                  <View style={s.poolRouteRow}>
                    <Text style={s.poolVehicleIcon}>
                      {VEHICLE_ICONS[ride.vehicle_type] || '🛺'}
                    </Text>
                    <View style={{flex: 1}}>
                      <Text style={s.poolRoute}>
                        {ride.metro_station} → {ride.destination_area}
                      </Text>
                      <Text style={s.poolVehicleType}>
                        {(ride.vehicle_type || 'auto').charAt(0).toUpperCase() + (ride.vehicle_type || 'auto').slice(1)}
                      </Text>
                    </View>
                    <View style={s.poolFareBadge}>
                      <Text style={s.poolFareText}>₹{ride.fare_per_person?.toFixed(0)}</Text>
                      <Text style={s.poolFareLabel}>per person</Text>
                    </View>
                  </View>

                  {/* Seats indicator */}
                  <View style={s.seatsRow}>
                    <Text style={s.seatsLabel}>Available seats</Text>
                    <View style={s.seatDots}>
                      {[...Array(4)].map((_, i) => (
                        <View
                          key={i}
                          style={[
                            s.seatDot,
                            {backgroundColor: i < (ride.seats_needed ?? 1) ? '#7C3AED' : '#E5E7EB'},
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={s.seatsCount}>{ride.seats_needed ?? 1} seat{(ride.seats_needed ?? 1) !== 1 ? 's' : ''}</Text>
                  </View>

                  {/* Savings pill */}
                  <View style={s.savingsPill}>
                    <Text style={s.savingsPillText}>
                      🤝 You save up to ₹{Math.round((ride.fare_per_person || 0) * 0.3)} by pooling
                    </Text>
                  </View>

                  {/* Join Button */}
                  <TouchableOpacity
                    style={[s.joinBtn, joining === ride.id && {opacity: 0.6}]}
                    onPress={() => handleJoin(ride)}
                    disabled={joining === ride.id}>
                    {joining === ride.id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={s.joinBtnText}>Join this Pool →</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#F0FDF4'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {},
  backText: {color: '#10B981', fontSize: 16, fontWeight: '600'},
  headerTitle: {color: '#111827', fontSize: 17, fontWeight: '800'},

  infoBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#D1FAE5',
    borderRadius: 14,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  infoBannerText: {fontSize: 13, color: '#065F46', fontWeight: '600'},

  selectedInfo: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  selectedRow: {flexDirection: 'row', alignItems: 'center'},
  selectedDot: {width: 8, height: 8, borderRadius: 4, marginRight: 10},
  selectedText: {fontSize: 14, fontWeight: '600', color: '#374151', flex: 1},
  selectedArrow: {color: '#9CA3AF', textAlign: 'center', fontSize: 12, marginVertical: 2},

  lineRow: {flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12},
  lineBtn: {flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: '#F3F4F6'},
  lineBtnText: {fontSize: 13, fontWeight: '700', color: '#6B7280'},

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  searchIcon: {fontSize: 16, marginRight: 8},
  searchInput: {flex: 1, height: 44, fontSize: 14, color: '#111827'},
  clearBtn: {fontSize: 16, color: '#9CA3AF', padding: 4},
  countLabel: {fontSize: 12, color: '#9CA3AF', fontWeight: '600', paddingHorizontal: 20, marginBottom: 8},

  stationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  stationDot: {width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12},
  stationDotInner: {width: 10, height: 10, borderRadius: 5},
  stationContent: {flex: 1},
  stationName: {fontSize: 14, fontWeight: '600', color: '#111827'},
  stationIndex: {fontSize: 11, color: '#9CA3AF', marginTop: 2},
  stationArrow: {fontSize: 16, color: '#D1D5DB'},

  stepTitle: {fontSize: 15, fontWeight: '700', color: '#374151', paddingHorizontal: 16, marginBottom: 12},
  areaCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  areaIcon: {fontSize: 24, marginBottom: 8},
  areaName: {fontSize: 13, fontWeight: '600', color: '#374151', textAlign: 'center'},

  loadingWrap: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16},
  loadingText: {color: '#6B7280', fontSize: 14, fontWeight: '600'},

  emptyWrap: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32},
  emptyIcon: {fontSize: 52, marginBottom: 12},
  emptyTitle: {fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8},
  emptySub: {fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24},
  createPoolBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  createPoolBtnText: {color: '#fff', fontSize: 15, fontWeight: '800'},

  poolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  poolRouteRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 14},
  poolVehicleIcon: {fontSize: 32, marginRight: 14},
  poolRoute: {fontSize: 15, fontWeight: '700', color: '#111827'},
  poolVehicleType: {fontSize: 12, color: '#6B7280', marginTop: 2},
  poolFareBadge: {alignItems: 'center', backgroundColor: '#F3E8FF', borderRadius: 12, padding: 8},
  poolFareText: {fontSize: 18, fontWeight: '800', color: '#7C3AED'},
  poolFareLabel: {fontSize: 10, color: '#9CA3AF', fontWeight: '600'},

  seatsRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8},
  seatsLabel: {fontSize: 12, color: '#6B7280', fontWeight: '600'},
  seatDots: {flexDirection: 'row', gap: 5},
  seatDot: {width: 12, height: 12, borderRadius: 6},
  seatsCount: {fontSize: 12, fontWeight: '700', color: '#374151'},

  savingsPill: {
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  savingsPillText: {fontSize: 12, fontWeight: '700', color: '#065F46'},

  joinBtn: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  joinBtnText: {color: '#fff', fontSize: 16, fontWeight: '800'},
});

export default FindPoolScreen;
