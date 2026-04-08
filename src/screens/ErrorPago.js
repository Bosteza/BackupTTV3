//Working good
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  useWindowDimensions,
  PixelRatio,
  Platform,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

export default function ErrorPago() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();

  const params = (route && route.params) || {};
  const {
    title = 'Error de pago',
    message = 'Ocurrió un problema procesando el pago.',
    transactionId = null,
  } = params;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wp = p => (Number(p) / 100) * width;
  const hp = p => (Number(p) / 100) * height;
  const rf = p => {
    const size = (Number(p) / 100) * width;
    return Math.round(PixelRatio.roundToNearestPixel(size));
  };

  const styles = makeStyles({width, height, clamp, wp, hp, rf});

  const displayedMessage = String(
    message || 'Ocurrió un problema procesando el pago.',
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar
        barStyle="dark-content"
        translucent={Platform.OS === 'android'}
        backgroundColor="transparent"
      />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          accessibilityLabel="Volver"
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Ionicons
            name="chevron-back"
            size={styles.iconSize}
            color="#B91C1C"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          Error de pago
        </Text>

        <View style={styles.headerBtnPlaceholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {paddingBottom: Math.max(18, insets.bottom + 18)},
        ]}>
        <LinearGradient
          colors={['#fff6f6', '#fff0f0']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.hero}>
          <View style={styles.heroInner}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="close-circle"
                size={styles.iconInnerSize}
                color="#B91C1C"
              />
            </View>

            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            <Text style={styles.subtitle}>{displayedMessage}</Text>
          </View>
        </LinearGradient>

        <View style={[styles.detailsCard, {marginTop: -styles.overlap}]}>
          <View style={styles.helperRow}>
            <View style={styles.helperItem}>
              <Ionicons name="card" size={18} color="#B91C1C" />
              <Text style={styles.helperText}>Revisa CVV y fecha</Text>
            </View>

            <View style={styles.helperItem}>
              <Ionicons name="swap-horizontal" size={18} color="#B91C1C" />
              <Text style={styles.helperText}>Prueba otra tarjeta</Text>
            </View>

            <View style={styles.helperItem}>
              <Ionicons name="wallet" size={18} color="#B91C1C" />
              <Text style={styles.helperText}>Verifica fondos</Text>
            </View>

            <View style={styles.helperItem}>
              <Ionicons name="chatbubble-ellipses" size={18} color="#B91C1C" />
              <Text style={styles.helperText}>Contacta soporte</Text>
            </View>
          </View>

          <View style={styles.sep} />

          {transactionId ? (
            <Text style={styles.subtleText}>
              ID transacción: {String(transactionId)}
            </Text>
          ) : (
            <Text style={styles.subtleText}>
              Si el problema persiste, pide ayuda al soporte.
            </Text>
          )}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('QRMain', {transactionId})}
            activeOpacity={0.92}>
            <Text style={styles.primaryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpCard}>
          <Text style={styles.accentTitle}>¿Necesitas ayuda?</Text>
          <Text style={styles.accentSubtitle}>
            El personal de tu banco puede confirmar el estado de tu pago y
            ayudarte a resolver incidencias.
          </Text>

          <View style={styles.extraRow}>
            <View style={styles.extraItem}>
              <Ionicons name="shield-checkmark" size={16} color="#B91C1C" />
              <Text style={styles.extraText}>Pago seguro</Text>
            </View>
            <View style={styles.extraItem}>
              <Ionicons name="help-circle" size={16} color="#B91C1C" />
              <Text style={styles.extraText}>Soporte disponible</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles({width, height, clamp, wp, hp, rf}) {
  const basePad = Math.round(clamp(wp(4), 14, 26));
  const headerH = 56;

  const iconSize = Math.round(clamp(rf(3.6), 20, 28));

  const iconCircleSize = Math.round(clamp(rf(12.6), 86, 120));
  const iconInnerSize = Math.round(iconCircleSize * 0.98);

  const titleSize = Math.round(clamp(rf(5.2), 18, 28));
  const subtitleSize = Math.round(clamp(rf(3.2), 13, 18));

  const overlap = Math.round(clamp(hp(4.2), 26, 54));
  const heroPadTop = Math.round(clamp(hp(2.2), 16, 24));
  const heroPadBottom = overlap + Math.round(clamp(hp(2.2), 16, 26));
  const heroMinHeight = Math.round(clamp(hp(30), 210, 340));

  const helperItemFlexBasis = width >= 360 ? '48%' : '100%';

  const cardShadow =
    Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowOffset: {width: 0, height: 10},
          shadowRadius: 18,
        }
      : {elevation: 10};

  const s = StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: '#FFFFFF'},

    header: {
      height: headerH,
      paddingHorizontal: basePad,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#FFFFFF',
    },
    headerBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerBtnPlaceholder: {width: 44, height: 44},
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: Math.round(clamp(rf(3.4), 14, 18)),
      fontWeight: Platform.OS === 'ios' ? '800' : '900',
      color: '#111827',
      paddingHorizontal: 8,
    },

    iconSize,

    scroll: {flex: 1},
    scrollContent: {
      paddingHorizontal: basePad,
      paddingTop: 8,
    },

    hero: {
      borderRadius: 18,
      overflow: 'hidden',
      minHeight: heroMinHeight,
    },
    heroInner: {
      alignItems: 'center',
      paddingTop: heroPadTop,
      paddingBottom: heroPadBottom,
      paddingHorizontal: basePad,
    },

    iconCircle: {
      width: iconCircleSize,
      height: iconCircleSize,
      borderRadius: iconCircleSize / 2,
      backgroundColor: 'rgba(185,28,28,0.04)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(185,28,28,0.08)',
    },
    iconInnerSize,

    title: {
      marginTop: 12,
      fontSize: titleSize,
      color: '#111827',
      fontWeight: Platform.OS === 'ios' ? '800' : '900',
      textAlign: 'center',
    },
    subtitle: {
      marginTop: 8,
      fontSize: subtitleSize,
      color: '#374151',
      fontWeight: '600',
      textAlign: 'center',
      paddingHorizontal: Math.round(basePad / 3),
      lineHeight: Math.round(subtitleSize * 1.25),
    },

    overlap,

    detailsCard: {
      backgroundColor: '#fff',
      borderRadius: 14,
      padding: Math.round(clamp(wp(4), 14, 20)),
      ...cardShadow,
    },

    helperRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginTop: 2,
      marginBottom: 10,
    },
    helperItem: {
      flexBasis: helperItemFlexBasis,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingRight: 8,
    },
    helperText: {
      marginLeft: 10,
      color: '#374151',
      fontWeight: '700',
      fontSize: Math.round(clamp(rf(2.2), 11, 13)),
    },

    sep: {
      height: 1,
      backgroundColor: '#EEF2F7',
      marginVertical: 10,
      borderRadius: 2,
    },

    subtleText: {
      color: '#6B7280',
      fontSize: Math.round(clamp(rf(2.2), 11, 13)),
      marginBottom: 12,
    },

    primaryBtn: {
      backgroundColor: '#B91C1C',
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      ...(Platform.OS === 'ios'
        ? {
            shadowColor: '#B91C1C',
            shadowOpacity: 0.18,
            shadowOffset: {width: 0, height: 10},
            shadowRadius: 16,
          }
        : {elevation: 6}),
    },
    primaryBtnText: {
      color: '#fff',
      fontWeight: Platform.OS === 'ios' ? '800' : '900',
      fontSize: Math.round(clamp(rf(2.8), 14, 18)),
    },

    helpCard: {
      marginTop: 14,
      backgroundColor: '#fff',
      borderRadius: 14,
      padding: 14,
      alignItems: 'center',
      ...(Platform.OS === 'ios'
        ? {
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowOffset: {width: 0, height: 8},
            shadowRadius: 14,
          }
        : {elevation: 6}),
    },
    accentTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: '#0b1220',
      marginBottom: 6,
      textAlign: 'center',
    },
    accentSubtitle: {
      fontSize: 13,
      color: '#475569',
      marginBottom: 12,
      textAlign: 'center',
      lineHeight: 18,
    },

    extraRow: {
      flexDirection: 'row',
      width: '100%',
      justifyContent: 'space-around',
    },
    extraItem: {flexDirection: 'row', alignItems: 'center'},
    extraText: {
      marginLeft: 8,
      color: '#334155',
      fontWeight: '700',
      fontSize: 13,
    },
  });

  // expose numeric values we use in render
  s.overlap = overlap;
  s.iconSize = iconSize;
  s.iconInnerSize = iconInnerSize;

  return s;
}
