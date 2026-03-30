import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import {submitRating} from '../../services/api';

const RatingScreen: React.FC = () => {
  const {user} = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {rideId, driverId} = route.params || {};

  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (stars === 0) {
      Alert.alert('Rate', 'Please select a star rating.');
      return;
    }
    if (!user || !rideId || !driverId) {
      Alert.alert('Error', 'Missing ride or driver information.');
      return;
    }
    setSubmitting(true);
    try {
      await submitRating({
        ride_id: parseInt(rideId),
        rater_id: user.id,
        driver_id: parseInt(driverId),
        stars,
        comment: comment.trim() || undefined,
      });
      setDone(true);
    } catch (_e) {
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.successContainer}>
          <Text style={s.successIcon}>🌟</Text>
          <Text style={s.successTitle}>Thanks for Rating!</Text>
          <Text style={s.successNote}>Your feedback helps improve MetroMile</Text>
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
          <Text style={s.title}>Rate Your Ride</Text>
          <View style={{width: 50}} />
        </View>

        {/* Hero */}
        <View style={s.heroCard}>
          <Text style={s.heroIcon}>🚗</Text>
          <Text style={s.heroTitle}>How was your ride?</Text>
          <Text style={s.heroSub}>Your feedback helps other riders</Text>
        </View>

        {/* Stars */}
        <View style={s.starsRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity key={n} onPress={() => setStars(n)} style={s.starBtn}>
              <Text style={[s.starIcon, stars >= n && s.starIconFilled]}>
                {stars >= n ? '⭐' : '☆'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.starsLabel}>
          {stars === 0 ? 'Tap to rate' : ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][stars]}
        </Text>

        {/* Comment */}
        <Text style={s.label}>Leave a Comment (optional)</Text>
        <TextInput
          style={s.input}
          placeholder="Write something nice... or not 😅"
          placeholderTextColor="#E9D5FF"
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, (submitting || stars === 0) && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting || stars === 0}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.submitBtnText}>Submit Rating →</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('RiderTabs')}
          style={s.skipBtn}>
          <Text style={s.skipText}>Skip for now</Text>
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
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 30,
  },
  heroIcon: {fontSize: 56, marginBottom: 12},
  heroTitle: {color: '#111827', fontSize: 22, fontWeight: '800'},
  heroSub: {color: '#9CA3AF', fontSize: 14, marginTop: 4},
  starsRow: {flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 12},
  starBtn: {padding: 4},
  starIcon: {fontSize: 44, color: '#F3E8FF'},
  starIconFilled: {},
  starsLabel: {color: '#6B7280', textAlign: 'center', fontSize: 15, fontWeight: '600', marginBottom: 24},
  label: {color: '#6B7280', fontSize: 13, fontWeight: '600', marginBottom: 8},
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    color: '#111827',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    minHeight: 100,
    marginBottom: 24,
  },
  submitBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitBtnDisabled: {opacity: 0.4},
  submitBtnText: {color: '#FFFFFF', fontSize: 17, fontWeight: '800'},
  skipBtn: {alignItems: 'center', padding: 12},
  skipText: {color: '#E9D5FF', fontSize: 14},
  successContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32},
  successIcon: {fontSize: 80, marginBottom: 16},
  successTitle: {color: '#111827', fontSize: 28, fontWeight: '800', marginBottom: 8},
  successNote: {color: '#6B7280', fontSize: 14, textAlign: 'center', marginBottom: 40},
  homeBtn: {backgroundColor: '#581C87', borderRadius: 14, padding: 16, width: '100%', alignItems: 'center'},
  homeBtnText: {color: '#fff', fontSize: 16, fontWeight: '700'},
});

export default RatingScreen;
