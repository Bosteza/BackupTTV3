// Login.js
import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  StatusBar,
  useWindowDimensions,
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Keyboard} from 'react-native';

const API_BASE = 'https://api.tab-track.com/api/mobileapp';
const API_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2NzM4MjQyNiwianRpIjoiODQyODVmZmUtZDVjYi00OGUxLTk1MDItMmY3NWY2NDI2NmE1IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NjczODI0MjYsImV4cCI6MTc2OTk3NDQyNiwicm9sIjoiRWRpdG9yIn0.tx84js9-CPGmjLKVPtPeVhVMsQiRtCeNcfw4J4Q2hyc';
const PRIMARY = '#FEFFFFFF';
const BLUE = '#0046ff';

export default function Login() {
  const navigation = useNavigation();
  const {width, height} = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const BASE_WIDTH = 375;
  const rf = size => Math.round((size * width) / BASE_WIDTH);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const QUICK_LOGIN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  const shiftY = useRef(new Animated.Value(-10)).current;

  const [quickProfile, setQuickProfile] = useState(null); // { email, fullname, avatarUrl }
  const [quickMode, setQuickMode] = useState(false); // when true -> password-only UI
  const [showFullLogin, setShowFullLogin] = useState(false);

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

  const [booting, setBooting] = useState(true);

  const topInset = Math.max(insets.top ?? 0, StatusBar.currentHeight ?? 0);
  const headerApprox = 56;
  const keyboardVerticalOffset =
    Platform.OS === 'ios'
      ? topInset + headerApprox
      : StatusBar.currentHeight
      ? StatusBar.currentHeight + 10
      : 20;

  const toastBottomBase =
    Platform.OS === 'ios' ? scaled.toastBottomIOS : scaled.toastBottomAndroid;
  const toastBottom = toastBottomBase + (insets.bottom ?? 0);
  const successToastBottom = toastBottom + 20;

  const titleCaritaSpacing = clamp(Math.round(scaled.titleFont * 0.5), 1, 8);

  const isMode1 = quickProfile && !quickMode && !showFullLogin;
  const isMode2 = quickProfile && quickMode && !showFullLogin;
  const isMode3 = showFullLogin;

  const handleBack = () => {
    // MODE 2 → MODE 1
    if (isMode2) {
      setQuickMode(false);
      setPassword('');
      return;
    }

    // MODE 3 → MODE 1 (if quick profile exists)
    if (isMode3 && quickProfile) {
      setShowFullLogin(false);
      setPassword('');
      return;
    }
    // Fallback (no quick profile at all)
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Welcome');
    }
  };

  const dynamic = StyleSheet.create({
    containerOverride: {
      paddingVertical: scaled.paddingVertical,
    },
    logoOverride: {
      width: scaled.logoWidth,
      height: scaled.logoHeight,
    },
    titleOverride: {
      fontSize: scaled.titleFont,
      marginTop: scaled.titleMarginTop,
    },
    caritaOverride: {
      fontSize: scaled.caritaFont,
      marginTop: Math.round(Math.max(4, scaled.titleFont * 0.05)),
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
    forgotOverride: {
      fontSize: scaled.forgotSize,
    },
    buttonContainerOverride: {
      width: scaled.buttonContainerWidthPct,
      marginTop: scaled.buttonContainerMarginTop,
    },
    toastOverride: {
      bottom: toastBottom,
    },
    successToastOverride: {
      bottom: successToastBottom,
    },
    titleCaritaContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: scaled.titleMarginTop,
      marginBottom: titleCaritaSpacing,
      paddingHorizontal: Math.round(Math.min(width * 0.08, 28)),
      minHeight: Math.round(scaled.titleFont * 1.6),
      width: '100%',
    },
  });

  const [mail, setMail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [toastMsg, setToastMsg] = useState('');
  const [toastStyle, setToastStyle] = useState(styles.toast);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const [canRenderLogin, setCanRenderLogin] = useState(false);

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

  const handleLogin = async emailOverride => {
    Keyboard.dismiss();

    const emailToUse = (emailOverride ?? mail).trim();
    if (!emailToUse || !password) {
      return showToast('Falta correo o contraseña');
    }

    setLoading(true);
    try {
      const url = `${API_BASE}/usuarios/validate-password`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({mail: emailToUse, password}),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = {error: text};
      }

      if (res.status === 200) {
        const usuario = data.usuario || {};

        for (const [key, value] of Object.entries(usuario)) {
          if (value !== null && value !== undefined) {
            await AsyncStorage.setItem(`user_${key}`, String(value));
          }
        }

        if (usuario.usuario_app_id) {
          await AsyncStorage.setItem(
            'user_usuario_app_id',
            usuario.usuario_app_id,
          );
        }

        await AsyncStorage.setItem('user_valid', String(data.valid));

        const fullname = `${usuario.nombre || ''} ${
          usuario.apellido || ''
        }`.trim();
        await AsyncStorage.setItem('user_fullname', fullname);

        if (usuario.mail) {
          await AsyncStorage.setItem('user_email', usuario.mail);
        }

        await AsyncStorage.multiSet([
          ['session_active', '1'],
          ['session_login_at', String(Date.now())],
          ['last_login_at', String(Date.now())],
        ]);

        showToast(
          fullname ? `¡Bienvenid@, ${fullname}!` : '¡Bienvenid@!',
          true,
          700,
          () => navigation.replace('Home'),
        );
      } else {
        const errMsg =
          data?.error || data?.message || 'Correo o contraseña inválidos';
        showToast(errMsg);
      }
    } catch {
      showToast('Error de red');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;

    const bootstrap = async () => {
      try {
        // Block Login UI until we decide what to do
        if (alive) {
          setCanRenderLogin(false);
          setBooting(true);
        }

        // 1) If session is active, never show Login UI at all
        const sessionActive = await AsyncStorage.getItem('session_active');
        if (sessionActive === '1') {
          navigation.reset({index: 0, routes: [{name: 'Home'}]});
          return; // keep canRenderLogin = false so Login never renders
        }

        // 2) Otherwise, proceed with your existing quick-card logic
        const pairs = await AsyncStorage.multiGet([
          'user_email',
          'user_fullname',
          'user_profile_url',
          'last_login_at',
        ]);

        const map = Object.fromEntries(pairs);
        const email = map.user_email || '';
        const fullname = map.user_fullname || '';
        const avatarUrl = map.user_profile_url || null;
        const lastLoginAt = Number(map.last_login_at || '0');

        const isRecent =
          lastLoginAt > 0 && Date.now() - lastLoginAt <= QUICK_LOGIN_MAX_AGE_MS;

        if (!alive) return;

        if (email && isRecent) {
          setQuickProfile({email, fullname, avatarUrl});
          setQuickMode(false);
          setShowFullLogin(false);
        } else {
          setQuickProfile(null);
          setShowFullLogin(true);
        }

        setCanRenderLogin(true);
      } catch (e) {
        if (!alive) return;
        setQuickProfile(null);
        setShowFullLogin(true);
        setCanRenderLogin(true);
      } finally {
        if (alive) setBooting(false);
      }
    };

    bootstrap();

    return () => {
      alive = false;
    };
  }, [navigation]);

  if (!canRenderLogin) {
    return <View style={{flex: 1, backgroundColor: '#fff'}} />;
  }

  return (
    <View style={{width: '100%', flex: 1, backgroundColor: '#fff'}}>
      <LinearGradient
        colors={['rgb(255, 255, 255)', 'rgb(255, 255, 255)']}
        locations={[0.35, 0.85]}
        start={{x: 0, y: 1}}
        end={{x: 1, y: 0}}
        style={[styles.container, dynamic.containerOverride]}>
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

        {!(quickProfile && quickMode && !showFullLogin) && (
          <View style={dynamic.titleCaritaContainer}>
            <Text style={[styles.title, dynamic.titleOverride]}>¡Hola!</Text>
            <Text style={[styles.carita, dynamic.caritaOverride]}>:)</Text>
          </View>
        )}

        <Animated.View
          style={{
            flex: 1,
            width: '100%',
            alignItems: 'center',
            transform: [{translateY: shiftY}],
          }}>
          {/* MODE 1: QUICK CARD*/}
          {quickProfile && !showFullLogin && !quickMode ? (
            <View
              style={{
                width: '80%',
                marginTop: 20,

                alignItems: 'center',
              }}>
              <TouchableOpacity
                onPress={() => {
                  setMail(quickProfile.email);
                  setPassword('');
                  setQuickMode(true);
                }}
                style={{
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderRadius: 16,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                <View
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 27,
                    overflow: 'hidden',
                    backgroundColor: '#f3f6ff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}>
                  {quickProfile.avatarUrl ? (
                    <Image
                      source={{uri: quickProfile.avatarUrl}}
                      style={{width: '100%', height: '100%'}}
                    />
                  ) : (
                    <Text style={{fontSize: 18, fontWeight: '700'}}>👤</Text>
                  )}
                </View>

                <View style={{flex: 1}}>
                  <Text
                    style={{fontSize: 16, fontWeight: '700', color: '#000'}}>
                    {quickProfile.fullname || 'Continuar'}
                  </Text>
                  <Text style={{fontSize: 12, color: '#555', marginTop: 2}}>
                    {quickProfile.email}
                  </Text>
                  <Text style={{fontSize: 12, color: BLUE, marginTop: 6}}>
                    Toca para continuar
                  </Text>
                </View>
              </TouchableOpacity>

              <Text
                style={{
                  marginTop: 22,
                  color: '#000',
                  opacity: 0.8,
                  textAlign: 'center',
                  marginBottom: 5,
                  fontSize: 15,
                }}>
                ¿No eres tú?
              </Text>

              <TouchableOpacity
                style={[
                  styles.inicio,
                  dynamic.inicioOverride,
                  {
                    backgroundColor: '#fff',
                    borderWidth: 1,
                    borderColor: BLUE,
                  },
                ]}
                onPress={() => {
                  setShowFullLogin(true);
                  setQuickMode(false);
                  setMail('');
                  setPassword('');
                }}>
                <Text
                  style={[
                    styles.buttonText,
                    dynamic.buttonTextOverride,
                    {color: BLUE},
                  ]}>
                  Usar otra cuenta
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* MODE 2: PASSWORD-ONLY (quick mode) */}
          {quickProfile && quickMode && !showFullLogin ? (
            <View
              style={{
                width: '100%',
                alignItems: 'center',
                marginTop: 30,
              }}>
              {/* Avatar */}
              <View
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  overflow: 'hidden',
                  backgroundColor: '#f2f2f2',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}>
                {quickProfile.avatarUrl ? (
                  <Image
                    source={{uri: quickProfile.avatarUrl}}
                    style={{width: '100%', height: '100%'}}
                  />
                ) : (
                  <Ionicons name="person" size={48} color="#888" />
                )}
              </View>

              {/* Username */}
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: 'Montserrat-Bold',
                  color: '#000',
                  marginBottom: 18,
                }}>
                {quickProfile.email}
              </Text>

              {/* Password input */}
              <TextInput
                style={[
                  styles.input,
                  styles.inputBorder,
                  dynamic.inputOverride,
                  {
                    width: '80%',
                    backgroundColor: '#fff',
                  },
                ]}
                placeholder="Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              {/* Login button */}
              <TouchableOpacity
                style={[
                  styles.inicio,
                  dynamic.inicioOverride,
                  {
                    width: '80%',
                    marginTop: 18,
                  },
                  (loading || !password) && {opacity: 0.6},
                ]}
                onPress={() => handleLogin(quickProfile.email)}
                disabled={loading || !password}>
                {loading ? (
                  <ActivityIndicator color={PRIMARY} />
                ) : (
                  <Text style={[styles.buttonText, dynamic.buttonTextOverride]}>
                    Continuar
                  </Text>
                )}
              </TouchableOpacity>

              {/* Forgot password */}
              <TouchableOpacity
                onPress={() => navigation.navigate('SendEmail')}
                style={{marginTop: 18}}>
                <Text
                  style={{
                    color: BLUE,
                    fontSize: 14,
                    fontFamily: 'Montserrat-Regular',
                  }}>
                  ¿Se te olvidó tu contraseña?
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* MODE 3: FULL LOGIN (email + password) */}
          {showFullLogin ? (
            <>
              <TextInput
                style={[
                  styles.input,
                  styles.inputBorder,
                  dynamic.inputOverride,
                ]}
                placeholder="Correo electrónico"
                placeholderTextColor="#000"
                value={mail}
                onChangeText={setMail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TextInput
                style={[
                  styles.input,
                  styles.inputBorder,
                  dynamic.inputOverride,
                ]}
                placeholder="Contraseña"
                placeholderTextColor="#000"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={[
                  styles.inicio,
                  dynamic.inicioOverride,
                  (loading || !(mail.trim() && password)) && {opacity: 0.6},
                ]}
                onPress={() => handleLogin()}
                disabled={loading || !(mail.trim() && password)}>
                {loading ? (
                  <ActivityIndicator color={PRIMARY} />
                ) : (
                  <Text style={[styles.buttonText, dynamic.buttonTextOverride]}>
                    Iniciar Sesión
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : null}

          {/* Keep forgot password visible in full login mode (optional) */}
          {showFullLogin && (
            <TouchableOpacity
              style={styles.forgotPasswordContainer}
              onPress={() => navigation.navigate('SendEmail')}>
              <Text style={[styles.forgotPasswordText, dynamic.forgotOverride]}>
                ¿Se te olvidó tu contraseña?
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </LinearGradient>

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

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: '#fff'},
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 90,
  },
  logo: {width: 250, height: 100, resizeMode: 'contain', marginTop: 5},
  title: {
    fontSize: 34,
    color: '#000',
    textAlign: 'center',
    marginTop: 18,
    fontFamily: 'Montserrat-Bold',
  },
  carita: {
    fontSize: 10,
    color: '#000',
    textAlign: 'center',
    marginTop: 1,
    fontFamily: 'Montserrat-Bold',
  },
  input: {
    width: '80%',
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 10,
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
  buttonText1: {color: '#000', fontSize: 16, fontFamily: 'Montserrat-Regular'},
  forgotPasswordContainer: {marginTop: 6, alignItems: 'center'},
  forgotPasswordText: {
    color: '#000',
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    opacity: 0.9,
  },
  buttonContainer: {width: '80%', marginTop: 18},
  button: {
    backgroundColor: '#ffffff',
    padding: 7,
    borderRadius: 10,
    marginVertical: 3,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 8,
  },
  icon: {width: 20, height: 20, marginRight: 10, color: '#000'},
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
  backButton: {
    alignSelf: 'flex-start',
    marginLeft: 24,
  },
  successToastText: {fontSize: 16, fontFamily: 'Montserrat-Bold'},
});
