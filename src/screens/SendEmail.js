//token
import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Keyboard} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {TOKEN, ensureToken} from '../auth/tokenManager';

const API_BASE = 'https://api.tab-track.com/api/mobileapp';

export default function SendEmail() {
  const navigation = useNavigation();
  const [mail, setMail] = useState('');
  const [loading, setLoading] = useState(false);

  const BLUE = '#0046ff';

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('');
  const [toastStyle, setToastStyle] = useState(styles.toast);

  const {width, height} = useWindowDimensions();
  const wp = p => (width * Number(p)) / 100;
  const hp = p => (height * Number(p)) / 100;
  const BASE_WIDTH = 375;
  const rf = size => Math.round((size * width) / BASE_WIDTH);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const scaled = {
    paddingVertical: clamp(rf(10), 35, 0),
    logoWidth: clamp(rf(250), 120, Math.round(width * 0.9)),
    logoHeight: clamp(rf(100), 48, Math.round(width * 0.4)),
    titleFont: clamp(rf(28), 16, 46),
    titleMarginTop: clamp(rf(18), 6, 60),
    caritaFont: clamp(rf(26), 16, 46),
    inputWidthPct: '80%',
    inputHeight: clamp(rf(40), 36, 56),
    inputRadius: clamp(rf(20), 8, 28),
    inputPaddingH: clamp(rf(10), 8, 18),
    inicioWidthPct: '50%',
    inicioWidth: Math.min(Math.round(width * 0.5), 360),
    inicioHeight: clamp(rf(40), 36, 56),
    inicioRadius: clamp(rf(25), 12, 30),
    buttonTextSize: clamp(rf(16), 12, 20),
    forgotSize: clamp(rf(14), 10, 18),
    buttonContainerWidthPct: '80%',
    buttonContainerMarginTop: clamp(rf(40), 12, Math.round(height * 0.45)),
    toastBottomIOS: clamp(rf(80), 40, 140),
    toastBottomAndroid: clamp(rf(40), 20, 120),
  };

  const insets = useSafeAreaInsets();
  const topSafe = Math.round(
    Math.max(
      insets.top || 0,
      Platform.OS === 'android'
        ? StatusBar.currentHeight || 0
        : insets.top || 0,
    ),
  );
  const bottomSafe = Math.round(insets.bottom || 0);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Welcome');
    }
  };

  const dynamicStyles = {
    container: {
      paddingVertical: scaled.paddingVertical,
    },
    logoOverride: {
      width: scaled.logoWidth,
      height: scaled.logoHeight,
    },
    title: {
      marginTop: Math.min(hp(5), 50),
      fontSize: clamp(rf(4.4), 16, 28),
    },
    inputOverride: {
      width: scaled.inputWidthPct,
      height: scaled.inputHeight,
      borderRadius: scaled.inputRadius,
      paddingHorizontal: scaled.inputPaddingH,
    },
    input: {
      height: clamp(hp(6.2), 40, 56),
      borderRadius: Math.round(Math.min(999, hp(3.2))),
      paddingHorizontal: Math.min(wp(4.5), 18),
      marginBottom: Math.min(hp(1.6), 14),
    },
    button: {
      width: scaled.inicioWidth,
      height: scaled.inicioHeight,
      borderRadius: scaled.inicioRadius,
      marginTop: 18,
    },

    buttonText: {
      fontSize: scaled.buttonTextSize,
    },
    backText: {
      fontSize: clamp(rf(1.9), 12, 16),
      marginTop: Math.min(hp(1.2), 10),
    },
    toast: {
      bottom:
        Platform.OS === 'ios' ? Math.min(hp(8), 80) : Math.min(hp(5.2), 48),
      maxWidth: Math.min(width - 40, wp(90)),
    },
  };

  const showToast = (message, success = false, duration = 1500, cb) => {
    setToastMsg(message);
    setToastStyle(success ? styles.successToast : styles.toast);

    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }).start(() => cb && cb());
      }, duration);
    });
  };

  const validateEmail = e => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(e).toLowerCase());
  };

  const getStoredToken = async () => {
    try {
      await ensureToken();
      const token =
        typeof TOKEN === 'string' && TOKEN.trim() ? TOKEN.trim() : '';
      return token;
    } catch (err) {
      console.warn('SendEmail token error:', err);
      return '';
    }
  };

  const handleSend = async () => {
    Keyboard.dismiss();
    if (!mail.trim()) {
      showToast('Ingresa tu correo');
      return;
    }
    if (!validateEmail(mail.trim())) {
      showToast('Email inválido');
      return;
    }

    setLoading(true);
    try {
      const token = await getStoredToken();
      const url = `${API_BASE}/usuarios/forgot-password`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? {Authorization: `Bearer ${token}`} : {}),
        },
        body: JSON.stringify({mail: mail.trim()}),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = {error: text};
      }

      if (res.ok) {
        showToast('Correo enviado. Revisa tu bandeja.', true, 1200, () =>
          navigation.navigate('ResetPassword', {mail: mail.trim()}),
        );
      } else {
        const errMsg =
          data?.error ||
          data?.message ||
          data?.detalle ||
          'No se pudo enviar email';
        showToast(errMsg);
      }
    } catch (err) {
      console.warn('send error:', err);
      showToast('Error de red');
    } finally {
      setLoading(false);
    }
  };

  const toastBottom =
    (Platform.OS === 'ios' ? Math.min(hp(8), 80) : Math.min(hp(5.2), 48)) +
    bottomSafe;

  return (
    <View style={{width: '100%', flex: 1, backgroundColor: '#fff'}}>
      <LinearGradient
        colors={['rgb(255, 255, 255)', 'rgb(255, 255, 255)']}
        locations={[0.35, 0.85]}
        start={{x: 0, y: 1}}
        end={{x: 1, y: 0}}
        style={[styles.container, dynamicStyles.container]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={24} color={BLUE} />
        </TouchableOpacity>
        <Image
          source={require('../../assets/images/logo.png')}
          style={[styles.logo, dynamicStyles.logoOverride]}
        />

        <Text style={[styles.title, dynamicStyles.title]}>
          Coloca tu correo electrónico
        </Text>

        <TextInput
          style={[
            styles.input,
            styles.inputBorder,
            dynamicStyles.inputOverride,
          ]}
          placeholder="Correo electrónico"
          placeholderTextColor="#000"
          value={mail}
          onChangeText={setMail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={handleSend}
          style={[
            styles.button, // base (equivalent to styles.inicio)
            dynamicStyles.button, // equivalent to dynamic.inicioOverride
            {
              width: '80%',
              marginTop: 18,
            },
            (loading || !mail) && {opacity: 0.6},
          ]}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.buttonText, dynamicStyles.buttonText]}>
              Enviar
            </Text>
          )}
        </TouchableOpacity>
      </LinearGradient>

      <Animated.View
        pointerEvents="none"
        style={[
          toastStyle,
          {
            opacity: toastAnim,
            transform: [
              {
                translateY: toastAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
          {bottom: toastBottom, maxWidth: dynamicStyles.toast.maxWidth},
        ]}>
        <Text style={styles.toastText}>{toastMsg}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 90,
  },
  logo: {width: 250, height: 100, resizeMode: 'contain', marginTop: 5},
  title: {
    fontSize: 24,
    color: '#000',
    fontFamily: 'Montserrat-Bold',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    width: '80%',
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 10,

    backgroundColor: 'transparent',
    marginBottom: 25,
  },
  inputBorder: {borderColor: '#000', borderWidth: 1, color: '#000'},
  button: {
    backgroundColor: '#0046ff',
    borderRadius: 25,
    width: '50%',
    height: 40,
    marginTop: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonText: {color: '#fff', fontSize: 16, fontFamily: 'Montserrat-Regular'},
  backText: {
    color: '#000',
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    opacity: 0.9,
  },
  toast: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 80 : 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    maxWidth: '85%',
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Montserrat-Regular',
  },
  successToast: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 80 : 40,
    alignSelf: 'center',
    backgroundColor: 'rgb(0, 50, 186)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    maxWidth: '90%',
  },

  backButton: {
    alignSelf: 'flex-start',
    marginLeft: 24,
  },
});
