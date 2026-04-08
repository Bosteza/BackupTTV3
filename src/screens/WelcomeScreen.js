// WelcomeScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  StatusBar,
  PixelRatio,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function WelcomeScreen() {
  const navigation = useNavigation();
  const {width, height} = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const BASE_WIDTH = 375;
  const rf = size => Math.round((size * width) / BASE_WIDTH);
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  // --- CORRECCIÓN: usar topInset respetando safe area + StatusBar como fallback ---
  const topInset = Math.max(insets?.top ?? 0, StatusBar.currentHeight ?? 0);
  const bottomInset = insets?.bottom ?? 0;
  // -------------------------------------------------------------------------------

  const handleGuest = async () => {
    try {
      await AsyncStorage.multiSet([
        ['session_active', '0'],
        ['session_guest', '1'],
        ['session_guest_at', String(Date.now())],
      ]);

      navigation.reset({index: 0, routes: [{name: 'Home'}]});
    } catch (e) {
      // optional: show a toast/alert
    }
  };

  const scaled = {
    paddingVertical: clamp(rf(60), 12, 120),
    logoWidth: clamp(rf(250), 120, Math.round(width * 0.86)),
    logoHeight: clamp(rf(100), 48, Math.round(width * 0.36)),
    titleFont: clamp(rf(34), 18, 44),
    titleMarginTop: clamp(rf(20), 4, 60),
    caritaFont: clamp(rf(34), 18, 44),
    subtitleFont: clamp(rf(18), 12, 22),
    subtitleLineHeight: clamp(rf(20), 16, 28),
    // si quieres que el botón se adapte mejor, mantenemos el valor pero el topInset se suma abajo
    buttonContainerMarginTop: clamp(rf(200), 12, Math.round(height * 0.45)),
    buttonVertical: clamp(rf(7), 4, 12),
    buttonPaddingVertical: clamp(rf(12), 8, 18),
    buttonPaddingHorizontal: clamp(rf(18), 10, 28),
    buttonRadius: clamp(rf(8), 6, 14),
    buttonTextSize: clamp(rf(16), 12, 20),
  };

  const titleCaritaSpacing = clamp(Math.round(scaled.titleFont * 0.5), 8, 48);

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: topInset + rf(0),
      paddingBottom: bottomInset + rf(12),
      backgroundColor: '#fff',
    },

    logo: {
      width: scaled.logoWidth,
      height: scaled.logoHeight,
      resizeMode: 'contain',
      marginTop: rf(5),
    },

    titleCaritaContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: scaled.titleMarginTop,
      marginBottom: titleCaritaSpacing,
      paddingHorizontal: Math.round(Math.min(width * 0.08, 28)),
      width: '100%',
    },

    title: {
      fontSize: scaled.titleFont,
      color: '#000',
      textAlign: 'center',
      fontFamily: 'Montserrat-Bold',
    },
    carita: {
      fontSize: scaled.caritaFont,
      color: '#000',
      textAlign: 'center',
      fontFamily: 'Montserrat-Bold',
      marginTop: Math.round(Math.max(6, scaled.titleFont * 0.05)),
    },

    subtitle: {
      fontSize: scaled.subtitleFont,
      color: '#000',
      textAlign: 'center',
      marginTop: 0,
      fontFamily: 'Montserrat-Regular',

      paddingHorizontal: Math.round(Math.min(width * 0.08, 40)),
    },

    // Group that pins buttons to the bottom
    buttonContainer: {
      width: '100%',
      marginTop: 'auto',
      alignItems: 'center',
      paddingHorizontal: rf(20),
      paddingBottom: bottomInset + rf(60),
    },

    // First (gradient) button → ensure it renders above the second if they ever touch

    primaryButtonWrapper: {
      width: '100%',
      maxWidth: 800,
      alignSelf: 'center',
      borderRadius: scaled.buttonRadius,
    },

    primaryButtonInner: {
      width: '100%',
      minHeight: rf(46),
      paddingVertical: scaled.buttonPaddingVertical,
      paddingHorizontal: scaled.buttonPaddingHorizontal,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: scaled.buttonRadius,
      overflow: 'hidden', // move clipping here
    },

    primaryGradientBg: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: scaled.buttonRadius,
    },

    // Spacer or margin ensures no overlap
    buttonGap: {
      height: rf(20),
    },

    // Second (solid) button
    secondaryButtonWrapper: {
      width: '100%',
      maxWidth: 800,
      alignSelf: 'center',
      borderRadius: scaled.buttonRadius,
      overflow: 'hidden',
      zIndex: 1,
    },

    // Inner content for both buttons (no borderRadius here to avoid text clipping)
    buttonInner: {
      width: '100%',
      minHeight: rf(46),
      paddingVertical: scaled.buttonPaddingVertical,
      paddingHorizontal: scaled.buttonPaddingHorizontal,
      alignItems: 'center',
      justifyContent: 'center',
    },

    buttonInnerSolid: {
      backgroundColor: '#0046ff',
    },

    // Text: extra lineHeight + tiny bottom pad prevent iOS glyph slicing
    buttonText: {
      fontSize: scaled.buttonTextSize,
      lineHeight: Math.round(scaled.buttonTextSize * 1.32),
      fontFamily: 'Montserrat-Regular',
      paddingBottom: Platform.OS === 'ios' ? 1 : 0,
    },
    buttonTextWhite: {
      color: '#fff',
      fontFamily: 'Montserrat-Bold',
    },
  });

  return (
    <LinearGradient
      colors={['rgb(255, 255, 255)', 'rgb(252, 252, 252)']}
      locations={[0.35, 0.85]}
      start={{x: 0, y: 1}}
      end={{x: 1, y: 0}}
      style={dynamicStyles.container}>
      <Image
        source={require('../../assets/images/logo.png')}
        style={dynamicStyles.logo}
      />

      <View style={dynamicStyles.titleCaritaContainer}>
        <Text style={dynamicStyles.title}>¡Hola!</Text>
        <Text style={dynamicStyles.carita}>:)</Text>
      </View>

      <Text style={dynamicStyles.subtitle}>
        Bienvenido a{'\n'}Tabtrack{'\n'}¿Qué deseas hacer?
      </Text>

      <View style={dynamicStyles.buttonContainer}>
        <TouchableOpacity
          style={dynamicStyles.primaryButtonWrapper}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
          hitSlop={{top: 6, bottom: 6, left: 8, right: 8}}>
          <View style={dynamicStyles.primaryButtonInner}>
            <LinearGradient
              colors={['#9F4CFF', '#6A43FF', '#2C7DFF']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={dynamicStyles.primaryGradientBg}
            />
            <Text
              allowFontScaling={false}
              style={[dynamicStyles.buttonText, dynamicStyles.buttonTextWhite]}>
              Iniciar sesión
            </Text>
          </View>
        </TouchableOpacity>

        <View style={dynamicStyles.buttonGap} />

        <TouchableOpacity
          style={dynamicStyles.secondaryButtonWrapper}
          onPress={() => navigation.navigate('Cuenta')}
          activeOpacity={0.85}
          hitSlop={{top: 6, bottom: 6, left: 8, right: 8}}>
          <View
            style={[dynamicStyles.buttonInner, dynamicStyles.buttonInnerSolid]}>
            <Text
              allowFontScaling={false}
              style={[dynamicStyles.buttonText, dynamicStyles.buttonTextWhite]}>
              Crear Cuenta
            </Text>
          </View>
        </TouchableOpacity>
        <View style={dynamicStyles.buttonGap} />

        <TouchableOpacity
          style={[
            dynamicStyles.secondaryButtonWrapper,
            {
              borderWidth: 1,
              borderColor: '#0046ff',
              backgroundColor: '#fff',
            },
          ]}
          onPress={handleGuest}
          activeOpacity={0.85}
          hitSlop={{top: 6, bottom: 6, left: 8, right: 8}}>
          <View style={[dynamicStyles.buttonInner, {backgroundColor: '#fff'}]}>
            <Text
              allowFontScaling={false}
              style={[
                dynamicStyles.buttonText,
                {color: '#0046ff', fontFamily: 'Montserrat-Bold'},
              ]}>
              Continuar como invitado
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}
