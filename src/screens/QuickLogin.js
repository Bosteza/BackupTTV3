//OneSignal
import React, {useState, useRef} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  useWindowDimensions,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {TOKEN, ensureToken} from '../auth/tokenManager';
import {
  setOneSignalExternalUserId,
  sendOneSignalTags,
} from '../services/oneSignalService';

const API_HOST = 'https://api.tab-track.com';
const DEFAULT_AVATAR = require('../../assets/images/logo.png');

export default function QuickLoginScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const {width} = useWindowDimensions();

  const {email = '', avatarUrl = null} = route.params ?? {};

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('');
  const [toastSuccess, setToastSuccess] = useState(false);
  const [toastStyle, setToastStyle] = useState(styles.toast);

  //No borrar
  const showToast = (message, success = false, duration = 900, cb) => {
    setToastMsg(message);
    setToastStyle(success ? styles.successToast : styles.toast);
    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 240,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }).start(() => cb && cb());
      }, duration);
    });
  };

  const BASE_WIDTH = 375;
  const rf = size => Math.round((size * width) / BASE_WIDTH);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const scaled = {
    toastBottomIOS: clamp(rf(80), 40, 140),
    toastBottomAndroid: clamp(rf(40), 20, 120),
  };

  const toastBottomBase =
    Platform.OS === 'ios' ? scaled.toastBottomIOS : scaled.toastBottomAndroid;
  const toastBottom = toastBottomBase + (insets.bottom ?? 0);
  const successToastBottom = toastBottom + 20;

  const buildValidateUrl = () => {
    const base = (API_HOST || '').replace(/\/$/, '');
    return `${base}/api/mobileapp/usuarios/validate-password`;
  };
  const getStoredToken = async () => {
    try {
      await ensureToken();
      const stored =
        typeof TOKEN === 'string' && TOKEN.trim() ? TOKEN.trim() : '';
      return stored;
    } catch (err) {
      console.warn('QuickLogin getStoredToken error', err);
      return '';
    }
  };

  const callValidatePassword = async (mailToSend, pwd) => {
    const url = buildValidateUrl();
    try {
      const token = await getStoredToken();

      const headers = {'Content-Type': 'application/json'};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({mail: mailToSend, password: pwd}),
      });

      const text = await res.text().catch(() => null);
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (e) {
        data = {error: text};
      }

      return {ok: res.status === 200, status: res.status, data, rawText: text};
    } catch (err) {
      return {ok: false, status: 0, error: String(err)};
    }
  };

  const onLogin = async () => {
    if (!password || password.length < 4) {
      showToast('Ingresa tu contraseña', false);
      return;
    }
    setLoading(true);

    const result = await callValidatePassword(email, password);
    setLoading(false);

    if (!result.ok) {
      const msg =
        result?.data?.error ||
        result?.data?.message ||
        `Error ${result.status || ''}` ||
        'Autenticación fallida';
      showToast(msg, false);
      return;
    }

    try {
      const usuario = result.data?.usuario ?? result.data?.user ?? null;

      try {
        const token = await getStoredToken();
        if (token) {
          await AsyncStorage.setItem('api_token', token);
        }
        await AsyncStorage.setItem('api_host', String(API_HOST));
      } catch (_) {}

      if (usuario && typeof usuario === 'object') {
        for (const [key, value] of Object.entries(usuario)) {
          if (value !== null && value !== undefined) {
            try {
              await AsyncStorage.setItem(`user_${key}`, String(value));
            } catch (_) {}
          }
        }
        if (usuario.usuario_app_id) {
          await AsyncStorage.setItem(
            'user_usuario_app_id',
            String(usuario.usuario_app_id),
          );
          await setOneSignalExternalUserId(usuario.usuario_app_id);
        }
        const fullname = `${usuario.nombre || ''} ${
          usuario.apellido || ''
        }`.trim();
        if (fullname) await AsyncStorage.setItem('user_fullname', fullname);
        if (usuario.mail)
          await AsyncStorage.setItem('user_email', usuario.mail);
        if (usuario.foto_perfil_url)
          await AsyncStorage.setItem(
            'user_profile_url',
            usuario.foto_perfil_url,
          );
      } else {
        if (email) await AsyncStorage.setItem('user_email', String(email));
      }
    } catch (e) {
      console.warn('QuickLogin save auth error', e);
    }

    await AsyncStorage.multiSet([
      ['session_active', '1'],
      ['session_guest', '0'],
      ['last_login_at', String(Date.now())],
    ]);

    await AsyncStorage.removeItem('session_guest_at');

    const welcomeName =
      (result.data?.usuario &&
        `${result.data.usuario.nombre || ''} ${
          result.data.usuario.apellido || ''
        }`.trim()) ||
      null;
    const welcomeText = welcomeName
      ? `¡Bienvenido, ${welcomeName}!`
      : '¡Bienvenido!';
    showToast(welcomeText, true, 900, () => {
      navigation.reset({
        index: 0,
        routes: [{name: 'Home'}],
      });
    });
  };

  const isFilled = password.trim().length >= 4;
  const avatarSize = Math.round(Math.min(width * 0.18, 84));
  const logoWidth = Math.min(220, Math.round(width * 0.58));
  const backTop = (insets.top ?? 12) + 6;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={[styles.top, {paddingTop: backTop + 50, paddingBottom: 8}]}>
        <TouchableOpacity
          style={[styles.back, {top: backTop + 2}]}
          onPress={() => navigation.navigate('Recent')}>
          <Ionicons name="chevron-back" size={22} color="#0b58ff" />
        </TouchableOpacity>

        <Image
          source={require('../../assets/images/logo.png')}
          style={[styles.logo, {width: logoWidth, marginTop: 8}]}
          resizeMode="contain"
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <View style={{marginTop: 18, alignItems: 'center', width: '100%'}}>
          <View
            style={[
              styles.avatarWrap,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius: Math.round(avatarSize / 2),
              },
            ]}>
            <Image
              source={avatarUrl ? {uri: avatarUrl} : DEFAULT_AVATAR}
              style={styles.avatarImage}
            />
          </View>

          <Text style={styles.emailText} numberOfLines={1} ellipsizeMode="tail">
            {email}
          </Text>
        </View>

        <View
          style={[
            styles.formContainer,
            {width: Math.min(520, Math.round(width * 0.9))},
          ]}>
          <View style={styles.loginInputWrapper}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Contraseña"
              secureTextEntry
              style={styles.loginInputInner}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={onLogin}
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
              textContentType="password"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.continueBtn,
              isFilled ? styles.continueBtnActive : styles.continueBtnInactive,
              loading && {opacity: 0.9},
            ]}
            onPress={onLogin}
            disabled={loading || !isFilled}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.continueText}>Continuar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotWrap}
            onPress={() => navigation.navigate('SendEmail')}>
            <Text style={styles.forgotText}>¿Se te olvidó tu contraseña?</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#fff'},

  top: {
    width: '100%',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  back: {
    position: 'absolute',
    left: 12,
    padding: 8,
    zIndex: 10,
  },

  logo: {height: 76},

  container: {alignItems: 'center', paddingHorizontal: 20, flex: 1},

  avatarWrap: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    resizeMode: 'cover',
    color: '#000',
  },

  emailText: {
    marginTop: 12,
    fontWeight: '400',
    fontSize: 16,
    color: '#111',
    textAlign: 'center',
  },

  formContainer: {marginTop: 20, alignItems: 'center'},

  loginInputWrapper: {
    width: '100%',
    height: 52,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#111',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    marginBottom: 14,
  },
  loginInputInner: {
    width: '100%',
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
    color: '#111',
  },

  continueBtn: {
    paddingVertical: 12,
    borderRadius: 26,
    alignItems: 'center',
    width: '100%',
    marginTop: 2,
  },

  continueBtnInactive: {
    backgroundColor: '#5f82ff',
    shadowOpacity: 0,
    elevation: 0,
  },

  continueBtnActive: {
    backgroundColor: '#0b58ff', // more vivid
    shadowColor: '#0b58ff',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },

  continueText: {color: '#fff', fontWeight: '700', fontSize: 16},

  forgotWrap: {marginTop: 14},
  forgotText: {color: '#0b58ff', fontWeight: '600'},

  successToastText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '700',
  },

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
});
