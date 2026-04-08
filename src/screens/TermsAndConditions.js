import React, {useEffect, useRef, useState} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Pdf from 'react-native-pdf';

const PRIMARY = '#0046ff';

// Ajusta páginas reales dentro del PDF madre:
const SECTIONS = {
  terms: {label: 'Términos', page: 9},
  privacy: {label: 'Privacidad', page: 1},
  waiver: {label: 'Deslinde', page: 10},
};

const TermsAndConditions = ({navigation, route}) => {
  const pdfRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  const initial = route?.params?.section ?? 'terms';
  const [active, setActive] = useState(SECTIONS[initial] ? initial : 'terms');

  // ✅ iOS only: PDF en /ios/assets/assets/...
  // 👇 AJUSTA LOS ../ SEGÚN LA UBICACIÓN REAL DE ESTE ARCHIVO JS
  const PDF_MADRE = require('../../assets/TTPolitics.pdf');
  const goTo = key => {
    setActive(key);
    const page = SECTIONS[key]?.page ?? 1;
    if (loaded) {
      try {
        pdfRef.current?.setPage?.(page);
      } catch (e) {}
    }
  };

  useEffect(() => {
    const next = route?.params?.section;
    if (next && SECTIONS[next]) {
      setActive(next);
      if (loaded) {
        try {
          pdfRef.current?.setPage?.(SECTIONS[next].page);
        } catch (e) {}
      }
    }
  }, [route?.params?.section, loaded]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>

        <Image
          source={require('../../assets/images/logo2.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={{width: 40}} />
      </View>

      <Text style={styles.mainTitle}>Consulta nuestras políticas</Text>

      <View style={styles.tabs}>
        {Object.keys(SECTIONS).map(key => {
          const isActive = key === active;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => goTo(key)}
              style={[styles.tab, isActive && styles.tabActive]}>
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {SECTIONS[key].label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.pdfWrap}>
        <Pdf
          ref={pdfRef}
          source={PDF_MADRE}
          onLoadComplete={() => {
            setLoaded(true);
            const page = SECTIONS[active]?.page ?? 1;
            pdfRef.current?.setPage?.(page);
          }}
          onError={err => console.warn('PDF error:', err)}
          style={styles.pdf}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: PRIMARY,
  },
  logo: {width: 120, height: 40},
  iconButton: {padding: 8},
  mainTitle: {
    fontSize: 20,
    textAlign: 'center',
    marginVertical: 12,
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tab: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2b2b2b',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#111',
  },
  tabActive: {
    borderColor: PRIMARY,
    backgroundColor: '#0b1a52',
  },
  tabText: {
    color: '#cfcfcf',
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Montserrat-Bold',
  },
  tabTextActive: {color: '#fff'},
  pdfWrap: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  pdf: {flex: 1, backgroundColor: '#000'},
});

export default TermsAndConditions;
