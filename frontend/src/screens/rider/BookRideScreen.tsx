import React, {useState, useEffect} from 'react';
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
import {createRide} from '../../services/api';
import {LOCAL_STATIONS, LOCAL_AREAS} from '../../data/stations';

const LINE_CONFIG = [
  {key: 'purple' as const, label: 'Purple', color: '#7C3AED', bg: '#F5F3FF', apiKey: 'purple_line'},
  {key: 'green' as const, label: 'Green', color: '#10B981', bg: '#ECFDF5', apiKey: 'green_line'},
  {key: 'yellow' as const, label: 'Yellow', color: '#EAB308', bg: '#FEFCE8', apiKey: 'yellow_line'},
];

const BookRideScreen: React.FC = () => {
  const {user} = useAuth();
  const navigation = useNavigation<any>();

  const [line, setLine] = useState<'purple' | 'green' | 'yellow'>('purple');
  // Start with local data immediately — no loading, no error
  const [stations, setStations] = useState<{purple_line: string[]; green_line: string[]; yellow_line: string[]}>(LOCAL_STATIONS);
  const [areas, setAreas] = useState<string[]>([]);
  const [selectedStation, setSelectedStation] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [seats, setSeats] = useState(1);
  const [booking, setBooking] = useState(false);
  const [stationSearch, setStationSearch] = useState('');
  const [step, setStep] = useState<'station' | 'area' | 'choose' | 'poolchoice' | 'matches' | 'confirm'>('station');
  const [vehicleType, setVehicleType] = useState<'auto' | 'mini' | 'priority' | 'bike'>('auto');
  const [isCarpool, setIsCarpool] = useState(false);
  const [farePerPerson, setFarePerPerson] = useState(85);
  const [nearbyDrivers, setNearbyDrivers] = useState<any[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);



  const activeLineConfig = LINE_CONFIG.find(l => l.key === line)!;
  const allLineStations =
    (line === 'purple' ? stations.purple_line : line === 'green' ? stations.green_line : stations.yellow_line) || [];

  const filteredStations = stationSearch
    ? allLineStations.filter(s => s.toLowerCase().includes(stationSearch.toLowerCase()))
    : allLineStations;


  const handleStationSelect = (station: string) => {
    setSelectedStation(station);
    // Use local areas instantly, then refresh from API silently
    const localAreas = LOCAL_AREAS[station] || [];
    setAreas(localAreas);
    setSelectedArea('');
    setStep('area');
  };

  const handleAreaSelect = async (area: string) => {
    setSelectedArea(area);
    setStep('choose');
  };

  const getDynamicDrivers = (type: string, baseFare: number) => {
    const vehicles = {
      auto: ['Bajaj RE CNG', 'Piaggio Ape City', 'Mahindra Treo'],
      mini: ['Tata Tiago CNG', 'Maruti Celerio', 'Hyundai i10'],
      priority: ['Toyota Innova', 'Honda City', 'Kia Seltos'],
      bike: ['Ather 450X ⚡', 'Ola S1 Pro ⚡', 'TVS iQube ⚡'],
    };
    const vList = vehicles[type as keyof typeof vehicles] || vehicles.auto;
    return [
      {id: 101, name: 'Elena Rodriguez', rating: 4.9, vehicle: vList[0], away: '0.4 km away', time: '2 min', fare: baseFare},
      {id: 102, name: 'Marcus Chen', rating: 5.0, vehicle: vList[1], away: '1.2 km away', time: '5 min', fare: baseFare},
      {id: 103, name: 'Vikram Singh', rating: 4.7, vehicle: vList[2], away: '1.8 km away', time: '8 min', fare: baseFare},
    ];
  };

  const handleChooseRide = (type: 'auto' | 'mini' | 'priority' | 'bike', fare: number, allowCarpool: boolean) => {
    setVehicleType(type);
    setFarePerPerson(fare);
    setIsCarpool(false);

    if (allowCarpool) {
      // Show pool/solo choice screen first
      setStep('poolchoice');
    } else {
      // No carpool for priority/bike — go straight to matches
      setLoadingDrivers(true);
      setStep('matches');
      setTimeout(() => {
        setNearbyDrivers(getDynamicDrivers(type, fare));
        setLoadingDrivers(false);
      }, 1500);
    }
  };

  const handlePoolChoice = (wantsPool: boolean) => {
    setIsCarpool(wantsPool);
    setLoadingDrivers(true);
    setStep('matches');
    setTimeout(() => {
      setNearbyDrivers(getDynamicDrivers(vehicleType, farePerPerson));
      setLoadingDrivers(false);
    }, 1500);
  };

  const handleBooking = async () => {
    if (!user || !selectedStation || !selectedArea) return;
    setBooking(true);
    try {

        const ride = await createRide({
          rider_id: user.id,
          metro_station: selectedStation,
          destination_area: selectedArea,
          exact_destination: selectedArea,
          seats_needed: seats,
          vehicle_type: vehicleType,
          fare_per_person: Math.round((isCarpool ? farePerPerson * (vehicleType === 'mini' ? 0.6 : 0.7) : farePerPerson) / seats),
          is_carpool: isCarpool
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

    } catch (_e: any) {
      console.log('BOOKING ERROR:', _e.response?.data || _e.message || _e);
      Alert.alert('Error', _e.response?.data?.detail || 'Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('matches');
    } else if (step === 'matches') {
      // Go back to pool choice if the vehicle supports carpool, else choose
      if (vehicleType === 'auto' || vehicleType === 'mini') {
        setStep('poolchoice');
      } else {
        setStep('choose');
      }
    } else if (step === 'poolchoice') {
      setStep('choose');
    } else if (step === 'choose') {
      setStep('area');
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
          {step === 'station' ? 'Select Metro Station' : step === 'area' ? 'Select Destination' : step === 'choose' ? 'Choose a Ride' : step === 'poolchoice' ? 'Ride Mode' : step === 'matches' ? 'Nearby Matches' : 'Confirm Ride'}
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

      {/* STEP 3: Choose a Ride */}
      {step === 'choose' && (
        <View style={{flex: 1}}>
          <ScrollView contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 40}}>
            
            {/* Auto Card */}
            <TouchableOpacity style={[s.rideOptionCard, vehicleType === 'auto' && s.rideOptionActive]} onPress={() => handleChooseRide('auto', 72, true)}>
              <View style={s.rideIconWrap}><Text style={s.rideIcon}>🛺</Text></View>
              <View style={s.rideTextWrap}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Text style={s.rideOptionName}>Auto</Text>
                  <View style={s.recBadge}><Text style={s.recBadgeText}>Recommended</Text></View>
                </View>
                <Text style={s.rideOptionSub}>2 min away • Pocket friendly</Text>
              </View>
              <Text style={s.rideOptionPrice}>₹72</Text>
            </TouchableOpacity>

            {/* Mini Card */}
            <TouchableOpacity style={[s.rideOptionCard, vehicleType === 'mini' && s.rideOptionActive]} onPress={() => handleChooseRide('mini', 105, true)}>
              <View style={s.rideIconWrap}><Text style={s.rideIcon}>🚗</Text></View>
              <View style={s.rideTextWrap}>
                <Text style={s.rideOptionName}>Mini</Text>
                <Text style={s.rideOptionSub}>5 min away • Standard cars</Text>
              </View>
              <Text style={s.rideOptionPrice}>₹105</Text>
            </TouchableOpacity>

            {/* Priority Card */}
            <TouchableOpacity style={[s.rideOptionCard, vehicleType === 'priority' && s.rideOptionActive]} onPress={() => handleChooseRide('priority', 145, false)}>
              <View style={s.rideIconWrap}><Text style={s.rideIcon}>✨</Text></View>
              <View style={s.rideTextWrap}>
                <Text style={s.rideOptionName}>Priority</Text>
                <Text style={s.rideOptionSub}>1 min away • Elite cars</Text>
              </View>
              <Text style={s.rideOptionPrice}>₹145</Text>
            </TouchableOpacity>

            {/* Electric Scooty Card */}
            <TouchableOpacity style={[s.rideOptionCard, vehicleType === 'bike' && s.rideOptionActive]} onPress={() => handleChooseRide('bike', 40, false)}>
              <View style={[s.rideIconWrap, {backgroundColor: '#D1FAE5'}]}><Text style={s.rideIcon}>🛵</Text></View>
              <View style={s.rideTextWrap}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Text style={s.rideOptionName}>E-Scooty</Text>
                  <View style={[s.recBadge, {backgroundColor: '#059669'}]}><Text style={s.recBadgeText}>⚡ Electric</Text></View>
                </View>
                <Text style={s.rideOptionSub}>3 min away • Zero emissions</Text>
              </View>
              <Text style={[s.rideOptionPrice, {color: '#059669'}]}>₹40</Text>
            </TouchableOpacity>

          </ScrollView>
        </View>
      )}

      {/* STEP 3b: Pool or Solo Choice */}
      {step === 'poolchoice' && (
        <View style={{flex: 1, paddingHorizontal: 16, paddingTop: 8}}>
          <Text style={s.stepTitle}>How would you like to ride?</Text>
          <Text style={[s.stepTitle, {fontSize: 13, color: '#6B7280', fontWeight: '400', marginTop: -8, marginBottom: 20}]}>
            Choose between a private solo ride or share with others and save.
          </Text>

          {/* Solo Option */}
          <TouchableOpacity
            style={s.poolCard}
            onPress={() => handlePoolChoice(false)}
            activeOpacity={0.85}>
            <View style={s.poolIconCircle}>
              <Text style={{fontSize: 32}}>🧍</Text>
            </View>
            <View style={{flex: 1, marginLeft: 16}}>
              <Text style={s.poolCardTitle}>Solo Ride</Text>
              <Text style={s.poolCardSub}>Private ride, just for you</Text>
              <View style={s.poolPriceBadge}>
                <Text style={s.poolPriceText}>₹{farePerPerson}</Text>
              </View>
            </View>
            <Text style={{fontSize: 22, color: '#D1D5DB'}}>→</Text>
          </TouchableOpacity>

          {/* Pool Option */}
          <TouchableOpacity
            style={[s.poolCard, s.poolCardHighlight]}
            onPress={() => handlePoolChoice(true)}
            activeOpacity={0.85}>
            <View style={[s.poolIconCircle, {backgroundColor: '#D1FAE5'}]}>
              <Text style={{fontSize: 32}}>🧑‍🤝‍🧑</Text>
            </View>
            <View style={{flex: 1, marginLeft: 16}}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={s.poolCardTitle}>Start a Pool</Text>
                <View style={s.saveBadge}>
                  <Text style={s.saveBadgeText}>Save {vehicleType === 'mini' ? '40' : '30'}%</Text>
                </View>
              </View>
              <Text style={s.poolCardSub}>Share ride, share costs</Text>
              <View style={[s.poolPriceBadge, {backgroundColor: '#D1FAE5'}]}>
                <Text style={[s.poolPriceText, {color: '#059669'}]}>
                  ₹{Math.round(farePerPerson * (vehicleType === 'mini' ? 0.6 : 0.7))}
                </Text>
              </View>
            </View>
            <Text style={{fontSize: 22, color: '#10B981'}}>→</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 4: Nearby Matches */}
      {step === 'matches' && (
        <View style={{flex: 1}}>
          {loadingDrivers ? (
            <ActivityIndicator size="large" color="#7C3AED" style={{marginTop: 40}} />
          ) : (
            <ScrollView contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 40}}>
              <Text style={s.countLabel}>{nearbyDrivers.length} Active Drivers found</Text>
              {nearbyDrivers.map(d => (
                <TouchableOpacity key={d.id} style={s.driverCard} onPress={() => setStep('confirm')}>
                  <View style={s.driverRow}>
                    <View style={s.driverAvatar}><Text style={{fontSize: 24}}>👤</Text></View>
                    <View style={s.driverInfo}>
                      <Text style={s.driverName}>{d.name}</Text>
                      <Text style={s.driverVehicle}>⭐ {d.rating} • {d.vehicle}</Text>
                    </View>
                    <Text style={s.driverFare}>₹{d.fare}</Text>
                  </View>
                  <View style={s.driverDetailsRow}>
                    <View style={s.detailBadge}><Text style={s.detailText}>⏱ Departs in {d.time}</Text></View>
                    <View style={s.detailBadge}><Text style={s.detailText}>📍 {d.away}</Text></View>
                  </View>
                </TouchableOpacity>
              ))}
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
            
            {(vehicleType === 'auto' || vehicleType === 'mini') && (
              <View style={s.carpoolToggleRow}>
                <Text style={s.carpoolToggleTitle}>Carpool Option (Save {(vehicleType === 'mini' ? '40' : '30')}%)</Text>
                <TouchableOpacity 
                  style={[s.toggleBox, isCarpool && s.toggleBoxActive]} 
                  onPress={() => setIsCarpool(!isCarpool)}>
                  <Text style={[s.toggleBoxText, isCarpool && s.toggleBoxTextActive]}>
                    {isCarpool ? 'Enabled ✓' : 'Off'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={s.fareRow}>
              <Text style={s.fareItem}>Base Fare</Text>
              <Text style={s.fareItemVal}>₹{farePerPerson}</Text>
            </View>
            
            {isCarpool && (
              <View style={s.fareRow}>
                <Text style={s.fareItem}>Carpool Discount</Text>
                <Text style={[s.fareItemVal, {color: '#10B981'}]}>- ₹{Math.round(farePerPerson * (vehicleType === 'mini' ? 0.4 : 0.3))}</Text>
              </View>
            )}
            
            <View style={s.fareDivider} />
            <View style={s.fareRow}>
              <Text style={s.fareTotal}>Estimated Total</Text>
              <Text style={s.fareTotalVal}>₹{Math.round((isCarpool ? farePerPerson * (vehicleType === 'mini' ? 0.6 : 0.7) : farePerPerson) / seats)}</Text>
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

  // Choose Ride Options
  rideOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  rideOptionActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#FAF5FF',
  },
  rideIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rideIcon: {fontSize: 24},
  rideTextWrap: {flex: 1},
  rideOptionName: {fontSize: 16, fontWeight: '800', color: '#111827'},
  recBadge: {backgroundColor: '#4C1D95', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8},
  recBadgeText: {fontSize: 10, color: '#fff', fontWeight: '700'},
  rideOptionSub: {fontSize: 12, color: '#6B7280', marginTop: 2},
  rideOptionPrice: {fontSize: 18, fontWeight: '800', color: '#111827'},

  // Driver Match Card
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  driverRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 16},
  driverAvatar: {width: 50, height: 50, borderRadius: 25, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginRight: 14},
  driverInfo: {flex: 1},
  driverName: {fontSize: 17, fontWeight: '800', color: '#111827'},
  driverVehicle: {fontSize: 13, color: '#6B7280', marginTop: 2},
  driverFare: {fontSize: 22, fontWeight: '800', color: '#4C1D95'},
  driverDetailsRow: {flexDirection: 'row', gap: 10},
  detailBadge: {backgroundColor: '#F3E8FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20},
  detailText: {fontSize: 12, fontWeight: '700', color: '#4C1D95'},

  carpoolToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3E8FF',
  },
  carpoolToggleTitle: {fontSize: 14, fontWeight: '700', color: '#111827'},
  toggleBox: {paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#E5E7EB'},
  toggleBoxActive: {backgroundColor: '#10B981'},
  toggleBoxText: {fontSize: 13, fontWeight: '700', color: '#6B7280'},
  toggleBoxTextActive: {color: '#fff'},

  // Pool / Solo Choice
  poolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  poolCardHighlight: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  poolIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  poolCardTitle: {fontSize: 18, fontWeight: '800', color: '#111827'},
  poolCardSub: {fontSize: 13, color: '#6B7280', marginTop: 2},
  poolPriceBadge: {
    marginTop: 8,
    backgroundColor: '#F3E8FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  poolPriceText: {fontSize: 15, fontWeight: '800', color: '#7C3AED'},
  saveBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  saveBadgeText: {fontSize: 10, color: '#fff', fontWeight: '800'},
});

export default BookRideScreen;
