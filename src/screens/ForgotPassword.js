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
  PixelRatio,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const API_BASE = 'https://api.tab-track.com/api/mobileapp';
const API_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2NzM4MjQyNiwianRpIjoiODQyODVmZmUtZDVjYi00OGUxLTk1MDItMmY3NWY2NDI2NmE1IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NjczODI0MjYsImV4cCI6MTc2OTk3NDQyNiwicm9sIjoiRWRpdG9yIn0.tx84js9-CPGmjLKVPtPeVhVMsQiRtCeNcfw4J4Q2hyc';
const PRIMARY = '#FFFF';
const BLUE = '#0046ff';

export default function ForgotPasswordRecovery() {
  const navigation = useNavigation();
  const [mail, setMail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('');
  const [toastStyle, setToastStyle] = useState(styles.toast);

  const {width, height} = useWindowDimensions();
  const wp = p => (Number(p) / 100) * width;
  const hp = p => (Number(p) / 100) * height;
  const rf = p => {
    const size = (Number(p) / 100) * width;
    return Math.round(PixelRatio.roundToNearestPixel(size));
  };
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
  const contentShiftY = -Math.round(hp(3));

  const dynamicStyles = {
    container: {
      flex: 1,

      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Math.round(wp(0)), // some side padding is ok
      paddingVertical: Math.round(hp(3)),
    },
    logo: {
      width: clamp(rf(66.7), 120, Math.round(width * 0.9)),
      height: clamp(rf(26.7), 48, Math.round(width * 0.4)),

      resizeMode: 'contain',
      marginBottom: Math.round(hp(2)),
    },
    title: {
      fontSize: Math.round(clamp(rf(6.2), 18, 28)),
      color: '#000',
      fontFamily: 'Montserrat-Bold',
      textAlign: 'center',
      marginBottom: Math.round(hp(2)),
    },

    input: {
      width: '80%',
      height: Math.round(clamp(hp(1), 40, 56)),
      borderRadius: Math.round(wp(4)),
      paddingHorizontal: Math.round(wp(4)),
      backgroundColor: 'transparent',
      marginBottom: Math.round(hp(1.8)),
      fontSize: Math.round(clamp(rf(3.4), 14, 18)),
    },
    inputBorder: {
      borderColor: '#000',
      borderWidth: 1,
      color: '#000',
    },

    button: {
      backgroundColor: '#0046ff',
      borderRadius: Math.round(wp(6)),
      width: Math.round(wp(60)),
      height: Math.round(clamp(hp(6.6), 44, 56)),
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 40,
    },
    buttonText: {
      color: '#fff',
      fontSize: Math.round(clamp(rf(3.6), 14, 18)),
      fontFamily: 'Montserrat-Bold',
    },

    toast: {
      position: 'absolute',
      bottom: toastBottom,
      alignSelf: 'center',
      backgroundColor: 'rgba(0,0,0,0.8)',
      paddingVertical: Math.round(hp(1.2)),
      paddingHorizontal: Math.round(wp(4)),
      borderRadius: Math.round(wp(8)),
      maxWidth: '85%',
    },
  };
  // -------------------------------

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

  const handleRecover = async () => {
    if (!mail.trim() || !oldPassword || !newPassword) {
      showToast('Completa todos los campos');
      return;
    }
    if (!validateEmail(mail.trim())) {
      showToast('Email inválido');
      return;
    }
    if (newPassword.length < 6) {
      showToast('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const url = `${API_BASE}/usuarios/change-password`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(API_TOKEN ? {Authorization: `Bearer ${API_TOKEN}`} : {}),
        },
        body: JSON.stringify({
          mail: mail.trim(),
          password: oldPassword, // Usar 'password' en lugar de 'old_password'
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
        showToast('Contraseña actualizada', true, 1100, () =>
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
      console.warn('recover error:', err);
      showToast('Error de red');
    } finally {
      setLoading(false);
    }
  };

  // compute container padding including safe areas
  const containerPaddingTop = Math.max(
    insets.top ?? 0,
    StatusBar.currentHeight ?? 0,
  );
  const containerPaddingBottom =
    dynamicStyles.container.paddingVertical + bottomSafe;

  // compute toast bottom including safe bottom inset
  const toastBottom =
    (Platform.OS === 'ios' ? Math.min(hp(8), 80) : Math.min(hp(5.2), 48)) +
    bottomSafe;

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Login');
      // or navigation.replace('Welcome');
    }
  };

  return (
    <View style={styles.flex}>
      <LinearGradient
        colors={['rgb(255, 255, 255)', 'rgb(255, 255, 255)']}
        locations={[0.35, 0.85]}
        start={{x: 0, y: 1}}
        end={{x: 1, y: 0}}
        style={[
          styles.container,
          dynamicStyles.container,
          {
            paddingTop: containerPaddingTop,
            paddingBottom: bottomSafe + 300,
            transform: [{translateY: contentShiftY}],
          },
        ]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={24} color={BLUE} />
        </TouchableOpacity>
        <Image
          source={require('../../assets/images/logo.png')}
          style={[styles.logo, dynamicStyles.logo]}
        />

        <Text style={[styles.title, dynamicStyles.title]}>
          Recuperar / cambiar contraseña
        </Text>

        <TextInput
          style={[styles.input, styles.inputBorder, dynamicStyles.input]}
          placeholder="Correo electrónico"
          placeholderTextColor="#000"
          value={mail}
          onChangeText={setMail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={[styles.input, styles.inputBorder, dynamicStyles.input]}
          placeholder="Contraseña actual"
          placeholderTextColor="#000"
          secureTextEntry
          value={oldPassword}
          onChangeText={setOldPassword}
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
          onPress={handleRecover}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#0046ff" />
          ) : (
            <Text style={[styles.buttonText, dynamicStyles.buttonText]}>
              Actualizar
            </Text>
          )}
        </TouchableOpacity>
      </LinearGradient>

      {/* Toast animado */}
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
  flex: {flex: 1, backgroundColor: '#fff'},
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // padding now provided dynamically via dynamicStyles.container + safe area

    paddingVertical: 40,
  },
  logo: {
    width: 200,
    height: 80,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    color: '#000',
    fontFamily: 'Montserrat-Bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 42,
    borderRadius: 20,
    paddingHorizontal: 15,
    backgroundColor: 'transparent',
    marginBottom: 15,
  },
  inputBorder: {
    borderColor: '#000',
    borderWidth: 1,
    color: '#000',
  },
  button: {
    backgroundColor: '#0046ff',
    borderRadius: 25,
    width: '60%', // overridden by dynamicStyles.button.width
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
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
