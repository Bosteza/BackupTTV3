// SplashScreen.js
import React, {useEffect} from 'react';
import {
  Image,
  StyleSheet,
  Platform,
  PixelRatio,
  useWindowDimensions,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {useSafeAreaInsets} from 'react-native-safe-area-context';

export default function SplashScreen({navigation}) {
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const active = await AsyncStorage.getItem('session_active');
        const userId = await AsyncStorage.getItem('user_usuario_app_id');

        if (active === '1' && userId) {
          navigation.replace('Home');
        } else {
          navigation.replace('Welcome');
        }
      } catch {
        navigation.replace('Welcome');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  const {width, height} = useWindowDimensions();

  const insets = useSafeAreaInsets();
  const rf = p => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // --- CORRECCIÓN: usar topInset respetando safe area + StatusBar como fallback ---
  const topInset = Math.max(insets?.top ?? 0, StatusBar.currentHeight ?? 0);
  const bottomInset = insets?.bottom ?? 0;
  const logoOffsetY = -clamp(rf(18), 12, 36); // move up a bit (responsive)
  // -------------------------------------------------------------------------------

  const logoSize = clamp(
    Math.round(Math.min(width * 0.56, height * 0.4)),
    rf(90),
    360,
  );

  return (
    <LinearGradient
      colors={['rgb(255, 255, 255)', 'rgb(255, 255, 255)']}
      locations={[0.35, 0.85]}
      start={{x: 0, y: 1}}
      end={{x: 1, y: 0}}
      style={styles.container}>
      <Image
        source={require('../../assets/images/logo.png')}
        style={[
          styles.logo,
          {
            width: logoSize,
            height: logoSize,
            transform: [{translateY: logoOffsetY}],
          },
        ]}
        accessibilityLabel="Logo TabTrack"
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  logo: {
    resizeMode: 'contain',
  },
});
