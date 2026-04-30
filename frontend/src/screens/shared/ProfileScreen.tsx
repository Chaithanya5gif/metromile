import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../../context/AuthContext';

const ProfileScreen: React.FC = () => {
  const {user, isDriver, logout, switchRole} = useAuth();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const handleRoleSwitch = () => {
    const newRole = isDriver ? 'rider' : 'driver';
    switchRole(newRole);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Text style={s.pageTitle}>Profile</Text>

        {/* Avatar Card */}
        <View style={[s.avatarCard, isDriver ? s.driverCard : s.riderCard]}>
          <View style={[s.avatarCircle, isDriver ? s.driverCircle : s.riderCircle]}>
            <Text style={s.avatarEmoji}>{isDriver ? '👨‍✈️' : '🧑‍💼'}</Text>
          </View>
          <Text style={s.userName}>{user?.full_name && !['Rider', 'User', 'Driver', 'Metro Driver'].includes(user.full_name) ? user.full_name : 'Metro Member'}</Text>
          <View style={[s.roleBadge, {backgroundColor: isDriver ? '#FEF3F2' : '#F3E8FF'}]}>
            <Text style={[s.roleText, {color: isDriver ? '#B91C1C' : '#581C87'}]}>
              {isDriver ? '🚗 Driver' : '🧑 Rider'}
            </Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>ACCOUNT INFO</Text>

          <View style={s.infoRow}>
            <Text style={s.infoIcon}>📧</Text>
            <View style={s.infoContent}>
              <Text style={s.infoLabel}>Email</Text>
              <Text style={s.infoValue}>{user?.email || '—'}</Text>
            </View>
          </View>

          <View style={s.divider} />

          <View style={s.infoRow}>
            <Text style={s.infoIcon}>🆔</Text>
            <View style={s.infoContent}>
              <Text style={s.infoLabel}>User ID</Text>
              <Text style={s.infoValue}>{user?.id || '—'}</Text>
            </View>
          </View>

          <View style={s.divider} />

          <View style={s.infoRow}>
            <Text style={s.infoIcon}>📱</Text>
            <View style={s.infoContent}>
              <Text style={s.infoLabel}>Phone</Text>
              <Text style={s.infoValue}>{user?.phone || 'Not set'}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>SETTINGS</Text>

          <TouchableOpacity style={s.actionRow} onPress={handleRoleSwitch}>
            <Text style={s.actionIcon}>🔄</Text>
            <Text style={s.actionText}>
              Switch to {isDriver ? 'Rider' : 'Driver'} Mode
            </Text>
            <Text style={s.actionArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={s.copyright}>© 2026 METROMILE TECHNOLOGIES INC.</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#FAF5FF'},
  scroll: {padding: 20, paddingBottom: 40},
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4B164C',
    marginBottom: 24,
    marginTop: 8,
  },
  avatarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  riderCard: {
    shadowColor: '#581C87',
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  driverCard: {
    shadowColor: '#B91C1C',
    borderWidth: 1,
    borderColor: '#FEF3F2',
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 4,
  },
  riderCircle: {
    backgroundColor: '#F3E8FF',
    borderColor: '#E9D5FF',
  },
  driverCircle: {
    backgroundColor: '#FEF3F2',
    borderColor: '#FECACA',
  },
  avatarEmoji: {fontSize: 40},
  userName: {fontSize: 24, fontWeight: '800', color: '#4B164C', marginBottom: 8},
  roleBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {color: '#581C87', fontSize: 13, fontWeight: '700'},
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoIcon: {fontSize: 20, marginRight: 14},
  infoContent: {flex: 1},
  infoLabel: {fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 2},
  infoValue: {fontSize: 15, color: '#111827', fontWeight: '600'},
  divider: {height: 1, backgroundColor: '#F3E8FF', marginLeft: 34},
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  actionIcon: {fontSize: 20, marginRight: 14},
  actionText: {flex: 1, fontSize: 15, color: '#4B164C', fontWeight: '600'},
  actionArrow: {fontSize: 18, color: '#9CA3AF'},
  signOutBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  signOutText: {color: '#DC2626', fontSize: 16, fontWeight: '700'},
  copyright: {
    textAlign: 'center',
    color: '#A855F7',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 8,
  },
});

export default ProfileScreen;
