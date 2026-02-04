import React, {useEffect, useState, useRef, useCallback} from 'react';
import {useNotifications} from './NotificationProvider';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Modal,
  DeviceEventEmitter,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  PixelRatio,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-root-toast';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

function useResponsive() {
  const {width, height} = useWindowDimensions();
  const wp = percent => {
    const p = Number(percent);
    if (!p && p !== 0) return 0;
    return Math.round((p / 100) * width);
  };
  const hp = percent => {
    const p = Number(percent);
    if (!p && p !== 0) return 0;
    return Math.round((p / 100) * height);
  };
  const rf = percent => {
    const p = Number(percent);
    if (!p && p !== 0) return 0;
    return Math.round((p / 100) * width);
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  return {width, height, wp, hp, rf, clamp};
}

const CARD_SLIDE_HEIGHT = 100;
const BLUE = '#0046ff';

const API_BASE_URL = 'https://api.tab-track.com';
const API_AUTH_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc3MDEzNjkxMCwianRpIjoiMzM3YjlkY2YtYjlkMi00NjFjLTkxMDItYzlkZjFkNDFlYmFjIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NzAxMzY5MTAsImV4cCI6MTc3MjcyODkxMCwicm9sIjoiRWRpdG9yIn0.GVPx2mKxkE7qZQ9AozQnldLlkogOOLksbetncQ8BgmY';

function safeJsonParse(raw, fallback = null) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn('safeJsonParse: parse error', e);
    return fallback;
  }
}
function getCacheBustedUrl(url) {
  if (!url) return null;
  try {
    const ts = Date.now();
    return url.includes('?') ? `${url}&_cb=${ts}` : `${url}?_cb=${ts}`;
  } catch (e) {
    return url;
  }
}
function getAuthHeaders(extra = {}) {
  const base = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...extra,
  };
  if (API_AUTH_TOKEN && API_AUTH_TOKEN.trim())
    base.Authorization = `Bearer ${API_AUTH_TOKEN}`;
  return base;
}

