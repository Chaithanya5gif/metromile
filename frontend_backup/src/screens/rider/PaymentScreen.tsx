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
  getRidePayment,
  createPaymentOrder,
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
      const order = await createPaymentOrder({
        ride_id: rideId,
        rider_id: user.id,
        method,
      });
      await verifyPayment({
        payment_id: order.payment_id,
        razorpay_payment_id: `pay_demo_${Date.now()}`,
      });
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
        <ActivityIndicator color="#6366f1" style={{marginTop: 50}} />
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
            ₹{ride?.fare_per_person?.toFixed(2) || '—'}
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
            ₹{ride?.fare_per_person?.toFixed(2) || '—'}
          </Text>
          <Text style={s.fareRoute}>
            {ride?.metro_station || '—'} → {ride?.destination_area || '—'}
          </Text>
          <View style={s.fareDivider} />
          <View style={s.fareRow}>
            <Text style={s.fareDetail}>Base Fare</Text>
            <Text style={s.fareDetailVal}>₹30</Text>
          </View>
          <View style={s.fareRow}>
            <Text style={s.fareDetail}>Distance (~3km)</Text>
            <Text style={s.fareDetailVal}>₹45</Text>
          </View>
          <View style={s.fareRow}>
            <Text style={s.fareDetail}>Carpool Discount</Text>
            <Text style={[s.fareDetailVal, {color: '#10b981'}]}>- Shared</Text>
          </View>
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
              Pay ₹{ride?.fare_per_person?.toFixed(2) || '—'} →
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#0f172a'},
  scroll: {padding: 20, paddingBottom: 40},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24},
  back: {color: '#6366f1', fontSize: 16, fontWeight: '600'},
  title: {color: '#f8fafc', fontSize: 20, fontWeight: '800'},
  fareCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  fareLabel: {color: '#94a3b8', fontSize: 13, fontWeight: '600'},
  fareAmt: {color: '#6366f1', fontSize: 48, fontWeight: '800', marginVertical: 8},
  fareRoute: {color: '#94a3b8', fontSize: 13, marginBottom: 16},
  fareDivider: {width: '100%', height: 1, backgroundColor: '#334155', marginBottom: 12},
  fareRow: {flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 8},
  fareDetail: {color: '#94a3b8', fontSize: 13},
  fareDetailVal: {color: '#f8fafc', fontSize: 13, fontWeight: '600'},
  sectionLabel: {color: '#94a3b8', fontSize: 13, fontWeight: '700', marginBottom: 12},
  methodCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodCardActive: {borderColor: '#6366f1'},
  methodIcon: {fontSize: 28, marginRight: 12},
  methodText: {flex: 1},
  methodLabel: {color: '#f8fafc', fontSize: 15, fontWeight: '700'},
  methodDesc: {color: '#64748b', fontSize: 12},
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {borderColor: '#6366f1'},
  radioDot: {width: 10, height: 10, borderRadius: 5, backgroundColor: '#6366f1'},
  payBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#6366f1',
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
  successAmount: {color: '#f8fafc', fontSize: 20, fontWeight: '700', marginBottom: 8},
  successNote: {color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 32},
  rateBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 14,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  rateBtnText: {color: '#0f172a', fontSize: 16, fontWeight: '800'},
  homeBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    width: '100%',
    alignItems: 'center',
  },
  homeBtnText: {color: '#94a3b8', fontSize: 15, fontWeight: '600'},
});

export default PaymentScreen;
