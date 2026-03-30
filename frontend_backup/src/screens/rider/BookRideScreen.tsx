import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Picker} from '@react-native-picker/picker';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import {getStations, getAreas, createRide, findMatches} from '../../services/api';

const BookRideScreen: React.FC = () => {
  const {user} = useAuth();
  const navigation = useNavigation<any>();

  const [line, setLine] = useState<'purple' | 'green'>('purple');
  const [stations, setStations] = useState<{purple_line: string[]; green_line: string[]}>({
    purple_line: [],
    green_line: [],
  });
  const [areas, setAreas] = useState<string[]>([]);
  const [selectedStation, setSelectedStation] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [seats, setSeats] = useState(1);
  const [matches, setMatches] = useState<any>(null);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    getStations()
      .then(setStations)
      .catch(() => {});
  }, []);

  const lineStations =
    line === 'purple' ? stations.purple_line : stations.green_line;

  useEffect(() => {
    if (selectedStation) {
      getAreas(selectedStation)
        .then(res => {
          setAreas(res.areas || []);
          setSelectedArea('');
        })
        .catch(() => setAreas([]));
    }
  }, [selectedStation]);

  const handleFindMatches = useCallback(async () => {
    if (!selectedStation || !selectedArea) {
      Alert.alert('Select', 'Please select a station and destination area.');
      return;
    }
    setLoadingMatch(true);
    try {
      const data = await findMatches(selectedStation, selectedArea);
      setMatches(data);
    } catch (_e) {
      setMatches(null);
      Alert.alert('Error', 'Could not fetch matches. Creating new ride group.');
    } finally {
      setLoadingMatch(false);
    }
  }, [selectedStation, selectedArea]);

  const handleBooking = async () => {
    if (!user || !selectedStation || !selectedArea) return;
    setBooking(true);
    try {
      const ride = await createRide({
        rider_id: user.id,
        metro_station: selectedStation,
        destination: selectedArea,
        destination_area: selectedArea,
        seats_needed: seats,
      });
      Alert.alert('🎉 Booked!', `Ride created. Fare: ₹${ride.fare_per_person}`, [
        {
          text: 'Track Ride',
          onPress: () =>
            navigation.navigate('RiderTabs', {
              screen: 'Track',
              params: {rideId: ride.id},
            }),
        },
      ]);
    } catch (_e) {
      Alert.alert('Error', 'Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>Book a Ride</Text>
          <View style={{width: 50}} />
        </View>

        {/* Line Selector */}
        <Text style={s.label}>Metro Line</Text>
        <View style={s.lineRow}>
          {(['purple', 'green'] as const).map(l => (
            <TouchableOpacity
              key={l}
              style={[
                s.lineBtn,
                {borderColor: l === 'purple' ? '#6366f1' : '#10b981'},
                line === l && {
                  backgroundColor: l === 'purple' ? '#6366f1' : '#10b981',
                },
              ]}
              onPress={() => {
                setLine(l);
                setSelectedStation('');
                setSelectedArea('');
                setMatches(null);
              }}>
              <Text
                style={[s.lineBtnText, line === l && {color: '#fff'}]}>
                {l === 'purple' ? '🟣 Purple Line' : '🟢 Green Line'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Station Picker */}
        <Text style={s.label}>Pickup Station</Text>
        <View style={s.pickerWrap}>
          <Picker
            selectedValue={selectedStation}
            onValueChange={v => {
              setSelectedStation(v as string);
              setMatches(null);
            }}
            style={s.picker}
            dropdownIconColor="#94a3b8">
            <Picker.Item label="Choose station..." value="" color="#64748b" />
            {lineStations.map(st => (
              <Picker.Item key={st} label={st} value={st} color="#f8fafc" />
            ))}
          </Picker>
        </View>

        {/* Area Picker */}
        <Text style={s.label}>Destination Area</Text>
        <View style={s.pickerWrap}>
          <Picker
            selectedValue={selectedArea}
            onValueChange={v => {
              setSelectedArea(v as string);
              setMatches(null);
            }}
            style={s.picker}
            dropdownIconColor="#94a3b8">
            <Picker.Item label="Choose area..." value="" color="#64748b" />
            {areas.map(a => (
              <Picker.Item key={a} label={a} value={a} color="#f8fafc" />
            ))}
          </Picker>
        </View>

        {/* Seats */}
        <Text style={s.label}>Seats Needed</Text>
        <View style={s.seatRow}>
          {[1, 2, 3, 4].map(n => (
            <TouchableOpacity
              key={n}
              style={[s.seatCircle, seats === n && s.seatCircleActive]}
              onPress={() => setSeats(n)}>
              <Text style={[s.seatNum, seats === n && s.seatNumActive]}>
                {n}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Find Matches */}
        <TouchableOpacity
          style={s.matchBtn}
          onPress={handleFindMatches}
          disabled={loadingMatch}>
          {loadingMatch ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.matchBtnText}>Find Carpool Matches 🔎</Text>
          )}
        </TouchableOpacity>

        {/* Match Results */}
        {matches && (
          <View style={s.matchCard}>
            <Text style={s.matchTitle}>
              {matches.match_groups?.length > 0
                ? `✅ ${matches.match_groups.length} Carpool Group(s) Found`
                : '🆕 No existing matches — you\'ll start a new group'}
            </Text>
            {matches.match_groups?.map((g: any, i: number) => (
              <View key={i} style={s.groupRow}>
                <Text style={s.groupText}>
                  Group {i + 1}: {g.total_seats} seats · ₹{g.fare_per_person}/person
                </Text>
              </View>
            ))}
            {matches.nearby_drivers?.length > 0 && (
              <Text style={s.driversNote}>
                🚗 {matches.nearby_drivers.length} driver(s) available nearby
              </Text>
            )}
          </View>
        )}

        {/* Fare Info */}
        <View style={s.fareCard}>
          <Text style={s.fareTitle}>Estimated Fare</Text>
          <Text style={s.fareAmt}>
            ₹{Math.round((30 + 15 * 3) / seats)}{' '}
            <Text style={s.farePerPerson}>/ person</Text>
          </Text>
          <Text style={s.fareNote}>₹30 base + ₹15/km · Shared among {seats} rider(s)</Text>
        </View>

        {/* Book Button */}
        <TouchableOpacity
          style={[s.bookBtn, booking && s.bookBtnDisabled]}
          onPress={handleBooking}
          disabled={booking || !selectedStation || !selectedArea}>
          {booking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.bookBtnText}>Confirm Booking →</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#0f172a'},
  scroll: {padding: 20, paddingBottom: 40},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  back: {color: '#6366f1', fontSize: 16, fontWeight: '600'},
  title: {color: '#f8fafc', fontSize: 20, fontWeight: '800'},
  label: {color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16},
  lineRow: {flexDirection: 'row', gap: 12},
  lineBtn: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  lineBtnText: {color: '#94a3b8', fontWeight: '700', fontSize: 14},
  pickerWrap: {backgroundColor: '#1e293b', borderRadius: 12, overflow: 'hidden', marginBottom: 4},
  picker: {color: '#f8fafc'},
  seatRow: {flexDirection: 'row', gap: 12, flexWrap: 'wrap'},
  seatCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  seatCircleActive: {backgroundColor: '#6366f1', borderColor: '#6366f1'},
  seatNum: {color: '#94a3b8', fontSize: 20, fontWeight: '800'},
  seatNumActive: {color: '#fff'},
  matchBtn: {
    backgroundColor: '#334155',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  matchBtnText: {color: '#f8fafc', fontSize: 15, fontWeight: '700'},
  matchCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  matchTitle: {color: '#10b981', fontWeight: '700', marginBottom: 10},
  groupRow: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  groupText: {color: '#f8fafc', fontSize: 13},
  driversNote: {color: '#6366f1', fontSize: 13, marginTop: 8, fontWeight: '600'},
  fareCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  fareTitle: {color: '#94a3b8', fontSize: 13, fontWeight: '600'},
  fareAmt: {color: '#6366f1', fontSize: 36, fontWeight: '800', marginTop: 4},
  farePerPerson: {fontSize: 16, color: '#94a3b8', fontWeight: '400'},
  fareNote: {color: '#64748b', fontSize: 12, marginTop: 4, textAlign: 'center'},
  bookBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#6366f1',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  bookBtnDisabled: {opacity: 0.5},
  bookBtnText: {color: '#fff', fontSize: 17, fontWeight: '800'},
});

export default BookRideScreen;
