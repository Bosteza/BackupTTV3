import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  useWindowDimensions,
  PixelRatio,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute} from '@react-navigation/native';

export default function ConfirmacionPago() {
  const navigation = useNavigation();
  const route = useRoute();
  const {width, height} = useWindowDimensions();

  const {
    amount = null,
    date = null,
    method = null,
    transactionId = null,
  } = (route && route.params) || {};

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wp = p => (Number(p) / 100) * width;
  const hp = p => (Number(p) / 100) * height;
  const rf = p => {
    const size = (Number(p) / 100) * width;
    return Math.round(PixelRatio.roundToNearestPixel(size));
  };

  const styles = makeStyles({width, height, clamp, wp, hp, rf});

  const formattedAmount =
    amount != null ? `$ ${Number(amount).toFixed(2)}` : '$ 0.00';
  const formattedDate = date || new Date().toLocaleString();
  const paymentMethod = method || 'Tarjeta';

  return (
    <View style={styles.root}>
      {/* 2) Status bar icons (time/battery) black */}
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      {/* TOP GRADIENT now starts at the very top */}
      <LinearGradient
        colors={['#7EE2A1', '#2ECC71', '#0F8F52']}
        start={{x: 0, y: 0}}
        end={{x: 0, y: 1}} // vertical so the very top stays light for black status icons
        style={styles.topGradient}>
        {/* Safe area only for content (not for the gradient background) */}
        <SafeAreaView style={styles.topSafeArea}>
          {/* HEADER moved INSIDE gradient */}
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Confirmación de pago
            </Text>

            <View style={styles.headerRightPlaceholder} />
          </View>

          {/* Existing top content */}
          <View style={styles.topContent}>
            <View style={styles.checkWrap}>
              <View style={styles.checkCircle}>
                <Ionicons
                  name="checkmark"
                  size={styles.checkIconSize}
                  color="#fff"
                />
              </View>
            </View>

            <Text style={styles.title}>¡Pago realizado!</Text>
            <Text style={styles.subtitle}>
              Gracias — tu transacción se procesó correctamente.
            </Text>

            <Text style={styles.amount}>{formattedAmount}</Text>

            <View style={styles.miniInfoRow}>
              <View style={styles.miniInfoCol}>
                <Text style={styles.miniLabel}>Fecha</Text>
                <Text style={styles.miniValue}>{formattedDate}</Text>
              </View>

              <View style={styles.miniInfoColEmpty} />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
      <View style={styles.detailsWrap}>
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Resumen</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Monto</Text>
            <Text style={styles.detailValue}>{formattedAmount}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Método</Text>
            <Text style={styles.detailValue}>{paymentMethod}</Text>
          </View>

          {/* Reference row removed */}

          <View style={styles.sep} />

          <Text style={styles.helpText}>
            Si necesitas ayuda, contáctanos desde el soporte del restaurante.
          </Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {position: 'relative', overflow: 'hidden'},
              ]}
              onPress={() =>
                navigation.navigate('QRMain', {transactionId: transactionId})
              }
              activeOpacity={0.92}>
              <LinearGradient
                colors={['#9F4CFF', '#6A43FF', '#2C7DFF']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}} // left -> right
                style={StyleSheet.absoluteFillObject}
              />

              <Text style={styles.primaryBtnText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {/* BOTTOM PROMO / THANKS */}
      <View style={styles.bottomArea}>
        <View style={styles.cardAccent}>
          <Text style={styles.accentTitle}>¡Gracias por tu preferencia!</Text>
          <Text style={styles.accentSubtitle}>
            Tu pago ayuda a que el servicio continúe con calidad.
          </Text>

          <View style={styles.extraRow}>
            <View style={styles.extraItem}>
              <Ionicons name="shield-checkmark" size={18} color="#6A43FF" />
              <Text style={styles.extraText}>Pago seguro</Text>
            </View>
            <View style={styles.extraItem}>
              <Ionicons name="lock-closed" size={18} color="#6A43FF" />
              <Text style={styles.extraText}>Transacción cifrada</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function makeStyles({width, height, clamp, wp, hp, rf}) {
  const basePad = Math.round(clamp(wp(4), 12, 28));
  const headerH = Math.round(clamp(hp(8), 56, 96));
  const iconSize = Math.round(clamp(rf(3.6), 18, 28));
  const topGradientHeight = Math.round(clamp(hp(36), 160, 340));

  const checkCircleSize = Math.round(clamp(rf(12), 68, 110));
  const checkIconSize = Math.round(checkCircleSize * 0.52);

  const titleSize = Math.round(clamp(rf(5.2), 18, 28));
  const subtitleSize = Math.round(clamp(rf(3.0), 13, 18));
  const amountSize = Math.round(clamp(rf(6.4), 20, 34));
  const smallNoteSize = Math.round(clamp(rf(2.6), 11, 14));

  const detailsPad = Math.round(clamp(wp(4), 12, 20));
  const detailLabelSize = Math.round(clamp(rf(2.8), 12, 14));
  const detailValueSize = Math.round(clamp(rf(3.4), 13, 16));

  const topSectionHeight = headerH + topGradientHeight;

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: '#F8FAFC',
    },

    topSafeArea: {
      backgroundColor: 'transparent',
    },

    // Increase height because header is now inside the gradient
    topGradient: {
      height: topSectionHeight,
      width: '100%',
      borderBottomLeftRadius: 22,
      borderBottomRightRadius: 22,
      overflow: 'hidden',
    },

    header: {
      height: headerH,
      backgroundColor: 'transparent',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: basePad,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    },
    headerBtn: {
      padding: Math.round(clamp(wp(1.2), 6, 12)),
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: Math.round(clamp(rf(3.4), 14, 18)),
      fontWeight: '800',
      color: '#fff',
      textAlign: 'center',
      flex: 1,
    },
    headerRightPlaceholder: {width: 44},

    iconSize, // numeric

    topContent: {
      alignItems: 'center',
      paddingHorizontal: basePad,
      paddingTop: Math.round(hp(2)),
    },

    checkWrap: {
      marginTop: 6,
    },
    checkCircle: {
      width: checkCircleSize,
      height: checkCircleSize,
      borderRadius: Math.round(checkCircleSize / 2),
      backgroundColor: 'rgba(255,255,255,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.18)',
      elevation: 6,
    },
    checkIconSize,

    title: {
      marginTop: 14,
      fontSize: titleSize,
      color: '#fff',
      fontWeight: '900',
      textAlign: 'center',
    },
    subtitle: {
      marginTop: 6,
      fontSize: subtitleSize,
      color: 'rgba(255,255,255,0.95)',
      fontWeight: '600',
      textAlign: 'center',
    },

    amount: {
      marginTop: 12,
      fontSize: amountSize,
      color: '#fff',
      fontWeight: '900',
      textAlign: 'center',
    },

    miniInfoRow: {
      marginTop: 12,
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: Math.round(wp(6)),
    },
    miniInfoCol: {alignItems: 'flex-start'},
    miniInfoColEmpty: {width: 1},
    miniLabel: {
      color: 'rgba(255,255,255,0.9)',
      fontSize: smallNoteSize,
      fontWeight: '700',
    },
    miniValue: {
      color: '#fff',
      fontSize: Math.round(clamp(rf(2.8), 12, 14)),
      fontWeight: '800',
    },

    detailsWrap: {
      paddingHorizontal: basePad,
      marginTop: -28,
    },
    detailsCard: {
      backgroundColor: '#fff',
      borderRadius: 14,
      padding: detailsPad,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowOffset: {width: 0, height: 6},
      shadowRadius: 12,
      elevation: 4,
    },

    sectionTitle: {
      fontSize: Math.round(clamp(rf(3.2), 14, 16)),
      fontWeight: '800',
      color: '#0b1220',
      marginBottom: 10,
    },

    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    detailLabel: {
      color: '#6b7280',
      fontSize: detailLabelSize,
      fontWeight: '700',
    },
    detailValue: {
      color: '#0f172a',
      fontSize: detailValueSize,
      fontWeight: '800',
      textAlign: 'right',
      maxWidth: '60%',
    },

    sep: {
      height: 1,
      backgroundColor: '#F1F5F9',
      marginVertical: 8,
      borderRadius: 2,
    },

    helpText: {
      color: '#475569',
      fontSize: Math.round(clamp(rf(2.6), 11, 14)),
      marginTop: 6,
      lineHeight: 18,
    },

    actionsRow: {
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },

    primaryBtn: {
      paddingHorizontal: Math.round(clamp(wp(6), 18, 28)),
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      width: '90%',
      maxWidth: 520,
      flexDirection: 'row',
    },
    primaryBtnText: {
      color: '#fff',
      fontWeight: '900',
      fontSize: Math.round(clamp(rf(2.8), 14, 18)),
    },

    bottomArea: {
      paddingHorizontal: basePad,
      paddingTop: 18,
      paddingBottom: Math.max(16, Math.round(hp(3))),
    },

    cardAccent: {
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowOffset: {width: 0, height: 6},
      shadowRadius: 12,
      elevation: 6,
    },
    accentTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#0b1220',
      marginBottom: 6,
    },
    accentSubtitle: {
      fontSize: 13,
      color: '#475569',
      marginBottom: 12,
      textAlign: 'center',
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
}
