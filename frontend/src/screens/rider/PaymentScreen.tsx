import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import {
  createPayment,
  verifyPayment,
  getRide,
} from '../../services/api';

const METHODS = [
  {id: 'UPI', label: 'UPI', icon: '📱', desc: 'PhonePe / GPay / Paytm'},
  {id: 'Card', label: 'Card', icon: '💳', desc: 'Credit / Debit Card'},
  {id: 'Cash', label: 'Cash', icon: '💵', desc: 'Pay driver directly'},
];

const PaymentScreen: React.FC = () => {
  const {user} = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const rideId: string = route.params?.rideId || '';

  const [method, setMethod] = useState('UPI');
  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [tip, setTip] = useState(0);

  useEffect(() => {
    if (!rideId) { setLoading(false); return; }
    getRide(rideId)
      .then(r => { setRide(r); setLoading(false); })
      .catch(() => setLoading(false));
  }, [rideId]);

  const handlePay = async () => {
    if (!user || !rideId) return;
    setPaying(true);
    try {
      const order = await createPayment({
        ride_id: parseInt(rideId),
        rider_id: user.id,
        amount: (ride?.fare_per_person || 75) + tip,
        method,
      });
      await verifyPayment(order.payment_id);
      setPaid(true);
    } catch (_e) {
      Alert.alert('Payment Error', 'Something went wrong. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  const goToRating = () => {
    navigation.navigate('Rating', {
      rideId,
      driverId: ride?.driver_id,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color="#581C87" style={{marginTop: 50}} />
      </SafeAreaView>
    );
  }

  if (paid) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.successContainer}>
          <Text style={s.successIcon}>✅</Text>
          <Text style={s.successTitle}>Payment Successful!</Text>
          <Text style={s.successAmount}>
            ₹{((ride?.fare_per_person || 75) + tip).toFixed(2)}
          </Text>
          <Text style={s.successNote}>Thank you for carpooling with MetroMile</Text>
          <TouchableOpacity style={s.rateBtn} onPress={goToRating}>
            <Text style={s.rateBtnText}>Rate Your Driver ⭐</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.homeBtn}
            onPress={() => navigation.navigate('RiderTabs')}>
            <Text style={s.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>Payment</Text>
          <View style={{width: 50}} />
        </View>

        {/* Fare Card */}
        <View style={s.fareCard}>
          <Text style={s.fareLabel}>Amount to Pay</Text>
          <Text style={s.fareAmt}>
            ₹{((ride?.fare_per_person || 75) + tip).toFixed(2)}
          </Text>
          <Text style={s.fareRoute}>
            {ride?.metro_station || '—'} → {ride?.destination_area || '—'}
          </Text>
          <View style={s.fareDivider} />
          <View style={s.fareRow}>
            <Text style={s.fareDetail}>Ride Fare ({ride?.vehicle_type || 'auto'})</Text>
            <Text style={s.fareDetailVal}>₹{ride?.fare_per_person?.toFixed(2) || '75.00'}</Text>
          </View>
          {tip > 0 && (
            <View style={s.fareRow}>
              <Text style={s.fareDetail}>Driver Tip</Text>
              <Text style={s.fareDetailVal}>+ ₹{tip}</Text>
            </View>
          )}
        </View>

        {/* Tipping Section */}
        <Text style={s.sectionLabel}>Tip Your Driver</Text>
        <View style={s.tipContainer}>
          {[0, 10, 20, 50].map((amount) => (
            <TouchableOpacity
              key={amount}
              style={[s.tipBtn, tip === amount && s.tipBtnActive]}
              onPress={() => setTip(amount)}>
              <Text style={[s.tipBtnText, tip === amount && s.tipBtnTextActive]}>
                {amount === 0 ? 'No Tip' : `₹${amount}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Methods */}
        <Text style={s.sectionLabel}>Payment Method</Text>
        {METHODS.map(m => (
          <TouchableOpacity
            key={m.id}
            style={[s.methodCard, method === m.id && s.methodCardActive]}
            onPress={() => setMethod(m.id)}>
            <Text style={s.methodIcon}>{m.icon}</Text>
            <View style={s.methodText}>
              <Text style={s.methodLabel}>{m.label}</Text>
              <Text style={s.methodDesc}>{m.desc}</Text>
            </View>
            <View style={[s.radio, method === m.id && s.radioActive]}>
              {method === m.id && <View style={s.radioDot} />}
            </View>
          </TouchableOpacity>
        ))}

        {/* Pay Button */}
        <TouchableOpacity
          style={[s.payBtn, paying && s.payBtnDisabled]}
          onPress={handlePay}
          disabled={paying}>
          {paying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.payBtnText}>
              Pay ₹{((ride?.fare_per_person || 75) + tip).toFixed(2)} →
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#FFFFFF'},
  scroll: {padding: 20, paddingBottom: 40},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24},
  back: {color: '#581C87', fontSize: 16, fontWeight: '600'},
  title: {color: '#111827', fontSize: 20, fontWeight: '800'},
  fareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  fareLabel: {color: '#6B7280', fontSize: 13, fontWeight: '600'},
  fareAmt: {color: '#581C87', fontSize: 48, fontWeight: '800', marginVertical: 8},
  fareRoute: {color: '#6B7280', fontSize: 13, marginBottom: 16},
  fareDivider: {width: '100%', height: 1, backgroundColor: '#F3E8FF', marginBottom: 12},
  fareRow: {flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 8},
  fareDetail: {color: '#6B7280', fontSize: 13},
  fareDetailVal: {color: '#111827', fontSize: 13, fontWeight: '600'},
  sectionLabel: {color: '#6B7280', fontSize: 13, fontWeight: '700', marginBottom: 12},
  tipContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  tipBtn: {flex: 1, backgroundColor: '#FFFFFF', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: 'transparent'},
  tipBtnActive: {borderColor: '#581C87', backgroundColor: '#FAF5FF'},
  tipBtnText: {color: '#4B5563', fontSize: 14, fontWeight: '700'},
  tipBtnTextActive: {color: '#581C87'},
  methodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodCardActive: {borderColor: '#581C87'},
  methodIcon: {fontSize: 28, marginRight: 12},
  methodText: {flex: 1},
  methodLabel: {color: '#111827', fontSize: 15, fontWeight: '700'},
  methodDesc: {color: '#9CA3AF', fontSize: 12},
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#E9D5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {borderColor: '#581C87'},
  radioDot: {width: 10, height: 10, borderRadius: 5, backgroundColor: '#581C87'},
  payBtn: {
    backgroundColor: '#581C87',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#581C87',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  payBtnDisabled: {opacity: 0.5},
  payBtnText: {color: '#fff', fontSize: 17, fontWeight: '800'},
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  successIcon: {fontSize: 72, marginBottom: 16},
  successTitle: {color: '#10b981', fontSize: 28, fontWeight: '800', marginBottom: 8},
  successAmount: {color: '#111827', fontSize: 20, fontWeight: '700', marginBottom: 8},
  successNote: {color: '#6B7280', fontSize: 14, textAlign: 'center', marginBottom: 32},
  rateBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 14,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  rateBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '800'},
  homeBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    width: '100%',
    alignItems: 'center',
  },
  homeBtnText: {color: '#6B7280', fontSize: 15, fontWeight: '600'},
});

export default PaymentScreen;
