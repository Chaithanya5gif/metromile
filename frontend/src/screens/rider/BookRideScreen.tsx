import React, {useState, useEffect, useCallback} from 'react';
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
import {getStations, getAreas, createRide, findAvailableRides, bookRide} from '../../services/api';

const LINE_CONFIG = [
  {key: 'purple' as const, label: 'Purple', color: '#7C3AED', bg: '#F5F3FF', apiKey: 'purple_line'},
  {key: 'green' as const, label: 'Green', color: '#10B981', bg: '#ECFDF5', apiKey: 'green_line'},
  {key: 'yellow' as const, label: 'Yellow', color: '#EAB308', bg: '#FEFCE8', apiKey: 'yellow_line'},
];

const BookRideScreen: React.FC = () => {
  const {user} = useAuth();
  const navigation = useNavigation<any>();

  const [line, setLine] = useState<'purple' | 'green' | 'yellow'>('purple');
  const [stations, setStations] = useState<{purple_line: string[]; green_line: string[]; yellow_line: string[]}>({
    purple_line: [],
    green_line: [],
    yellow_line: [],
  });
  const [areas, setAreas] = useState<string[]>([]);
  const [selectedStation, setSelectedStation] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [seats, setSeats] = useState(1);
  const [booking, setBooking] = useState(false);
  const [stationSearch, setStationSearch] = useState('');
  const [step, setStep] = useState<'station' | 'area' | 'pools' | 'confirm'>('station');
  const [availablePools, setAvailablePools] = useState<any[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<number | null>(null);
  const [loadingPools, setLoadingPools] = useState(false);

  useEffect(() => {
    console.log('FETCHING STATIONS...');
    getStations()
      .then(res => {
        console.log('STATIONS LOADED:', Object.keys(res));
        setStations(res);
      })
      .catch(err => {
        console.error('STATIONS ERROR:', err.message || err);
        Alert.alert('Connection Error', 'Failed to fetch metro stations. Please check your internet or redeploy backend.');
      });
  }, []);

  const activeLineConfig = LINE_CONFIG.find(l => l.key === line)!;
  const allLineStations =
    (line === 'purple' ? stations.purple_line : line === 'green' ? stations.green_line : stations.yellow_line) || [];

  const filteredStations = stationSearch
    ? allLineStations.filter(s => s.toLowerCase().includes(stationSearch.toLowerCase()))
    : allLineStations;

  useEffect(() => {
    if (selectedStation) {
      getAreas(selectedStation)
        .then(res => {
          setAreas(res.areas || res || []);
          setSelectedArea('');
        })
        .catch(() => setAreas([]));
    } else {
      setAreas([]);
    }
  }, [selectedStation]);

  const handleStationSelect = (station: string) => {
    setSelectedStation(station);
    setStep('area');
  };

  const handleAreaSelect = async (area: string) => {
    setSelectedArea(area);
    setLoadingPools(true);
    setStep('pools');
    try {
      const pools = await findAvailableRides(selectedStation, area);
      setAvailablePools(pools || []);
    } catch (e) {
      setAvailablePools([]);
    } finally {
      setLoadingPools(false);
    }
  };

  const handleBooking = async () => {
    if (!user || !selectedStation || !selectedArea) return;
    setBooking(true);
    try {
      if (selectedPoolId) {
        await bookRide(selectedPoolId, user.id, seats, selectedStation, selectedArea);
        Alert.alert('🎉 Joined!', `Successfully joined the pool from ${selectedStation} to ${selectedArea}.`, [
          {
            text: 'Track Ride',
            onPress: () =>
              navigation.navigate('RiderTabs', {
                screen: 'Track',
                params: {rideId: selectedPoolId},
              }),
          },
        ]);
      } else {
        const ride = await createRide({
          rider_id: user.id,
          metro_station: selectedStation,
          destination_area: selectedArea,
          exact_destination: selectedArea,
          seats_needed: seats,
        });
        Alert.alert('🎉 Booked!', `Ride created from ${selectedStation} to ${selectedArea}.`, [
          {
            text: 'Track Ride',
            onPress: () =>
              navigation.navigate('RiderTabs', {
                screen: 'Track',
                params: {rideId: ride.id},
              }),
          },
        ]);
      }
    } catch (_e: any) {
      console.log('BOOKING ERROR:', _e.response?.data || _e.message || _e);
      Alert.alert('Error', _e.response?.data?.detail || 'Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('pools');
    } else if (step === 'pools') {
      setStep('area');
      setSelectedArea('');
      setSelectedPoolId(null);
    } else if (step === 'area') {
      setStep('station');
      setSelectedStation('');
      setAreas([]);
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
          {step === 'station' ? 'Select Metro Station' : step === 'area' ? 'Select Destination' : step === 'pools' ? 'Available Pools' : 'Confirm Ride'}
        </Text>
        <View style={{width: 50}} />
      </View>

      {/* Progress Indicator */}
      <View style={s.progressRow}>
        <View style={[s.progressDot, s.progressDotActive]} />
        <View style={[s.progressBar, step !== 'station' && s.progressBarActive]} />
        <View style={[s.progressDot, step !== 'station' && s.progressDotActive]} />
        <View style={[s.progressBar, step === 'confirm' && s.progressBarActive]} />
        <View style={[s.progressDot, step === 'confirm' && s.progressDotActive]} />
      </View>

      {/* Selected Info Summary */}
      {selectedStation && (
        <View style={s.selectedInfo}>
          <View style={s.selectedRow}>
            <View style={[s.selectedDot, {backgroundColor: activeLineConfig.color}]} />
            <Text style={s.selectedText} numberOfLines={1}>{selectedStation}</Text>
          </View>
          {selectedArea ? (
            <>
              <Text style={s.selectedArrow}>↓</Text>
              <View style={s.selectedRow}>
                <View style={[s.selectedDot, {backgroundColor: '#EF4444'}]} />
                <Text style={s.selectedText} numberOfLines={1}>{selectedArea}</Text>
              </View>
            </>
          ) : null}
        </View>
      )}

      {/* STEP 1: Station Selection */}
      {step === 'station' && (
        <View style={{flex: 1}}>
          {/* Line Selector */}
          <View style={s.lineRow}>
            {LINE_CONFIG.map(l => (
              <TouchableOpacity
                key={l.key}
                style={[
                  s.lineBtn,
                  line === l.key && {backgroundColor: l.color},
                ]}
                onPress={() => {
                  setLine(l.key);
                  setSelectedStation('');
                  setStationSearch('');
                }}>
                <Text
                  style={[
                    s.lineBtnText,
                    line === l.key && {color: '#fff'},
                  ]}>
                  {l.label} Line
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Search Bar */}
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

          {/* Station Count */}
          <Text style={s.countLabel}>
            {filteredStations.length} station{filteredStations.length !== 1 ? 's' : ''} on {activeLineConfig.label} Line
          </Text>

          {/* Station List */}
          <FlatList
            data={filteredStations}
            keyExtractor={item => item}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingBottom: 20}}
            renderItem={({item, index}) => (
              <TouchableOpacity
                style={s.stationItem}
                onPress={() => handleStationSelect(item)}
                activeOpacity={0.7}>
                <View style={[s.stationDot, {backgroundColor: activeLineConfig.color + '30'}]}>
                  <View style={[s.stationDotInner, {backgroundColor: activeLineConfig.color}]} />
                </View>
                {index > 0 && <View style={[s.stationLine, {backgroundColor: activeLineConfig.color + '30'}]} />}
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
          <Text style={s.stepTitle}>Where are you heading from {selectedStation}?</Text>
          <FlatList
            data={areas}
            keyExtractor={item => item}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingBottom: 20}}
            numColumns={2}
            columnWrapperStyle={{gap: 10}}
            renderItem={({item}) => (
              <TouchableOpacity
                style={s.areaCard}
                onPress={() => handleAreaSelect(item)}
                activeOpacity={0.7}>
                <Text style={s.areaIcon}>📍</Text>
                <Text style={s.areaName} numberOfLines={2}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* STEP 2.5: Pools Selection */}
      {step === 'pools' && (
        <View style={{flex: 1, paddingHorizontal: 16}}>
          <Text style={s.stepTitle}>Available Pools to {selectedArea}</Text>
          {loadingPools ? (
            <ActivityIndicator size="large" color="#7C3AED" style={{marginTop: 40}} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
              {availablePools.filter(p => p.available_seats > 0).map((pool) => (
                <TouchableOpacity 
                  key={pool.id} 
                  style={[s.poolCard, selectedPoolId === pool.id && s.poolCardActive]}
                  onPress={() => {
                     setSelectedPoolId(pool.id);
                     setStep('confirm');
                  }}
                >
                  <View style={s.poolHeader}>
                    <Text style={s.poolTitle}>Shared Auto Pool</Text>
                    <View style={s.seatsBadge}>
                      <Text style={s.seatsBadgeText}>{pool.available_seats} seats left</Text>
                    </View>
                  </View>
                  <Text style={s.poolRoute}>{pool.metro_station} → {pool.destination_area}</Text>
                </TouchableOpacity>
              ))}

              <View style={s.poolDivider}>
                <View style={s.poolDividerLine} />
                <Text style={s.poolDividerText}>OR</Text>
                <View style={s.poolDividerLine} />
              </View>

              <TouchableOpacity 
                style={s.newPoolCard}
                onPress={() => {
                   setSelectedPoolId(null);
                   setStep('confirm');
                }}
              >
                <Text style={s.newPoolTitle}>+ Start a New Pool</Text>
                <Text style={s.newPoolSub}>Be the first to request a ride for this route</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      )}

      {/* STEP 3: Confirm */}
      {step === 'confirm' && (
        <ScrollView style={{flex: 1}} contentContainerStyle={{paddingBottom: 40}}>
          {/* Route Card */}
          <View style={s.routeCard}>
            <View style={s.routeRow}>
              <View style={[s.routeCircle, {borderColor: activeLineConfig.color}]}>
                <Text style={{fontSize: 16}}>🚇</Text>
              </View>
              <View style={s.routeTextWrap}>
                <Text style={s.routeLabel}>FROM METRO STATION</Text>
                <Text style={s.routeValue}>{selectedStation}</Text>
                <View style={[s.lineBadge, {backgroundColor: activeLineConfig.color + '20'}]}>
                  <Text style={[s.lineBadgeText, {color: activeLineConfig.color}]}>
                    {activeLineConfig.label} Line
                  </Text>
                </View>
              </View>
            </View>

            <View style={s.routeDivider}>
              <View style={[s.routeDividerLine, {backgroundColor: activeLineConfig.color + '30'}]} />
            </View>

            <View style={s.routeRow}>
              <View style={[s.routeCircle, {borderColor: '#EF4444'}]}>
                <Text style={{fontSize: 16}}>📍</Text>
              </View>
              <View style={s.routeTextWrap}>
                <Text style={s.routeLabel}>TO DESTINATION</Text>
                <Text style={s.routeValue}>{selectedArea}</Text>
              </View>
            </View>
          </View>

          {/* Seats */}
          <View style={s.seatsCard}>
            <Text style={s.seatsLabel}>Passengers</Text>
            <View style={s.seatsRow}>
              <TouchableOpacity
                style={s.seatBtn}
                onPress={() => setSeats(Math.max(1, seats - 1))}>
                <Text style={s.seatBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={s.seatsNum}>{seats}</Text>
              <TouchableOpacity
                style={s.seatBtn}
                onPress={() => setSeats(Math.min(4, seats + 1))}>
                <Text style={s.seatBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Fare Breakdown */}
          <View style={s.fareCard}>
            <View style={s.fareRow}>
              <Text style={s.fareItem}>Base Fare</Text>
              <Text style={s.fareItemVal}>₹30</Text>
            </View>
            <View style={s.fareRow}>
              <Text style={s.fareItem}>Distance (approx.)</Text>
              <Text style={s.fareItemVal}>₹45</Text>
            </View>
            <View style={s.fareRow}>
              <Text style={s.fareItem}>Carpool Discount</Text>
              <Text style={[s.fareItemVal, {color: '#10B981'}]}>- Shared</Text>
            </View>
            <View style={s.fareDivider} />
            <View style={s.fareRow}>
              <Text style={s.fareTotal}>Estimated Total</Text>
              <Text style={s.fareTotalVal}>₹{Math.round(75 / seats)} / person</Text>
            </View>
          </View>

          {/* Book Button */}
          <TouchableOpacity
            style={[s.bookBtn, booking && {opacity: 0.5}]}
            onPress={handleBooking}
            disabled={booking}>
            {booking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.bookBtnText}>Confirm Booking →</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#FAF5FF'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {},
  backText: {color: '#7C3AED', fontSize: 16, fontWeight: '600'},
  headerTitle: {color: '#111827', fontSize: 17, fontWeight: '800'},

  // Progress
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginBottom: 12,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: {backgroundColor: '#7C3AED'},
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },
  progressBarActive: {backgroundColor: '#7C3AED'},

  // Selected Info
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

  // Line Selector
  lineRow: {flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12},
  lineBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  lineBtnText: {fontSize: 13, fontWeight: '700', color: '#6B7280'},

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  searchIcon: {fontSize: 16, marginRight: 8},
  searchInput: {flex: 1, height: 44, fontSize: 14, color: '#111827'},
  clearBtn: {fontSize: 16, color: '#9CA3AF', padding: 4},
  countLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 8,
  },

  // Station List
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
  stationDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stationDotInner: {width: 10, height: 10, borderRadius: 5},
  stationLine: {
    position: 'absolute',
    left: 27,
    top: -6,
    width: 3,
    height: 6,
    borderRadius: 1.5,
  },
  stationContent: {flex: 1},
  stationName: {fontSize: 14, fontWeight: '600', color: '#111827'},
  stationIndex: {fontSize: 11, color: '#9CA3AF', marginTop: 2},
  stationArrow: {fontSize: 16, color: '#D1D5DB'},

  // Area
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
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

  // Route Card
  routeCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  routeRow: {flexDirection: 'row', alignItems: 'center'},
  routeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  routeTextWrap: {flex: 1},
  routeLabel: {fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1},
  routeValue: {fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 2},
  lineBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  lineBadgeText: {fontSize: 11, fontWeight: '700'},
  routeDivider: {paddingLeft: 19, marginVertical: 8},
  routeDividerLine: {width: 3, height: 24, borderRadius: 1.5},

  // Seats
  seatsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seatsLabel: {fontSize: 15, fontWeight: '700', color: '#374151'},
  seatsRow: {flexDirection: 'row', alignItems: 'center', gap: 16},
  seatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatBtnText: {fontSize: 20, fontWeight: '700', color: '#7C3AED'},
  seatsNum: {fontSize: 22, fontWeight: '800', color: '#111827', minWidth: 30, textAlign: 'center'},

  // Fare
  fareCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fareItem: {fontSize: 13, color: '#6B7280'},
  fareItemVal: {fontSize: 13, fontWeight: '600', color: '#374151'},
  fareDivider: {height: 1, backgroundColor: '#F3E8FF', marginVertical: 8},
  fareTotal: {fontSize: 15, fontWeight: '700', color: '#111827'},
  fareTotalVal: {fontSize: 18, fontWeight: '800', color: '#7C3AED'},

  // Book
  bookBtn: {
    backgroundColor: '#7C3AED',
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  bookBtnText: {color: '#fff', fontSize: 17, fontWeight: '800'},

  // Pools
  poolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  poolCardActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#FAF5FF',
  },
  poolHeader: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8},
  poolTitle: {fontSize: 15, fontWeight: '700', color: '#111827'},
  seatsBadge: {backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6},
  seatsBadgeText: {fontSize: 11, fontWeight: '700', color: '#10B981'},
  poolRoute: {fontSize: 13, color: '#6B7280'},
  poolDivider: {flexDirection: 'row', alignItems: 'center', marginVertical: 16},
  poolDividerLine: {flex: 1, height: 1, backgroundColor: '#E5E7EB'},
  poolDividerText: {marginHorizontal: 10, fontSize: 13, fontWeight: '700', color: '#9CA3AF'},
  newPoolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  newPoolTitle: {fontSize: 15, fontWeight: '700', color: '#7C3AED', marginBottom: 4},
  newPoolSub: {fontSize: 12, color: '#9CA3AF'},
});

export default BookRideScreen;