export default function VisitsScreen() {
  const {notifications, unreadCount, markAllRead} = useNotifications();
  const navigation = useNavigation();
  const {width, wp, hp, rf, clamp} = useResponsive();
  const insets = useSafeAreaInsets();
  const topSafe = Math.round(
    Math.max(
      insets?.top ?? 0,
      Platform.OS === 'android'
        ? StatusBar.currentHeight || 0
        : insets?.top ?? 0,
    ),
  );
  const bottomSafe = Math.round(insets?.bottom ?? 0);
  const sidePad = Math.round(Math.min(Math.max(wp(4), 12), 36));

  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingSales, setFetchingSales] = useState(false);

  const [username, setUsername] = useState('');
  const [profileUrl, setProfileUrl] = useState(null);

  const [showNotifications, setShowNotifications] = useState(false);

  const pollIntervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const emailRef = useRef(null);
  const MAX_STORE = 100;

  const [desdeDate, setDesdeDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const branchesMemRef = useRef({});
  const restaurantsMemRef = useRef({});

  const MAX_RANGE_DAYS = 31;

  const formatDateYMD = d => {
    if (!d) return '';
    const dt = d instanceof Date ? d : new Date(d);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const loadProfileFromApi = useCallback(async () => {
    try {
      const email = await AsyncStorage.getItem('user_email');
      if (!email) return;
      const endpoint = `${API_BASE_URL.replace(
        /\/$/,
        '',
      )}/api/mobileapp/usuarios?mail=${encodeURIComponent(
        email,
      )}&presign_ttl=30`;
      const headers = getAuthHeaders();
      let res;
      try {
        res = await fetch(endpoint, {method: 'GET', headers});
      } catch (networkErr) {
        console.warn('loadProfileFromApi network error', networkErr);
        return;
      }
      if (!res.ok) {
        console.warn('loadProfileFromApi http not ok', res.status);
        return;
      }
      const json = await res.json();
      const usuario =
        Array.isArray(json?.usuarios) && json.usuarios.length > 0
          ? json.usuarios[0]
          : Array.isArray(json?.data) && json.data.length > 0
          ? json.data[0]
          : null;
      if (!usuario) return;
      if (usuario.foto_perfil_url) {
        setProfileUrl(getCacheBustedUrl(usuario.foto_perfil_url));
      }
      const nombreApi = usuario.nombre ?? usuario.nombre_completo ?? null;
      const apellidoApi = usuario.apellido ?? null;
      if (nombreApi || apellidoApi) {
        let display = '';
        if (nombreApi && apellidoApi)
          display = `${String(nombreApi).trim()} ${String(apellidoApi).trim()}`;
        else display = (nombreApi ?? apellidoApi ?? '').toString().trim();
        if (display) setUsername(display);
      }
    } catch (err) {
      console.warn('loadProfileFromApi error', err);
      return;
    }
  }, []);

  async function ensureBranchesForRestaurant(
    restId,
    forceNetwork = false,
    logFn = () => {},
  ) {
    if (!restId) return [];
    const key = String(restId);
    if (!forceNetwork && branchesMemRef.current[key])
      return branchesMemRef.current[key];

    try {
      const rawCache = await AsyncStorage.getItem(`branches_cache_${key}`);
      if (rawCache && !forceNetwork) {
        const parsed = safeJsonParse(rawCache, null);
        const arr =
          parsed && Array.isArray(parsed.data)
            ? parsed.data
            : Array.isArray(parsed)
            ? parsed
            : [];
        branchesMemRef.current[key] = arr;
        return arr;
      }
    } catch (e) {
      /* ignore */
    }

    try {
      const url = `${API_BASE_URL.replace(
        /\/$/,
        '',
      )}/api/restaurantes/${encodeURIComponent(restId)}/sucursales`;
      const res = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        Toast.show(
          `No pude obtener sucursales (${res.status}) para rest ${restId}`,
          {duration: Toast.durations.LONG},
        );
        return [];
      }
      const json = await res.json();
      let arr = [];
      if (Array.isArray(json)) arr = json;
      else if (Array.isArray(json.sucursales)) arr = json.sucursales;
      else if (Array.isArray(json.data)) arr = json.data;
      else arr = [];
      branchesMemRef.current[key] = arr;
      try {
        await AsyncStorage.setItem(
          `branches_cache_${key}`,
          JSON.stringify({data: arr, ts: Date.now()}),
        );
      } catch (e) {
        /* ignore */
      }
      return arr;
    } catch (err) {
      Toast.show('Error al obtener sucursales (ver consola)', {
        duration: Toast.durations.LONG,
      });
      return [];
    }
  }

  async function ensureRestaurantInfo(restId, forceNetwork = false) {
    if (!restId) return null;
    const key = String(restId);
    if (!forceNetwork && restaurantsMemRef.current[key])
      return restaurantsMemRef.current[key];
    try {
      const url = `${API_BASE_URL.replace(
        /\/$/,
        '',
      )}/api/restaurantes/${encodeURIComponent(restId)}`;
      const res = await fetch(url, {method: 'GET', headers: getAuthHeaders()});
      if (!res.ok) return null;
      const json = await res.json();
      restaurantsMemRef.current[key] = json || null;
      return json || null;
    } catch (err) {
      return null;
    }
  }

  function branchGetLogoUrl(b) {
    return (
      b?.imagen_logo_url ??
      b?.imagen_logo ??
      b?.logo_url ??
      b?.logo ??
      b?.imagenLogoUrl ??
      null
    );
  }
  function branchGetBannerUrl(b) {
    return (
      b?.imagen_banner_url ??
      b?.imagen_banner ??
      b?.banner_url ??
      b?.banner ??
      null
    );
  }
  function branchGetName(b) {
    return b?.nombre ?? b?.name ?? b?.title ?? b?.nombre_sucursal ?? null;
  }

  function computeSaleTotal(saleEntry) {
    if (!saleEntry) return 0;
    const candidates = [
      saleEntry.monto_total_venta,
      saleEntry.monto_total,
      saleEntry.total,
      saleEntry.monto,
      saleEntry.montoTotal,
      saleEntry.monto_venta,
    ];
    for (const c of candidates) {
      if (c !== undefined && c !== null && c !== '') {
        const n = Number(c);
        if (!Number.isNaN(n)) return n;
      }
    }
    const items = Array.isArray(saleEntry.items_consumidos)
      ? saleEntry.items_consumidos
      : Array.isArray(saleEntry.items)
      ? saleEntry.items
      : [];
    if (Array.isArray(items) && items.length > 0) {
      let sum = 0;
      for (const it of items) {
        const qty = Number(it.cantidad ?? it.quantity ?? 1) || 0;
        const price =
          Number(it.precio_unitario ?? it.price ?? it.unit_price ?? 0) || 0;
        sum += qty * price;
      }
      if (sum > 0) return sum;
    }
    return 0;
  }

  const fetchVisitsForDesde = useCallback(async desdeDateParam => {
    setFetchingSales(true);
    setVisits([]);
    try {
      const email = await AsyncStorage.getItem('user_email');
      if (!email) {
        Toast.show('No se encontró email del usuario', {
          duration: Toast.durations.SHORT,
        });
        setFetchingSales(false);
        return;
      }
      const desdeCandidate =
        desdeDateParam instanceof Date
          ? desdeDateParam
          : new Date(desdeDateParam);
      const hoy = new Date();
      const startOfHoy = new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        hoy.getDate(),
      );
      const diffMs =
        startOfHoy.getTime() -
        new Date(
          desdeCandidate.getFullYear(),
          desdeCandidate.getMonth(),
          desdeCandidate.getDate(),
        ).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays > MAX_RANGE_DAYS) {
        const cappedDate = new Date(
          startOfHoy.getTime() - MAX_RANGE_DAYS * 24 * 60 * 60 * 1000,
        );
        setDesdeDate(cappedDate);
        Toast.show(
          `Rango muy grande. Se limita a ${MAX_RANGE_DAYS} días (desde ${formatDateYMD(
            cappedDate,
          )})`,
          {duration: Toast.durations.LONG},
        );
        desdeCandidate.setTime(cappedDate.getTime());
      }

      const desdeStr = formatDateYMD(desdeCandidate);
      const hastaStr = formatDateYMD(new Date());

      const urlVentas = `${API_BASE_URL.replace(
        /\/$/,
        '',
      )}/api/mobileapp/usuarios/consumos?email=${encodeURIComponent(
        email,
      )}&desde=${encodeURIComponent(desdeStr)}&hasta=${encodeURIComponent(
        hastaStr,
      )}&light=1`;
      let resVentas;
      try {
        resVentas = await fetch(urlVentas, {
          method: 'GET',
          headers: getAuthHeaders(),
        });
      } catch (err) {
        console.warn('fetch ventas network err', err);
        Toast.show('Error de red al obtener ventas', {
          duration: Toast.durations.LONG,
        });
        setFetchingSales(false);
        return;
      }
      if (!resVentas.ok) {
        const txt = await resVentas.text().catch(() => '');
        console.warn('ventas http error', resVentas.status, txt);
        Toast.show(`Error al consultar ventas (${resVentas.status})`, {
          duration: Toast.durations.LONG,
        });
        setFetchingSales(false);
        return;
      }
      const jsonVentas = await resVentas.json().catch(() => ({}));
      const ventaArray = Array.isArray(jsonVentas?.venta_id)
        ? jsonVentas.venta_id
        : [];
      if (!ventaArray.length) {
        Toast.show('No se encontraron ventas en ese rango', {
          duration: Toast.durations.SHORT,
        });
        setVisits([]);
        setFetchingSales(false);
        return;
      }

      const visitsMap = new Map();

      for (const v of ventaArray) {
        try {
          const ventaId = v?.venta_id ?? v?.sale_id ?? null;
          const sucursalId = v?.sucursal_id ?? v?.sucursal ?? null;
          if (!ventaId || !sucursalId) continue;
          const urlDetalle = `${API_BASE_URL.replace(
            /\/$/,
            '',
          )}/api/mobileapp/usuarios/consumos?venta_id=${encodeURIComponent(
            ventaId,
          )}&sucursal_id=${encodeURIComponent(
            sucursalId,
          )}&desde=${encodeURIComponent(desdeStr)}&hasta=${encodeURIComponent(
            hastaStr,
          )}`;
          const resDetalle = await fetch(urlDetalle, {
            method: 'GET',
            headers: getAuthHeaders(),
          });
          if (!resDetalle.ok) {
            console.warn('detalle http not ok', resDetalle.status);
            continue;
          }
          const jsonDet = await resDetalle.json().catch(() => null);
          if (!jsonDet) continue;

          const rootVentaId = jsonDet?.venta_id ?? ventaId;
          const rootSucursalId = jsonDet?.sucursal_id ?? sucursalId;
          const emailsObj = jsonDet?.emails ?? null;

          const upsertVisit = async saleEntry => {
            const computedTotal = computeSaleTotal(saleEntry);
            const fechaCierreRaw =
              saleEntry?.fecha_cierre_venta ?? new Date().toISOString();
            const fechaCierre = fechaCierreRaw;
            const key = `${rootVentaId}_${rootSucursalId}`;
            const candidate = {
              id: `${rootVentaId}_${rootSucursalId}`,
              sale_id:
                rootVentaId ??
                saleEntry?.venta_id ??
                saleEntry?.sale_id ??
                null,
              restaurante_id:
                saleEntry?.restaurante_id ?? saleEntry?.restaurante ?? null,
              sucursal_id:
                saleEntry?.sucursal_id ??
                rootSucursalId ??
                saleEntry?.sucursal ??
                null,
              restaurantName: saleEntry?.nombre_restaurante ?? null,
              branchName: saleEntry?.nombre_sucursal ?? null,
              restaurantImage: null,
              bannerImage: null,
              fecha: fechaCierre,
              total: computedTotal,
              moneda: 'MXN',
              items: Array.isArray(saleEntry?.items_consumidos)
                ? saleEntry.items_consumidos
                : Array.isArray(saleEntry?.items)
                ? saleEntry.items
                : [],
              pagos: Array.isArray(saleEntry?.pagos)
                ? saleEntry.pagos
                : Array.isArray(jsonDet?.pagos)
                ? jsonDet.pagos
                : [],
            };

            try {
              if (candidate.restaurante_id) {
                const restInfo = await ensureRestaurantInfo(
                  candidate.restaurante_id,
                  false,
                );
                const branches = await ensureBranchesForRestaurant(
                  candidate.restaurante_id,
                  false,
                );
                let matchedBranch = null;
                if (Array.isArray(branches) && branches.length > 0) {
                  for (const b of branches) {
                    const candidates = [b.id, b.sucursal_id, b.codigo];
                    for (const cand of candidates) {
                      if (cand === undefined || cand === null) continue;
                      if (String(cand) === String(candidate.sucursal_id)) {
                        matchedBranch = b;
                        break;
                      }
                    }
                    if (matchedBranch) break;
                  }
                  if (!matchedBranch && branches.length === 1)
                    matchedBranch = branches[0];
                }
                if (matchedBranch) {
                  candidate.restaurantImage = branchGetLogoUrl(matchedBranch)
                    ? getCacheBustedUrl(branchGetLogoUrl(matchedBranch))
                    : candidate.restaurantImage;
                  candidate.bannerImage = branchGetBannerUrl(matchedBranch)
                    ? getCacheBustedUrl(branchGetBannerUrl(matchedBranch))
                    : candidate.bannerImage;
                  if (!candidate.branchName)
                    candidate.branchName = branchGetName(matchedBranch);
                }
                if (!candidate.restaurantImage && restInfo) {
                  const candLogo =
                    restInfo?.imagen_logo_url ??
                    restInfo?.logo ??
                    restInfo?.imagen_logo;
                  if (candLogo)
                    candidate.restaurantImage = getCacheBustedUrl(candLogo);
                }
              }
            } catch (e) {
              /* ignore enrichment errors */
            }

            if (visitsMap.has(key)) {
              const existing = visitsMap.get(key);
              const existingTs = new Date(existing.fecha).getTime() || 0;
              const candTs = new Date(candidate.fecha).getTime() || 0;
              const chosen = candTs >= existingTs ? candidate : existing;
              chosen.total = Math.max(
                Number(existing.total || 0),
                Number(candidate.total || 0),
              );
              if (
                (!existing.items || existing.items.length === 0) &&
                candidate.items &&
                candidate.items.length > 0
              ) {
                chosen.items = candidate.items;
              } else if (
                existing.items &&
                candidate.items &&
                candidate.items.length > 0 &&
                existing.items.length !== candidate.items.length
              ) {
                chosen.items =
                  candidate.items.length > existing.items.length
                    ? candidate.items
                    : existing.items;
              } else {
                chosen.items = existing.items || candidate.items;
              }
              visitsMap.set(key, chosen);
            } else {
              visitsMap.set(key, candidate);
            }
          };

          if (emailsObj && typeof emailsObj === 'object') {
            for (const emailKey of Object.keys(emailsObj)) {
              const arrSales = Array.isArray(emailsObj[emailKey])
                ? emailsObj[emailKey]
                : [];
              for (const saleEntry of arrSales) {
                await upsertVisit(saleEntry);
              }
            }
          } else {
            const arrSalesRoot = Array.isArray(jsonDet?.data)
              ? jsonDet.data
              : Array.isArray(jsonDet?.ventas)
              ? jsonDet.ventas
              : null;
            if (Array.isArray(arrSalesRoot)) {
              for (const saleEntry of arrSalesRoot) {
                await upsertVisit(saleEntry);
              }
            }
          }
        } catch (err) {
          console.warn('error processing venta entry', err);
          continue;
        }
      }

      const detailedVisits = Array.from(visitsMap.values());
      detailedVisits.sort((a, b) => {
        const ta = new Date(a.fecha).getTime() || 0;
        const tb = new Date(b.fecha).getTime() || 0;
        return tb - ta;
      });

      setVisits(detailedVisits);
      if (!detailedVisits.length)
        Toast.show('No se encontraron detalles para las ventas', {
          duration: Toast.durations.SHORT,
        });
    } catch (err) {
      console.warn('fetchVisitsForDesde error', err);
      Toast.show('Error al obtener visitas (ver consola)', {
        duration: Toast.durations.LONG,
      });
    } finally {
      setFetchingSales(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadProfileFromApi();
      fetchVisitsForDesde(desdeDate);
      setLoading(false);
    })();

    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const onPressDesde = () => setShowDatePicker(true);
  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (event?.type === 'dismissed') {
      return;
    }
    const d = selectedDate || desdeDate;
    setDesdeDate(d);
    fetchVisitsForDesde(d);
  };

  function formatMoney(n) {
    return Number.isFinite(n)
      ? n.toLocaleString('es-MX', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : '0.00';
  }
  useEffect(() => {
    const listener = DeviceEventEmitter.addListener(
      'profileUpdated',
      async () => {
        try {
          await loadProfileFromApi();
        } catch (e) {
          console.warn('profileUpdated listener error', e);
        }
      },
    );

    return () => {
      try {
        listener.remove();
      } catch (e) {
        /* ignore */
      }
    };
  }, [loadProfileFromApi]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await refreshUserFromApi();
        await loadVisitsAndEnrich(pushLog);
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const runStorageHealthCheck = async () => {
    try {
      const uid = currentUserId || (await resolveCurrentUserId());
      const perKey = visitsKeyForUser(uid);
      const rawPer = await AsyncStorage.getItem(perKey);
      const rawGlob = await AsyncStorage.getItem(VISITS_STORAGE_KEY_BASE);
      const rawPendPer = await AsyncStorage.getItem(pendingKeyForUser(uid));
      const rawPendG = await AsyncStorage.getItem(PENDING_VISITS_KEY_BASE);
      const perArr = safeJsonParse(rawPer, []);
      const globArr = safeJsonParse(rawGlob, []);
      const pendPerArr = safeJsonParse(rawPendPer, []);
      const pendGArr = safeJsonParse(rawPendG, []);
      const msg = `per:${Array.isArray(perArr) ? perArr.length : 0} global:${
        Array.isArray(globArr) ? globArr.length : 0
      } pendPer:${Array.isArray(pendPerArr) ? pendPerArr.length : 0} pendG:${
        Array.isArray(pendGArr) ? pendGArr.length : 0
      }`;
      pushLog('storageHealth', {userId: uid, perKey, msg});
      Toast.show(msg, {duration: Toast.durations.LONG});
      if (Array.isArray(perArr) && perArr.length > 0) {
        const first = perArr[0];
        pushLog('storageHealth sample per-first', {
          id: first.id,
          sale_id: first.sale_id,
          total: first.total,
        });
      } else if (Array.isArray(globArr) && globArr.length > 0) {
        const first = globArr[0];
        pushLog('storageHealth sample glob-first', {
          id: first.id,
          sale_id: first.sale_id,
          total: first.total,
        });
      } else {
        pushLog('storageHealth: no visits present in either key');
      }
    } catch (e) {
      pushLog('runStorageHealthCheck error', e);
      Toast.show('Health check error (ver consola)', {
        duration: Toast.durations.SHORT,
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color={BLUE} />
      </SafeAreaView>
    );
  }
  /* RESPONSIVE computed values used in JSX */
  const headerGradientHeight = clamp(hp(14), 110, 220);
  const avatarWrapperSize = clamp(wp(18), 48, 92);
  const avatarInner = Math.round(avatarWrapperSize * 0.9);
  const contentPaddingHorizontal = Math.max(12, wp(4));
  const modalW = Math.min(Math.max(wp(92), 300), 920);
  const cardLeftWidth = clamp(wp(28), 84, 140);
  const logoSize = clamp(Math.round(cardLeftWidth * 0.66), 48, 84);
  const slideWidth = Math.max(
    Math.round(width - cardLeftWidth - Math.max(24, wp(6))),
    Math.round(wp(40)),
  );
  const cardRadius = 12;

  const getInitials = name => {
    if (!name) return 'U';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  return (
    <SafeAreaView style={[styles.container, {paddingTop: topSafe}]}>
      <View style={styles.headerStack}>
        <StatusBar
          barStyle="dark-content"
          translucent
          backgroundColor="transparent"
        />
        <View
          style={[
            styles.topBar,
            {paddingHorizontal: contentPaddingHorizontal, paddingTop: 6},
          ]}>
          {/* Left spacer (balances right icons) */}
          <View style={styles.topBarSide} />

          {/* Centered title */}
          <Text
            style={[
              styles.title,
              styles.topBarTitleCentered,
              {fontSize: clamp(rf(25), 18, 26)},
            ]}>
            Experiencias
          </Text>

          {/* Right icons */}
          <View style={[styles.iconsRight, styles.topBarSide]}>
            <TouchableOpacity
              onPress={() => setShowNotifications(true)}
              style={styles.headerButton}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Ionicons
                name="notifications-outline"
                size={clamp(rf(5), 30, 46)}
                color="#0051c9"
              />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Modal visible={showNotifications} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, {width: modalW}]}>
              <View style={styles.modalHeader}>
                <Text
                  style={[
                    styles.modalHeaderText,
                    {fontSize: clamp(rf(3.6), 16, 20)},
                  ]}>
                  Notificaciones
                </Text>
                <TouchableOpacity
                  onPress={() => setShowNotifications(false)}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                  <Ionicons
                    name="close"
                    size={clamp(rf(3), 16, 22)}
                    color="#333"
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.modalListHeader}>
                <Text style={styles.modalListHeaderText}>
                  Últimas notificaciones
                </Text>
              </View>

              <ScrollView
                style={[styles.modalList, {maxHeight: Math.round(hp(40))}]}>
                {notifications && notifications.length > 0 ? (
                  notifications.map(n => (
                    <NotificationRow key={n.id} n={n} visits={visits} />
                  ))
                ) : (
                  <View style={styles.noNotifications}>
                    <Text style={styles.noNotificationsText}>
                      No hay notificaciones nuevas.
                    </Text>
                  </View>
                )}
              </ScrollView>
              <TouchableOpacity
                style={[
                  styles.markReadButton,
                  {margin: Math.round(Math.min(Math.max(wp(4), 10), 28))},
                ]}
                onPress={markAllRead}>
                <Text
                  style={[
                    styles.markReadText,
                    {fontSize: clamp(rf(3.6), 13, 16)},
                  ]}>
                  Marcar todo como leído
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <LinearGradient
          colors={['#8E2DE2', '#4A00E0']}
          style={[
            styles.headerGradient,
            {
              height: headerGradientHeight,
              borderBottomLeftRadius: Math.round(cardRadius / 1.5),
              borderBottomRightRadius: Math.round(cardRadius * 5),
            },
          ]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}>
          <View
            style={[
              styles.greetingContainer,
              {
                marginLeft: Math.max(84, cardLeftWidth) + 8,
                paddingTop: Math.max(8, hp(1.5)),
              },
            ]}>
            <Text style={[styles.greeting, {fontSize: clamp(rf(3.2), 14, 18)}]}>
              Hola :)
            </Text>
            <Text
              style={[
                styles.username,
                {fontSize: clamp(rf(4), 18, 28), marginTop: 4},
              ]}
              numberOfLines={1}
              ellipsizeMode="tail">
              {username}
            </Text>
          </View>
        </LinearGradient>
        <View
          style={[
            styles.avatarWrapper,
            {
              width: avatarWrapperSize,
              height: avatarWrapperSize,
              borderRadius: avatarWrapperSize / 2,
              left: Math.max(12, sidePad * 0.7),
              top:
                headerGradientHeight -
                avatarWrapperSize -
                Math.round(avatarWrapperSize * 0.2),

              elevation: 6,
            },
          ]}>
          {profileUrl ? (
            <Image
              source={{uri: profileUrl}}
              style={[
                styles.avatar,
                {
                  width: avatarInner,
                  height: avatarInner,
                  borderRadius: Math.round(avatarInner / 2),
                },
              ]}
            />
          ) : (
            <View
              style={[
                styles.initialsContainer,
                {
                  width: avatarInner,
                  height: avatarInner,
                  borderRadius: Math.round(avatarInner / 2),
                },
              ]}>
              <Text
                style={{
                  fontSize: Math.round(avatarInner * 0.36),
                  fontWeight: '700',
                  color: BLUE,
                }}>
                {getInitials(username)}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: contentPaddingHorizontal,
          marginTop: 12,
        }}>
        <Text style={[styles.sectionTitle, {fontSize: clamp(rf(3.2), 14, 18)}]}>
          Visitas recientes
        </Text>

        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text style={{marginRight: 8, color: '#666'}}>Desde:</Text>
          <TouchableOpacity
            onPress={onPressDesde}
            style={{
              backgroundColor: '#fff',
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#eee',
            }}>
            <Text style={{color: '#000'}}>{formatDateYMD(desdeDate)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showDatePicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide">
          <View style={styles.dateOverlay}>
            <View style={styles.dateSheet}>
              <DateTimePicker
                value={desdeDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                style={styles.datePicker}
                onChange={(e, d) => d && setDesdeDate(d)}
              />

              <View style={styles.dateActions}>
                <TouchableOpacity
                  onPress={() => {
                    setShowDatePicker(false);
                  }}
                  style={styles.dateBtnPrimary}>
                  <Text style={styles.dateBtnPrimaryText}>OK</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  style={styles.dateBtnSecondary}>
                  <Text style={styles.dateBtnSecondaryText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      <View
        style={[
          styles.content,
          {
            paddingHorizontal: contentPaddingHorizontal,
            marginTop: Math.max(12, hp(2)),
          },
        ]}>
        {visits.length === 0 ? (
          <View style={{padding: 20}}>
            <Text style={{color: '#666'}}>
              {fetchingSales
                ? 'Buscando visitas...'
                : 'No hay visitas para las fechas seleccionadas.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={visits}
            keyExtractor={item =>
              String(
                item.id ?? `${item.sale_id ?? ''}_${item.sucursal_id ?? ''}`,
              )
            }
            renderItem={({item}) => (
              <VisitCard
                item={item}
                navigation={navigation}
                slideWidth={slideWidth}
                cardLeftWidth={cardLeftWidth}
                logoSize={logoSize}
                cardRadius={cardRadius}
              />
            )}
            contentContainerStyle={{paddingBottom: 24 + bottomSafe}}
            initialNumToRender={6}
            maxToRenderPerBatch={12}
            windowSize={11}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function NotificationRow({n, visits}) {
  const dateLabel = n.date
    ? new Date(n.date).toLocaleString('es-MX', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : '';

  const saleId = n.saleId ?? n.sale_id ?? n.venta_id ?? null;

  const resolvedBranch = (() => {
    if (typeof n.branch === 'string' && n.branch.trim()) return n.branch.trim();

    const visit = visits?.find(v => String(v.sale_id) === String(saleId));
    if (visit?.branchName) return String(visit.branchName).trim();

    if (
      typeof visit?.restaurantName === 'string' &&
      visit.restaurantName.includes('—')
    ) {
      return visit.restaurantName.split('—').pop().trim();
    }

    return saleId ? `Venta ${saleId}` : 'Venta';
  })();

  return (
    <View
      style={[
        styles.notificationItemLarge,
        n.read ? styles.readCard : styles.unreadCard,
      ]}>
      <View style={styles.notLeft}>
        <Text style={styles.notBranch} numberOfLines={1}>
          {n.branch || `Venta ${n.saleId ?? ''}`}
        </Text>
        <Text style={styles.notDate}>{dateLabel}</Text>
      </View>

      <View style={styles.notRight}>
        <Text style={styles.notAmount}>
          {Number(n.amount || 0).toLocaleString('es-MX', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
        <Text style={styles.notCurrency}>MXN</Text>
      </View>
    </View>
  );
}

/* ---------------- helpers (sin cambios) ---------------- */
function pickFecha(rawObj) {
  if (!rawObj) return null;
  return (
    rawObj.fecha_cierre_venta ??
    rawObj.fecha_cierre ??
    rawObj.fecha_venta ??
    rawObj.fecha ??
    rawObj.created_at ??
    rawObj.createdAt ??
    null
  );
}

function normalizeDateString(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // If API sends "YYYY-MM-DD HH:mm:ss", convert to ISO-like "YYYY-MM-DDTHH:mm:ss"
  const isoLike = s.includes(' ') && !s.includes('T') ? s.replace(' ', 'T') : s;

  // If your backend sends no timezone and you want to treat it as UTC, uncomment:
  // const hasTZ = isoLike.endsWith("Z") || /[+-]\d\d:\d\d$/.test(isoLike);
  // return hasTZ ? isoLike : `${isoLike}Z`;

  return isoLike; // keeps device-local interpretation if no timezone is provided
}

function branchGetLogoUrl(b) {
  return (
    b?.imagen_logo_url ??
    b?.imagen_logo ??
    b?.logo_url ??
    b?.logo ??
    b?.imagenLogoUrl ??
    null
  );
}
function branchGetBannerUrl(b) {
  return (
    b?.imagen_banner_url ??
    b?.imagen_banner ??
    b?.banner_url ??
    b?.banner ??
    null
  );
}
function branchGetName(b) {
  return b?.nombre ?? b?.name ?? b?.title ?? b?.nombre_sucursal ?? null;
}

function numericEquals(a, b) {
  if (a === undefined || b === undefined || a === null || b === null)
    return false;
  try {
    if (String(a) === String(b)) return true;
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && na === nb) return true;
    return false;
  } catch (e) {
    return false;
  }
}

function VisitCard({
  item,
  navigation,
  slideWidth = 260,
  cardLeftWidth = 100,
  logoSize = 64,
  cardRadius = 12,
}) {
  const scrollRef = useRef(null);
  const [idx, setIdx] = useState(0);
  let lastVisitText = '—';
  try {
    if (item.fecha) {
      const dt = new Date(item.fecha);
      if (!Number.isNaN(dt.getTime())) {
        lastVisitText = dt.toLocaleString('es-MX', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
      }
    }
  } catch (e) {
    lastVisitText = '—';
  }

  const displayName =
    item.restaurantName ??
    item.restaurant ??
    item.name ??
    item.nombre ??
    'Restaurante';
  const branchName = item.branchName ?? item.sucursal_nombre ?? null;
  const logoUri = item.restaurantImage
    ? String(item.restaurantImage).trim()
    : null;
  const bannerUri = item.bannerImage ? String(item.bannerImage).trim() : null;

  return (
    <View style={[styles.card, {borderRadius: cardRadius}]}>
      <View
        style={[
          styles.cardLeft,
          {
            width: cardLeftWidth,
            paddingVertical: Math.max(10, Math.round(cardLeftWidth * 0.12)),
          },
        ]}>
        <View
          style={[
            styles.logoWrapper,
            {
              width: logoSize,
              height: logoSize,
              borderRadius: Math.round(logoSize / 2),
            },
          ]}>
          {logoUri ? (
            <Image
              source={{uri: logoUri}}
              style={[styles.logoImage, {width: logoSize, height: logoSize}]}
            />
          ) : (
            <Image
              source={require('../../assets/images/restaurante.jpeg')}
              style={[styles.logoImage, {width: logoSize, height: logoSize}]}
            />
          )}
        </View>
        <View style={styles.ratingRow}>
          {Array.from({length: 5}, (_, i) => (
            <Text
              key={i}
              style={[
                styles.star,
                i < 4 ? styles.starFilled : styles.starEmpty,
              ]}>
              ★
            </Text>
          ))}
        </View>
      </View>

      <View
        style={[
          styles.cardRight,
          {paddingHorizontal: Math.max(8, Math.round(cardLeftWidth * 0.12))},
        ]}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={[
            styles.slider,
            {height: CARD_SLIDE_HEIGHT, width: slideWidth},
          ]}
          onScroll={e =>
            setIdx(
              Math.round(e.nativeEvent.contentOffset.x / (slideWidth || 1)),
            )
          }
          scrollEventThrottle={16}
          ref={scrollRef}>
          {bannerUri ? (
            <Image
              key={'banner'}
              source={{uri: bannerUri}}
              style={[
                styles.slideImage,
                {width: slideWidth, height: CARD_SLIDE_HEIGHT},
              ]}
            />
          ) : (
            <Image
              key={'fallback'}
              source={
                logoUri
                  ? {uri: logoUri}
                  : require('../../assets/images/restaurante.jpeg')
              }
              style={[
                styles.slideImage,
                {width: slideWidth, height: CARD_SLIDE_HEIGHT},
              ]}
            />
          )}
        </ScrollView>

        <View style={styles.infoContainer}>
          <Text
            style={{
              fontSize: Math.max(14, Math.round(slideWidth * 0.045)),
              fontWeight: '700',
              marginBottom: 4,
              color: '#000',
            }}
            numberOfLines={1}
            ellipsizeMode="tail">
            {displayName}
          </Text>
          {branchName ? (
            <Text
              style={{
                fontSize: Math.max(12, Math.round(slideWidth * 0.032)),
                color: '#666',
                marginBottom: 6,
              }}
              numberOfLines={1}
              ellipsizeMode="tail">
              {branchName}
            </Text>
          ) : null}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Última visita</Text>
            <Text style={styles.infoValue1}>{lastVisitText}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Monto pagado</Text>
            <Text style={styles.infoValue}>
              {Number(item.total || 0).toFixed(2)} {item.moneda ?? 'MXN'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Calificación</Text>
            <Text style={styles.infoValue}>—</Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.btn}
            onPress={() =>
              navigation.navigate('ExperiencesDetails', {visit: item})
            }
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Text style={styles.btnText}>Detalle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => navigation.navigate('Opinion', {visit: item})}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Text style={styles.btnText}>Calificar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingVertical: 12,
    zIndex: 1,
  },
  topBarTitleCentered: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  topBarSide: {minWidth: 48, alignItems: 'flex-end'},

  headerButton: {padding: 8},
  title: {fontWeight: '600', color: '#0046ff'},
  iconsRight: {flexDirection: 'row', alignItems: 'center'},

  badge: {
    position: 'absolute',
    backgroundColor: '#ff3b30',
    borderRadius: 9,
    paddingHorizontal: 5,
    top: 1,
    right: 5,
  },
  badgeText: {color: '#fff', fontSize: 15},

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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  modalHeaderText: {fontSize: 18, color: '#000000'},
  modalListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  modalListHeaderText: {fontSize: 14, fontWeight: '700', color: '#333'},
  modalList: {paddingHorizontal: 16},

  noNotifications: {
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noNotificationsText: {color: '#666'},

  headerGradient: {
    alignSelf: 'center',
    width: '100%',
    paddingTop: 6,
    paddingBottom: 14,
  },
  headerStack: {position: 'relative'},

  avatarWrapper: {
    position: 'absolute',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  initialsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },

  greeting: {color: '#fff'},
  username: {color: '#fff'},

  content: {flex: 1, marginTop: 16},
  sectionTitle: {color: '#0046ff', marginBottom: 12},

  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginBottom: 16,
    overflow: 'hidden',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cardLeft: {
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  logoWrapper: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  logoImage: {resizeMode: 'cover', borderRadius: 999},

  ratingRow: {flexDirection: 'row', marginTop: 4},
  star: {fontSize: 14, marginHorizontal: 1},
  starFilled: {color: '#FFD700'},
  starEmpty: {color: '#CCC'},

  cardRight: {flex: 1, backgroundColor: '#fff'},
  slideImage: {marginHorizontal: 4, borderRadius: 8, resizeMode: 'cover'},

  infoContainer: {padding: 8},
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {fontSize: 12, color: '#555'},
  infoValue1: {fontSize: 10, color: '#000', fontWeight: '700'},
  infoValue: {fontSize: 13, color: '#000', fontWeight: '700'},
  divider: {height: 1, backgroundColor: '#ddd', marginVertical: 6},

  buttonRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginHorizontal: 8,
    marginBottom: 12,
  },
  btn: {
    flex: 1,
    backgroundColor: '#0046ff',
    paddingVertical: 10,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  btnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  notificationItemLarge: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#eef3ff',
    backgroundColor: '#fff',
  },
  unreadCard: {backgroundColor: '#f2f8ff', borderColor: '#d7e8ff'},
  readCard: {backgroundColor: '#ffffff', borderColor: '#f0f0f0'},

  notLeft: {flex: 1, paddingRight: 8},
  notRight: {alignItems: 'flex-end', justifyContent: 'center'},
  notBranch: {fontWeight: '800', fontSize: 14, color: '#111', marginBottom: 2},
  notDate: {color: '#888', fontSize: 11},
  notAmount: {fontWeight: '900', fontSize: 16, color: '#0b58ff'},
  notCurrency: {color: '#666', fontSize: 11},

  markReadButton: {
    padding: 12,
    backgroundColor: '#0046ff',
    alignItems: 'center',
    margin: 16,
    borderRadius: 8,
  },
  markReadText: {color: '#fff', fontWeight: '600'},

  dateOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dateSheet: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    width: '90%',
    maxWidth: 360,
    alignItems: 'center',
  },
  datePicker: {width: '100%'},
  dateActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    width: '100%',
  },
  dateBtnSecondary: {paddingVertical: 10, paddingHorizontal: 16},
  dateBtnSecondaryText: {color: '#666', fontWeight: '600'},
  dateBtnPrimary: {paddingVertical: 10, paddingHorizontal: 16},
  dateBtnPrimaryText: {color: '#0046ff', fontWeight: '700'},
});
