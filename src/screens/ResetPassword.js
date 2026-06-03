//token
import React, {useState, useRef, useEffect} from 'react';
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
import {useNavigation, useRoute} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Keyboard} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {TOKEN, ensureToken} from '../auth/tokenManager';

const API_BASE = 'https://api.tab-track.com/api/mobileapp';

const BLUE = '#0046ff';

export default function ResetPasswordCodeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const paramMail = route?.params?.mail ?? '';

  const [mail] = useState(paramMail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('');
  const [toastStyle, setToastStyle] = useState(styles.toast);

  const {width, height} = useWindowDimensions();
  const wp = p => (width * Number(p)) / 100;
  const hp = p => (height * Number(p)) / 100;
  const rf = p => Math.round((width * Number(p)) / 100);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

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
  const dynamicStyles = {
    container: {
      paddingHorizontal: Math.min(wp(6), 40),
      paddingVertical: Math.min(hp(6), 48),
    },
    logo: {
      width: Math.min(wp(55), 220),
      aspectRatio: 200 / 80,
      height: undefined,
      marginBottom: Math.min(hp(2.5), 22),
    },
    title: {
      fontSize: clamp(rf(4.6), 16, 28),
      marginBottom: Math.min(hp(1.8), 16),
    },
    subtitle: {
      fontSize: clamp(rf(2.0), 12, 16),
      marginBottom: Math.min(hp(1.2), 12),
      textAlign: 'center',
    },
    input: {
      height: clamp(hp(6.2), 40, 56),
      borderRadius: Math.round(Math.min(999, hp(3.2))),
      paddingHorizontal: Math.min(wp(4.5), 18),
      marginBottom: Math.min(hp(1.6), 14),
    },
    button: {
      width: Math.min(wp(72), 420),
      height: clamp(hp(6.4), 44, 60),
      borderRadius: Math.round(Math.min(999, hp(3.6))),
      marginVertical: Math.min(hp(2.2), 18),
    },
    buttonText: {
      fontSize: clamp(rf(2.4), 14, 18),
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

  const validatePassword = p => {
    return typeof p === 'string' && p.length >= 6;
  };
  const getStoredToken = async () => {
    try {
      await ensureToken();
      const token =
        typeof TOKEN === 'string' && TOKEN.trim() ? TOKEN.trim() : '';
      return token;
    } catch (err) {
      console.warn('ResetPasswordCodeScreen token error:', err);
      return '';
    }
  };

  const handleUpdate = async () => {
    Keyboard.dismiss();
    if (!mail || !mail.trim()) {
      showToast('Correo no disponible. Regresa y envía el correo primero.');
      return;
    }
    if (!validateEmail(mail.trim())) {
      showToast('Email inválido');
      return;
    }
    if (!code.trim()) {
      showToast('Ingresa el código');
      return;
    }
    if (!newPassword) {
      showToast('Ingresa la nueva contraseña');
      return;
    }
    if (!validatePassword(newPassword)) {
      showToast('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const token = await getStoredToken();
      const url = `${API_BASE}/usuarios/reset-password`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? {Authorization: `Bearer ${token}`} : {}),
        },
        body: JSON.stringify({
          mail: mail.trim(),
          code: code.trim(),
          new_password: newPassword,
        }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = {error: text};
      }

      if (res.ok) {
        showToast('Contraseña actualizada', true, 1400, () =>
          navigation.replace('Login'),
        );
      } else {
        const errMsg =
          data?.error ||
          data?.message ||
          data?.detalle ||
          'No se pudo actualizar contraseña';
        showToast(errMsg);
      }
    } catch (err) {
      console.warn('reset error:', err);
      showToast('Error de red');
    } finally {
      setLoading(false);
    }
  };

  const toastBottom =
    (Platform.OS === 'ios' ? Math.min(hp(8), 80) : Math.min(hp(5.2), 48)) +
    bottomSafe;

  return (
    <View style={styles.flex}>
      <LinearGradient
        colors={['rgb(255, 255, 255)', 'rgb(255, 255, 255)']}
        locations={[0.35, 0.85]}
        start={{x: 0, y: 1}}
        end={{x: 1, y: 0}}
        style={styles.container}>
        <View
          style={[
            styles.content,
            {
              maxWidth: Math.min(wp(88), 420),
              paddingHorizontal: Math.min(wp(6), 24),
              paddingBottom: bottomSafe,
            },
          ]}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={[styles.logo, dynamicStyles.logo]}
          />

          <Text style={[styles.title, dynamicStyles.title]}>
            Introduce los campos para completar el proceso
          </Text>

          <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
            Asegúrate de revisar que los campos sean correctos.
          </Text>

          {mail ? (
            <Text style={styles.mailText}>
              Correo:{' '}
              <Text style={{fontFamily: 'Montserrat-Bold'}}>{mail}</Text>
            </Text>
          ) : (
            <Text style={styles.mailErrorText}>
              Correo no disponible. Regresa a la pantalla anterior.
            </Text>
          )}

          <TextInput
            style={[styles.input, styles.inputBorder, dynamicStyles.input]}
            placeholder="Código (ej. 123456)"
            placeholderTextColor="#000"
            value={code}
            onChangeText={text => {
              const onlyNumbers = text.replace(/\D/g, '');
              setCode(onlyNumbers);

              if (onlyNumbers.length === 6) {
                Keyboard.dismiss();
              }
            }}
            keyboardType="numeric"
            maxLength={6}
            autoCapitalize="none"
          />

          <TextInput
            style={[styles.input, styles.inputBorder, dynamicStyles.input]}
            placeholder="Nueva contraseña"
            placeholderTextColor="#000"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <TouchableOpacity
            style={[
              styles.button,
              loading && {opacity: 0.6},
              dynamicStyles.button,
            ]}
            onPress={handleUpdate}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.buttonText, dynamicStyles.buttonText]}>
                Actualizar
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.replace('Login')}>
            <Text style={[styles.backText, dynamicStyles.backText]}>
              Volver al inicio de sesión
            </Text>
          </TouchableOpacity>
        </View>
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
  flex: {
    flex: 1,
    backgroundColor: '#fff',
  },

  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },

  logo: {
    width: 250,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 20,
  },

  title: {
    width: '100%',
    fontSize: 24,
    color: '#000',
    fontFamily: 'Montserrat-Bold',
    textAlign: 'center',
    marginBottom: 20,
  },

  subtitle: {
    width: '100%',
    color: '#000',
    fontFamily: 'Montserrat-Regular',
    textAlign: 'center',
    marginBottom: 12,
  },

  mailText: {
    width: '100%',
    marginBottom: 10,
    fontFamily: 'Montserrat-Regular',
    color: '#000',
    textAlign: 'center',
  },

  mailErrorText: {
    width: '100%',
    marginBottom: 10,
    fontFamily: 'Montserrat-Regular',
    color: '#a00',
    textAlign: 'center',
  },

  input: {
    width: '100%',
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 15,
    backgroundColor: 'transparent',
    marginBottom: 15,
    color: '#000',
  },

  inputBorder: {
    borderColor: '#000',
    borderWidth: 1,
  },

  button: {
    width: '100%',
    backgroundColor: '#0046ff',
    borderRadius: 25,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
  },

  backText: {
    width: '100%',
    color: '#000',
    textAlign: 'center',
    fontFamily: 'Montserrat-Regular',
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

  toastText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Montserrat-Regular',
  },
});
