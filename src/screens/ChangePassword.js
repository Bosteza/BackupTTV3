//working 9 mar
import React, {useState, useEffect, useRef} from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Keyboard} from 'react-native';

const API_BASE = 'https://api.tab-track.com/api/mobileapp';
const API_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc3NTUxMjcwNSwianRpIjoiNzA1NjU2YjgtZGFiZS00M2NlLTk2MjUtZmE5ODdmY2FiY2ZiIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NzU1MTI3MDUsImV4cCI6MTc3ODEwNDcwNSwicm9sIjoiRWRpdG9yIn0.03LJs1TRZzehSXSh5Cdez2e5NFSrANijsS4H6gUjm78';
const PRIMARY = '#FEFFFFFF';
const BLUE = '#0046ff';

export default function ChangePassword() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();

  // ===== Mode 3 (Login.js) responsive system (same approach) =====
  const BASE_WIDTH = 375;
  const rf = size => Math.round((size * width) / BASE_WIDTH);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // Same safe-area/status-bar handling pattern as Login.js
  const topInset = Math.max(insets.top ?? 0, StatusBar.currentHeight ?? 0);
  const headerApprox = 56;
  const keyboardVerticalOffset =
    Platform.OS === 'ios'
      ? topInset + headerApprox
      : StatusBar.currentHeight
      ? StatusBar.currentHeight + 10
      : 20;

  // These match the *Mode 3* sizing intent from Login.js
  const scaled = {
    paddingVertical: clamp(rf(10), 0, 35), // (fixed the order: min->max)
    logoWidth: clamp(rf(250), 120, Math.round(width * 0.9)),
    logoHeight: clamp(rf(100), 48, Math.round(width * 0.4)),

    // For this screen title, reuse Login's title scale range
    screenTitleFont: clamp(rf(28), 16, 46),

    inputWidthPct: '80%',
    inputHeight: clamp(rf(40), 36, 56),
    inputRadius: clamp(rf(20), 8, 28),
    inputPaddingH: clamp(rf(10), 8, 18),

    inicioWidth: Math.min(Math.round(width * 0.8), 420), // Mode 3 uses 80% width feel
    inicioHeight: clamp(rf(40), 36, 56),
    inicioRadius: clamp(rf(25), 12, 30),

    buttonTextSize: clamp(rf(16), 12, 20),

    toastBottomIOS: clamp(rf(80), 40, 140),
    toastBottomAndroid: clamp(rf(40), 20, 120),
  };

  const toastBottomBase =
    Platform.OS === 'ios' ? scaled.toastBottomIOS : scaled.toastBottomAndroid;
  const toastBottom = toastBottomBase + (insets.bottom ?? 0);
  const successToastBottom = toastBottom + 20;

  const dynamic = StyleSheet.create({
    containerOverride: {
      paddingVertical: scaled.paddingVertical,
    },
    logoOverride: {
      width: scaled.logoWidth,
      height: scaled.logoHeight,
    },
    screenTitleOverride: {
      fontSize: scaled.screenTitleFont,
    },
    inputOverride: {
      width: scaled.inputWidthPct,
      height: scaled.inputHeight,
      borderRadius: scaled.inputRadius,
      paddingHorizontal: scaled.inputPaddingH,
    },
    inicioOverride: {
      width: scaled.inicioWidth,
      height: scaled.inicioHeight,
      borderRadius: scaled.inicioRadius,
    },
    buttonTextOverride: {
      fontSize: scaled.buttonTextSize,
    },
  });

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('');
  const [toastStyle, setToastStyle] = useState(styles.toast);

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

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      setOldPassword('');
      setNewPassword('');
    });

    // Obtener el email desde AsyncStorage al montar el componente
    const getEmail = async () => {
      try {
        const storedEmail = await AsyncStorage.getItem('user_mail');
        if (storedEmail) {
          setEmail(storedEmail);
        } else {
          console.warn('No se encontró el email en AsyncStorage');
        }
      } catch (error) {
        console.error('Error al obtener el email desde AsyncStorage:', error);
      }
    };

    getEmail();
    return unsub;
  }, [navigation]);

  const handleChangePassword = async () => {
    Keyboard.dismiss();
    if (!oldPassword || !newPassword) {
      return showToast('Completa ambos campos');
    }

    setLoading(true);

    try {
      const storedUserId = await AsyncStorage.getItem('user_id');

      if (!email && !storedUserId) {
        showToast('No se encontró usuario. Inicia sesión de nuevo.');
        setLoading(false);
        return;
      }

      if (email) {
        const urlEmail = `${API_BASE}/usuarios/change-password`;
        const resEmail = await fetch(urlEmail, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_TOKEN}`,
          },
          body: JSON.stringify({
            mail: email,
            password: oldPassword,
            new_password: newPassword,
          }),
        });

        const textEmail = await resEmail.text();
        let dataEmail;
        try {
          dataEmail = JSON.parse(textEmail);
        } catch {
          dataEmail = {error: textEmail};
        }

        if (resEmail.ok) {
          showToast('Contraseña actualizada', true, 1200, () =>
            navigation.goBack(),
          );
          setLoading(false);
          return;
        } else {
          if (!storedUserId) {
            const errMsg =
              dataEmail?.error || dataEmail?.message || 'No se pudo actualizar';
            showToast(errMsg);
            setLoading(false);
            return;
          }
        }
      }

      if (storedUserId) {
        const urlId = `${API_BASE}/usuarios/${storedUserId}/change-password`;
        const resId = await fetch(urlId, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_TOKEN}`,
          },
          body: JSON.stringify({
            password: oldPassword,
            new_password: newPassword,
          }),
        });

        const textId = await resId.text();
        let dataId;
        try {
          dataId = JSON.parse(textId);
        } catch {
          dataId = {error: textId};
        }

        if (resId.ok) {
          showToast('Contraseña actualizada', true, 1200, () =>
            navigation.goBack(),
          );
          setLoading(false);
          return;
        } else {
          const errMsg =
            dataId?.error || dataId?.message || 'No se pudo actualizar';
          showToast(errMsg);
          setLoading(false);
          return;
        }
      }

      showToast('No se pudo cambiar la contraseña');
    } catch (err) {
      console.warn('ChangePassword error:', err);
      showToast('Error de red');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Login');
  };

  // match your prior visual shift, but keep safe top padding
  const contentShiftY = -Math.round(height * 0.03);

  return (
    <View style={styles.flex}>
      <LinearGradient
        colors={['rgb(255, 255, 255)', 'rgb(255, 255, 255)']}
        locations={[0.35, 0.85]}
        start={{x: 0, y: 1}}
        end={{x: 1, y: 0}}
        style={[
          styles.container,
          dynamic.containerOverride,
          {paddingTop: topInset},
          {transform: [{translateY: contentShiftY}]},
        ]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={24} color={BLUE} />
        </TouchableOpacity>

        <Image
          source={require('../../assets/images/logo.png')}
          style={[styles.logo, dynamic.logoOverride]}
        />

        <Text style={[styles.title, dynamic.screenTitleOverride]}>
          Actualizar contraseña
        </Text>

        {/* MODE 3 input style: styles.input + styles.inputBorder + dynamic.inputOverride */}
        <TextInput
          style={[styles.input, styles.inputBorder, dynamic.inputOverride]}
          placeholder="Contraseña actual"
          placeholderTextColor="#000"
          secureTextEntry
          value={oldPassword}
          onChangeText={setOldPassword}
          autoCapitalize="none"
        />

        <TextInput
          style={[styles.input, styles.inputBorder, dynamic.inputOverride]}
          placeholder="Nueva contraseña"
          placeholderTextColor="#000"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          autoCapitalize="none"
        />

        {/* MODE 3 button style: styles.inicio + dynamic.inicioOverride + opacity on disabled */}
        <TouchableOpacity
          style={[
            styles.inicio,
            dynamic.inicioOverride,
            loading && {opacity: 0.6},
          ]}
          onPress={handleChangePassword}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color={PRIMARY} />
          ) : (
            <Text style={[styles.buttonText, dynamic.buttonTextOverride]}>
              Actualizar
            </Text>
          )}
        </TouchableOpacity>
      </LinearGradient>

      {/* MODE 3 toast behavior (bottom differs for success) */}
      <Animated.View
        pointerEvents="none"
        style={[
          toastStyle,
          toastStyle === styles.toast
            ? {bottom: toastBottom}
            : {bottom: successToastBottom},
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
        ]}>
        <Text
          style={[
            styles.toastText,
            toastStyle === styles.successToast && styles.successToastText,
          ]}>
          {toastMsg}
        </Text>
      </Animated.View>
    </View>
  );
}

