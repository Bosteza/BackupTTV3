import React, {useCallback, useEffect, useState} from 'react';
import {View, Text, TouchableOpacity, Image} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';

const BLUE = '#0046ff';
const WHITE = '#fff';

export default function GuestGate({
  children,
  title = '¡Únete a la familia TabTrack!',
  subtitle = 'Esta sección está disponible al iniciar sesión.',
  buttonText = 'Iniciar sesión',
}) {
  const navigation = useNavigation();
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(false);

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      const pairs = await AsyncStorage.multiGet([
        'session_active',
        'session_guest',
      ]);
      const map = Object.fromEntries(pairs);

      const sessionActive = map.session_active;
      const sessionGuest = map.session_guest;

      setBlocked(sessionActive !== '1' && sessionGuest === '1');
    } finally {
      setChecking(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const goLogin = () => {
    navigation.reset({
      index: 0,
      routes: [{name: 'Welcome'}],
    });
  };

  const goBackToFeed = () => {
    navigation.reset({
      index: 0,
      routes: [{name: 'Feed'}],
    });
  };

  const renderBlockedView = () => (
    <View
      style={{
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
      }}>
      {/*
      <TouchableOpacity
        onPress={goBackToFeed}
        style={{
          position: 'absolute',
          top: 56,
          left: 20,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: BLUE,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name="arrow-back" size={20} color={WHITE} />
      </TouchableOpacity>
      */}

      <Image
        source={require('../../assets/images/logo.png')}
        style={{width: 200, height: 90, marginBottom: 26}}
        resizeMode="contain"
      />

      <Text
        style={{
          fontSize: 18,
          fontWeight: '700',
          textAlign: 'center',
          color: '#000',
        }}>
        {title}
      </Text>

      <Text
        style={{
          marginTop: 10,
          fontSize: 14,
          textAlign: 'center',
          color: '#444',
        }}>
        {subtitle}
      </Text>

      <TouchableOpacity
        onPress={goLogin}
        activeOpacity={0.9}
        style={{
          marginTop: 18,
          width: 180,
          height: 44,
          borderRadius: 22,
          overflow: 'hidden',
        }}>
        <LinearGradient
          colors={['#9F4CFF', '#6A43FF', '#2C7DFF']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={{
            flex: 1,
            borderRadius: 22,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Text
            style={{
              width: '100%',
              textAlign: 'center',
              color: '#fff',
              fontSize: 15,
              fontWeight: '600',
            }}>
            {buttonText}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (!blocked) return children;

  return renderBlockedView();
}
