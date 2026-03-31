import React, {useEffect, useRef} from 'react';
import {View, Text, StyleSheet, Animated, Image} from 'react-native';

interface SplashScreenProps {
  onFinish?: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({onFinish}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 10,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 0.6, // Fill partially
        duration: 4000,
        useNativeDriver: false,
      }),
    ]).start();

    // Subtle Logo Pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    if (onFinish) {
      setTimeout(onFinish, 7000);
    }
  }, [fadeAnim, pulseAnim, slideAnim, progressAnim, onFinish]);

  return (
    <View style={s.container}>
      {/* Cinematic Gradient Background */}
      <View style={s.gradientBase} />
      <View style={s.pinkGlow} />
      
      <Animated.View style={[
        s.mainContent, 
        {
          opacity: fadeAnim,
          transform: [{translateY: slideAnim}]
        }
      ]}>
        {/* Logo in Dark Container */}
        <View style={s.logoContainer}>
          <Animated.View style={{transform: [{scale: pulseAnim}]}}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={s.logoImage}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        <Text style={s.brandTitle}>MetroMile</Text>
        <Text style={s.subtitle}>THE DIGITAL CONCIERGE</Text>

        {/* Progress Bar */}
        <View style={s.progressContainer}>
          <Animated.View style={[s.progressBar, {
            width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%']
            })
          }]} />
        </View>
        <Text style={s.initializingText}>INITIALIZING PREMIUM JOURNEY</Text>
      </Animated.View>

      <Animated.View style={[s.footer, {opacity: fadeAnim}]}>
        <View style={s.footerInner}>
          <View style={s.footerLine} />
          <Text style={s.footerText}>EXCELLENCE IN MOTION</Text>
          <View style={s.footerLine} />
        </View>
      </Animated.View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2e1065', // Dark deep purple
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#4c1d95', // Lighter purple top
  },
  pinkGlow: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: '150%',
    height: '70%',
    backgroundColor: '#db2777', // Vivid pink bottom
    opacity: 0.6,
    borderRadius: 500,
    transform: [{scaleX: 1.5}],
  },
  mainContent: {
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    width: 220,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  logoImage: {
    width: 140,
    height: 80,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 64,
    fontWeight: '800',
    letterSpacing: -2,
    marginBottom: 10,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    letterSpacing: 4,
    fontWeight: '700',
    marginBottom: 60,
  },
  progressContainer: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFF',
  },
  initializingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    paddingHorizontal: 30,
  },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLine: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    flex: 1,
  },
  footerText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    letterSpacing: 3,
    marginHorizontal: 15,
    fontWeight: '700',
  },
});

export default SplashScreen;
