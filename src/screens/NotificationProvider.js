import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://api.tab-track.com';
const POLL_SECONDS = 12;
const MAX_STORE = 100;

const VISITS_STORAGE_KEY_BASE = 'user_visits';
const BRANCHES_CACHE_PREFIX = 'branches_cache_';

const NotificationContext = createContext(null);

/* ====================================================================== */
/* Provider                                                               */
/* ====================================================================== */

export function NotificationProvider({children}) {
  const [notifications, setNotifications] = useState([]);

  const emailRef = useRef(null);
  const pollingRef = useRef(null);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(false);

  /* ------------------------------------------------------------------ */
  /* Helpers                                                            */
  /* ------------------------------------------------------------------ */

  const todayIso = () => new Date().toISOString().slice(0, 10);

  const paymentUniqueId = (saleId, payment, idx) => {
    const part =
      payment?.payment_transaction_id ??
      payment?.payment_id ??
      payment?.fecha_creacion ??
      payment?.fecha_pago ??
      `${payment?.amount ?? ''}_${idx}`;

    return `${String(saleId)}_${String(part)}`;
  };

  const formatMoney = n =>
    Number.isFinite(n)
      ? n.toLocaleString('es-MX', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : '0.00';

  const buildText = ({amount, date}) =>
    `Pago confirmado — ${formatMoney(Number(amount || 0))} — ${new Date(
      date,
    ).toLocaleString('es-MX', {
      dateStyle: 'short',
      timeStyle: 'short',
    })}`;

  const safeJsonParse = (raw, fallback = null) => {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  };

  const branchGetName = b =>
    b?.nombre ?? b?.name ?? b?.title ?? b?.nombre_sucursal ?? null;

  const formatBranchDisplay = (name, sucursalId) => {
    const n = typeof name === 'string' ? name.trim() : '';
    const sid = sucursalId != null ? String(sucursalId).trim() : '';
    if (!n) return sid ? `Sucursal ${sid}` : '';
    // If the name already contains the id, keep it as-is; otherwise append the id.
    if (sid && !n.includes(sid)) return `${n} ${sid}`;
    return n;
  };

  const resolveBranchFromBranchesCache = async (restId, sucursalId) => {
    if (restId == null || sucursalId == null) return '';

    try {
      const raw = await AsyncStorage.getItem(
        BRANCHES_CACHE_PREFIX + String(restId),
      );
      const parsed = safeJsonParse(raw, null);

      const arr = Array.isArray(parsed?.data)
        ? parsed.data
        : Array.isArray(parsed)
        ? parsed
        : [];

      if (!Array.isArray(arr) || arr.length === 0) return '';

      const sid = String(sucursalId);

      // Match against common id fields used by your API
      const found = arr.find(b => {
        const candidates = [b?.id, b?.sucursal_id, b?.codigo];
        return candidates.some(c => c != null && String(c) === sid);
      });

      const name = branchGetName(found);
      return formatBranchDisplay(name, sucursalId);
    } catch {
      return '';
    }
  };

  /* ------------------------------------------------------------------ */
  /* Branch resolution (single source of truth)                          */
  /* ------------------------------------------------------------------ */

  const resolveBranchFromVisits = async (saleId, fallback = '') => {
    if (!saleId) return fallback;

    try {
      const userId =
        (await AsyncStorage.getItem('user_usuario_app_id')) ||
        (await AsyncStorage.getItem('user_email'));

      const keys = [
        userId ? `${VISITS_STORAGE_KEY_BASE}_${userId}` : null,
        VISITS_STORAGE_KEY_BASE,
      ].filter(Boolean);

      for (const key of keys) {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) continue;

        const visits = safeJsonParse(raw, []);
        if (!Array.isArray(visits)) continue;

        const visit = visits.find(v => {
          const visitSaleId =
            v.sale_id ?? v.venta_id ?? v.saleId ?? v.ventaId ?? v.id;
          return String(visitSaleId) === String(saleId);
        });
        if (!visit) continue;

        // A) Direct branch fields
        const direct =
          visit.branchName ??
          visit.nombre_sucursal ??
          visit.sucursal_nombre ??
          visit.branch ??
          visit.branch_name ??
          '';

        if (typeof direct === 'string' && direct.trim()) {
          // If we also have sucursal_id, optionally append it (for "Centro nuevo 12" style)
          return formatBranchDisplay(direct, visit.sucursal_id);
        }

        // B) Parse from "Restaurante — Sucursal"
        const restaurantName =
          visit.restaurantName ??
          visit.nombre_restaurante ??
          visit.restaurant ??
          visit.restaurant_name ??
          '';

        if (
          typeof restaurantName === 'string' &&
          restaurantName.includes('—')
        ) {
          const parsed = restaurantName.split('—').pop().trim();
          if (parsed) return formatBranchDisplay(parsed, visit.sucursal_id);
        }

        // C) Look up in branches cache using restaurante_id + sucursal_id
        const restId =
          visit.restaurante_id ??
          visit.restauranteId ??
          visit.restaurante ??
          null;
        const sucId =
          visit.sucursal_id ?? visit.sucursal ?? visit.sucursalId ?? null;

        const cached = await resolveBranchFromBranchesCache(restId, sucId);
        if (cached) return cached;

        // D) Last fallback: at least "Sucursal <id>" if we have it
        if (sucId != null && String(sucId).trim()) {
          return `Sucursal ${String(sucId).trim()}`;
        }
      }
    } catch {
      /* ignore */
    }

    return fallback;
  };

  /* ------------------------------------------------------------------ */
  /* Storage                                                            */
  /* ------------------------------------------------------------------ */

  const seenKey = email => `notifications_seen_${email}`;
  const storeKey = email => `notifications_store_${email}`;

  const loadSeen = async email => {
    try {
      const raw = await AsyncStorage.getItem(seenKey(email));
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  };

  const saveSeen = (email, set) =>
    AsyncStorage.setItem(seenKey(email), JSON.stringify([...set]));

  const loadStored = async email => {
    try {
      const raw = await AsyncStorage.getItem(storeKey(email));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const saveStored = (email, arr) =>
    AsyncStorage.setItem(
      storeKey(email),
      JSON.stringify(arr.slice(0, MAX_STORE)),
    );

  /* ------------------------------------------------------------------ */
  /* Core fetch logic                                                    */
  /* ------------------------------------------------------------------ */

  const fetchTodayOnce = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      if (!emailRef.current) {
        emailRef.current = await AsyncStorage.getItem('user_email');
      }
      const email = emailRef.current;
      if (!email) return;

      const token =
        (await AsyncStorage.getItem('access_token')) ||
        (await AsyncStorage.getItem('auth_token'));

      const day = todayIso();
      const url = `${API_URL}/api/mobileapp/usuarios/consumos?email=${encodeURIComponent(
        email,
      )}&desde=${day}&hasta=${day}`;

      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(token ? {Authorization: `Bearer ${token}`} : {}),
        },
      });

      if (!res.ok) return;

      const json = await res.json();
      const ventas = Array.isArray(json?.ventas) ? json.ventas : [];

      const seen = await loadSeen(email);
      const stored = await loadStored(email);
      const byId = new Map(stored.map(n => [n.id, n]));

      for (const venta of ventas) {
        const saleId = venta?.venta_id ?? venta?.sale_id;
        const pagos = Array.isArray(venta?.pagos) ? venta.pagos : [];

        for (let i = 0; i < pagos.length; i++) {
          const pago = pagos[i];
          const status = String(pago?.status ?? pago?.estado).toLowerCase();
          if (status !== 'paid' && status !== 'confirmed') continue;

          const id = paymentUniqueId(saleId, pago, i);
          if (seen.has(id) || byId.has(id)) continue;

          let branch =
            venta?.nombre_sucursal ??
            venta?.nombre_restaurante ??
            pago?.nombre_sucursal ??
            '';

          if (!branch || !branch.trim()) {
            branch = await resolveBranchFromVisits(saleId, '');
          }

          const notif = {
            id,
            saleId,
            branch,
            amount: pago?.amount ?? 0,
            date:
              pago?.fecha_creacion ??
              pago?.fecha_pago ??
              new Date().toISOString(),
            text: buildText({
              amount: pago?.amount,
              date: pago?.fecha_creacion,
            }),
            read: false,
          };

          byId.set(id, notif);
          seen.add(id);
        }
      }

      const next = [...byId.values()]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, MAX_STORE);

      await saveSeen(email, seen);
      await saveStored(email, next);

      if (mountedRef.current) setNotifications(next);
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  /* ------------------------------------------------------------------ */
  /* Lifecycle                                                          */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      const email = await AsyncStorage.getItem('user_email');
      if (!email) return;

      emailRef.current = email;
      const stored = await loadStored(email);

      const enriched = await Promise.all(
        stored.map(async n => {
          if (n.branch && n.branch.trim()) return n;
          const branch = await resolveBranchFromVisits(n.saleId, '');

          return {...n, branch};
        }),
      );

      if (mountedRef.current) {
        setNotifications(
          enriched.sort((a, b) => new Date(b.date) - new Date(a.date)),
        );
      }

      fetchTodayOnce();
    })();

    const onAppState = state => {
      if (state === 'active') fetchTodayOnce();
    };

    AppState.addEventListener('change', onAppState);
    pollingRef.current = setInterval(fetchTodayOnce, POLL_SECONDS * 1000);

    return () => {
      mountedRef.current = false;
      AppState.removeEventListener('change', onAppState);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchTodayOnce]);

  /* ------------------------------------------------------------------ */
  /* Public API                                                         */
  /* ------------------------------------------------------------------ */
  const notifyPayment = useCallback(
    async ({saleId, amount, date, branch: branchOverride, sucursal_id}) => {
      if (!emailRef.current) return;

      const id = `${saleId}_${Date.now()}`;
      const resolvedDate = date ?? new Date().toISOString();

      let branch =
        typeof branchOverride === 'string' ? branchOverride.trim() : '';

      if (!branch && sucursal_id != null && String(sucursal_id).trim()) {
        branch = `Sucursal ${String(sucursal_id).trim()}`;
      }

      if (!branch) {
        branch = await resolveBranchFromVisits(saleId, '');
      }

      const notif = {
        id,
        saleId,
        branch,
        amount,
        date: resolvedDate,
        text: buildText({amount, date: resolvedDate}),
        read: false,
      };

      setNotifications(prev => {
        const next = [notif, ...prev].slice(0, MAX_STORE);
        saveStored(emailRef.current, next);
        return next;
      });
    },
    [],
  );

  const markAllRead = useCallback(async () => {
    if (!emailRef.current) return;

    const updated = notifications.map(n => ({...n, read: true}));
    setNotifications(updated);

    const seen = new Set(await loadSeen(emailRef.current));
    updated.forEach(n => seen.add(n.id));

    await saveSeen(emailRef.current, seen);
    await saveStored(emailRef.current, updated);
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{notifications, unreadCount, markAllRead, notifyPayment}}>
      {children}
    </NotificationContext.Provider>
  );
}

/* ====================================================================== */
/* Hook                                                                   */
/* ====================================================================== */

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      'useNotifications must be used inside NotificationProvider',
    );
  }
  return ctx;
};
