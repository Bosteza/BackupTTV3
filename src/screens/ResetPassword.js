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
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Keyboard} from 'react-native';

const API_BASE = 'https://api.tab-track.com/api/mobileapp';
const API_TOKEN = '...';
const BLUE = '#0046ff';

export default function ResetPasswordCodeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const mail = route?.params?.mail ?? '';
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleUpdate = async () => {
    Keyboard.dismiss();

    if (!mail || !code || !newPassword) {
      return showToast('Completa todos los campos');
    }
    if (newPassword.length < 6) {
      return showToast('La contraseña debe tener al menos 6 caracteres');
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/usuarios/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({
          mail,
          code: code.trim(),
          new_password: newPassword,
        }),
      });

      const text = await res.text();
      const data = JSON.parse(text);

      if (res.ok) {
        showToast('Contraseña actualizada', true, 1200, () =>
          navigation.replace('Login'),
        );
      } else {
        showToast(data?.error || 'No se pudo actualizar');
      }
    } catch {
      showToast('Error de red');
    } finally {
      setLoading(false);
    }
  };

  const topPadding = Math.max(insets.top ?? 0, StatusBar.currentHeight ?? 0);

  return (
    <View style={styles.flex}>
      <LinearGradient
        colors={['#fff', '#fff']}
        style={[styles.container, {paddingTop: topPadding}]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={BLUE} />
        </TouchableOpacity>

        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
        />

        <Text style={styles.title}>Actualizar contraseña</Text>

        <TextInput
          style={[styles.input, styles.inputBorder]}
          placeholder="Código"
          placeholderTextColor="#000"
          value={code}
          onChangeText={setCode}
        />

        <TextInput
          style={[styles.input, styles.inputBorder]}
          placeholder="Nueva contraseña"
          placeholderTextColor="#000"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <TouchableOpacity
          style={[styles.button, loading && {opacity: 0.6}]}
          onPress={handleUpdate}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#0046ff" />
          ) : (
            <Text style={styles.buttonText}>Actualizar</Text>
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 120,
  },
  logo: {
    width: 250,
    height: 100,
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
    width: '80%',
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
    backgroundColor: '#0046ff',
    borderRadius: 25,
    width: '60%',
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
  backButton: {
    position: 'absolute',
    top: 20,
    left: 24,
  },
});