/**
 * Base styles copied from Login.js and kept identical where Mode 3 uses them:
 * - flex, container, logo, input, inputBorder, inicio, buttonText, toast, successToast, backButton, toastText
 * - title uses the same typography as Login title (Montserrat-Bold, black, centered).
 */
const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: '#fff'},
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 90, // overridden by dynamic.containerOverride
  },
  logo: {width: 250, height: 100, resizeMode: 'contain', marginTop: 5},
  title: {
    fontSize: 34, // overridden by dynamic.screenTitleOverride
    color: '#000',
    textAlign: 'center',
    marginTop: 18,
    fontFamily: 'Montserrat-Bold',
  },
  input: {
    width: '80%', // overridden by dynamic.inputOverride
    height: 40, // overridden by dynamic.inputOverride
    borderRadius: 20, // overridden by dynamic.inputOverride
    paddingHorizontal: 10, // overridden by dynamic.inputOverride
    marginTop: 12,
    backgroundColor: 'transparent',
  },
  inputBorder: {borderColor: '#000', borderWidth: 1, color: '#000'},
  inicio: {
    width: '50%',
    height: 40,
    borderRadius: 25,
    backgroundColor: '#0046ff',
    marginTop: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {color: '#fff', fontSize: 16, fontFamily: 'Montserrat-Regular'},
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
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
  successToast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgb(0, 50, 186)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    maxWidth: '90%',
  },
  successToastText: {fontSize: 16, fontFamily: 'Montserrat-Bold'},
  backButton: {
    alignSelf: 'flex-start',
    marginLeft: 24,
  },
});
