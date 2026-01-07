import React, {useState, useRef, useEffect} from 'react';
import {useNotifications} from './NotificationProvider';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Modal,
  ScrollView,
  Button,
  PixelRatio,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native';
import {useNavigation} from '@react-navigation/native';
import {useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

export default function RatingSuccessScreen() {
  const navigation = useNavigation();
  const animRef = useRef(null);

  const {width, height} = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Responsive helpers
  const baseWidth = 375; // referencia iPhone
  const rf = size =>
    Math.round(PixelRatio.roundToNearestPixel((size * width) / baseWidth)); // responsive factor
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // derived sizes (responsives)
  const headerHeight = clamp(rf(56), 48, 88);
  const iconSize = Math.round(clamp(rf(3.8), 21, 28));
  const logoWidth = clamp(rf(160), 100, Math.round(width * 0.6));
  const logoHeight = Math.round(logoWidth * 0.35);
  const lottieSize = clamp(rf(140), 88, Math.round(width * 0.46));
  const contentPaddingHorizontal = clamp(rf(24), 12, 40);
  const btnMaxWidth = Math.min(
    520,
    Math.round(width - contentPaddingHorizontal * 2),
  );
  const btnHorizontalPadding = clamp(rf(20), 12, 40);
  const fontLarge = clamp(rf(24), 18, 36);
  const fontMedium = clamp(rf(15), 12, 20);
  const infoMaxWidth = Math.min(
    Math.round(width - contentPaddingHorizontal * 2),
    760,
  );

  const [showNotifications, setShowNotifications] = useState(false);
  const {notifications, dispatch} = useNotifications();

  useEffect(() => {
    // reproducir la animación al montar (si la referencia existe)
    try {
      animRef.current?.play?.();
    } catch (e) {
      // fallback silencioso si no se puede reproducir
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllRead = () => {
    dispatch({type: 'MARK_ALL_READ'});
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          paddingTop:
            Platform.OS === 'android'
              ? StatusBar.currentHeight || insets.top
              : insets.top,
        },
      ]}>
      <StatusBar barStyle="dark-content" />
      {/* HEADER */}

      <Modal visible={showNotifications} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderText}>Notificaciones</Text>
              <TouchableOpacity
                onPress={() => setShowNotifications(false)}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Ionicons name="close" size={18} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              {notifications.map(n => (
                <View
                  key={n.id}
                  style={[
                    styles.notificationItem,
                    n.read ? styles.read : styles.unread,
                  ]}>
                  <Text style={styles.notificationText}>{n.text}</Text>
                </View>
              ))}
            </ScrollView>

            <Button
              title="Marcar todo como leído"
              onPress={markAllRead}
              color="#0046ff"
            />
          </View>
        </View>
      </Modal>

      <View
        style={[
          styles.header,
          {height: headerHeight, paddingHorizontal: clamp(rf(12), 8, 20)},
        ]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ExperiencesMain')}
          style={styles.headerBtn}>
          <Ionicons
            name="chevron-back"
            size={clamp(rf(20), 18, 26)}
            color="#0046ff"
          />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, {fontSize: clamp(rf(18), 14, 22)}]}>
          Experiencias
        </Text>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setShowNotifications(true)}
            style={[styles.headerButton, {marginLeft: 12}]}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Ionicons name="notifications-outline" size={30} color="#0051c9" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Fondo y contenido */}
      <LinearGradient
        colors={['#FFFFFF', '#F4F8FF']}
        start={{x: 0, y: 0}}
        end={{x: 0, y: 1}}
        style={styles.background}>
        <View
          style={[
            styles.container,
            {
              paddingHorizontal: contentPaddingHorizontal,
              paddingBottom: Math.max(24, insets.bottom || 24),
            },
          ]}>
          {/* logo grande */}
          <Image
            source={require('../../assets/images/logo.png')}
            style={{
              width: logoWidth,
              height: logoHeight,
              resizeMode: 'contain',
              marginBottom: rf(6),
            }}
          />

          <View style={{height: rf(8)}} />

          {/* Lottie */}
          <View style={[styles.lottieWrap, {marginBottom: rf(8)}]}>
            <LottieView
              ref={animRef}
              source={require('../../assets/images/succes.json')}
              autoPlay
              loop={false}
              style={{width: lottieSize, height: lottieSize}}
              resizeMode="contain"
            />
          </View>

          <Text
            style={[styles.thanks, {fontSize: fontLarge, marginBottom: rf(6)}]}>
            ¡Gracias por tu calificación!
          </Text>

          <Text
            style={[
              styles.info,
              {
                fontSize: fontMedium,
                maxWidth: infoMaxWidth,
                marginBottom: rf(18),
                lineHeight: Math.round(fontMedium * 1.6),
              },
            ]}>
            Gracias por tu calificación, para nosotros es muy importante. Nos
            ayuda a mejorar y seguir ofreciéndote un mejor servicio.
          </Text>

          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => navigation.navigate('ExperiencesMain')}
            style={[styles.btnWrapper, {width: '100%'}]}>
            <LinearGradient
              colors={['#9F4CFF', '#6A43FF', '#2C7DFF']}
              start={{x: 0, y: 0}}
              end={{x: 1.5, y: 0}}
              style={[
                styles.primaryBtn,
                {
                  width: Math.min(
                    btnMaxWidth,
                    Math.round(width - contentPaddingHorizontal * 2),
                  ),

                  borderRadius: Math.round(clamp(rf(28), 16, 40)),
                },
              ]}>
              <Text
                style={[
                  styles.primaryBtnText,
                  {fontSize: clamp(rf(16), 13, 18)},
                ]}>
                Volver
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text
            style={[
              styles.footerNote,
              {marginTop: rf(14), fontSize: clamp(rf(13), 11, 15)},
            ]}>
            Tu opinión nos ayuda a crecer ✨
          </Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },

  header: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  headerBtn: {padding: 8},
  headerTitle: {
    fontFamily: 'Montserrat-Bold',
    color: '#0046ff',
  },
  headerRight: {flexDirection: 'row', alignItems: 'center'},

  background: {flex: 1},

  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Lottie */
  lottieWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  successAnimation: {
    width: 140,
    height: 140,
  },

  thanks: {
    fontFamily: 'Montserrat-Bold',
    color: '#111',
    textAlign: 'center',
  },

  info: {
    fontFamily: 'Montserrat-Regular',
    color: 'rgba(7,7,7,0.85)',
    textAlign: 'center',
    maxWidth: 680,
  },

  btnWrapper: {marginTop: 6, alignItems: 'center'},
  primaryBtn: {
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8e2de2',
    shadowOpacity: 0.12,
    shadowOffset: {width: 0, height: 8},
    shadowRadius: 14,
    elevation: 4,
  },
  primaryBtnText: {
    fontFamily: 'Montserrat-Bold',
    color: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
  },

  footerNote: {color: '#6b6b6b', opacity: 0.9, textAlign: 'center'},
  badge: {
    position: 'absolute',
    backgroundColor: '#ff3b30',
    borderRadius: 9,
    paddingHorizontal: 5,
    top: -6,
    right: -2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 15,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    padding: 8,
    width: '90%',
    maxWidth: 420,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  modalHeaderText: {
    fontSize: 18,
    color: '#000',
  },
  modalList: {
    paddingHorizontal: 16,
    maxHeight: 260,
  },
  notificationItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  notificationText: {
    fontSize: 14,
    color: '#333',
  },
  unread: {
    backgroundColor: '#eef5ff',
  },
  read: {
    backgroundColor: '#fff',
  },
});
