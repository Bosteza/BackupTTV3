//Seems fine 7 April
import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  StatusBar, //
  View,
  Text,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  PixelRatio,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useRoute, useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = 'https://api.residence.tab-track.com';
const BASE2 = 'https://api.tab-track.com';
const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc3NTUxMjcwNSwianRpIjoiNzA1NjU2YjgtZGFiZS00M2NlLTk2MjUtZmE5ODdmY2FiY2ZiIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NzU1MTI3MDUsImV4cCI6MTc3ODEwNDcwNSwicm9sIjoiRWRpdG9yIn0.03LJs1TRZzehSXSh5Cdez2e5NFSrANijsS4H6gUjm78';

const AVATAR_GRADIENTS = [
  ['#8E5CFF', '#5B8BFF'],
  ['#8E5CFF', '#E65BFF'],
  ['#6C5CE7', '#00C2FF'],
  ['#FF7AC6', '#6C5CE7'],
];

function getInitials(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function MiembrosResidence() {
  const {width, height} = useWindowDimensions();
  const hp = p => (p * height) / 100;
  const headerHeight = Math.round(hp(20.5));
  const rf = p => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const route = useRoute();
  const navigation = useNavigation();
  const {qr: qrFromParams} = (route && route.params) || {};

  const [residents, setResidents] = useState([]);
  const [departmentLabel, setDepartmentLabel] = useState('Departamento');
  const [residentCount, setResidentCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const performLogout = async () => {
    try {
      const uid = await AsyncStorage.getItem('user_usuario_app_id');
      const email = await AsyncStorage.getItem('user_email');
      const currentId = uid || email || null;

      try {
        if (email) {
          const profileCached = await AsyncStorage.getItem('user_profile_url');
          const raw = await AsyncStorage.getItem('recent_accounts_v1');
          let arr = raw ? JSON.parse(raw) : [];
          arr = Array.isArray(arr)
            ? arr.filter(
                a =>
                  String(a.email).toLowerCase() !== String(email).toLowerCase(),
              )
            : [];
          arr.unshift({
            email,
            avatarUrl: profileCached || null,
            savedAt: Date.now(),
          });
          if (!Array.isArray(arr)) arr = [];
          if (arr.length > 6) arr = arr.slice(0, 6);
          try {
            await AsyncStorage.setItem(
              'recent_accounts_v1',
              JSON.stringify(arr),
            );
          } catch (e) {
            console.warn('save recent_accounts failed', e);
          }
        }
      } catch (e) {
        console.warn('Guardar recent_account failed (pre-clean)', e);
      }

      const preserveKeys = new Set();

      const visitsBase = 'user_visits';
      const pendBase = 'pending_visits';
      if (currentId) {
        preserveKeys.add(`${visitsBase}_${currentId}`);
        preserveKeys.add(`${pendBase}_${currentId}`);
        preserveKeys.add(`favorites_${currentId}`);
        preserveKeys.add(`favorites_objs_${currentId}`);
      }
      preserveKeys.add(visitsBase);
      preserveKeys.add(pendBase);
      preserveKeys.add('recent_accounts_v1');

      const branchesPrefix = 'branches_cache_';

      const allKeys = await AsyncStorage.getAllKeys();

      const sessionPrefixes = ['session_', 'sess_', 'tmp_'];
      const tokenNames = [
        'auth_token',
        'access_token',
        'refresh_token',
        'token',
        'user_valid',
        'user_admin_id_actual',
        'user_edificio_id_actual',
        'user_residence_departamento_id_actual',
        'user_residence_rol_actual',
        'user_residence_activo',
        'user_email',
        'user_fullname',
        'user_profile_url',
      ];

      const keysToRemove = allKeys.filter(k => {
        if (preserveKeys.has(k)) return false;
        if (k.startsWith(branchesPrefix)) return false;
        if (tokenNames.includes(k)) return true;
        for (const p of sessionPrefixes) {
          if (k.startsWith(p)) return true;
        }
        return false;
      });

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }

      try {
        await AsyncStorage.multiRemove([
          'user_usuario_app_id',
          'user_email',
          'user_valid',
          'user_fullname',
          'user_profile_url',
          'user_admin_id_actual',
          'user_edificio_id_actual',
          'user_residence_departamento_id_actual',
          'user_residence_rol_actual',
          'user_residence_activo',
        ]);
      } catch (e) {
        console.warn('Error removing persistent auth keys on logout', e);
      }

      try {
        navigation.reset({
          index: 0,
          routes: [{name: 'Recent'}],
        });
      } catch (e) {
        console.warn(
          'navigate RecentAccounts failed, falling back to Login',
          e,
        );
        try {
          navigation.reset({
            index: 0,
            routes: [{name: 'Login'}],
          });
        } catch (_) {}
      }
    } catch (err) {
      console.warn('Error cerrando sesión:', err);
      try {
        navigation.reset({
          index: 0,
          routes: [{name: 'Login'}],
        });
      } catch (_) {}
    }
  };

  const handleUnlink = async () => {
    try {
      setUnlinking(true);

      const id_admin_raw = await AsyncStorage.getItem('user_admin_id_actual');
      const id_edificio_raw = await AsyncStorage.getItem(
        'user_edificio_id_actual',
      );
      const mail = await AsyncStorage.getItem('user_email');

      if (!id_admin_raw || !id_edificio_raw || !mail) {
        throw new Error('Faltan datos para desvincular');
      }

      const payload = {
        id_admin: Number(id_admin_raw),
        id_edificio: Number(id_edificio_raw),
        mail: String(mail),
      };

      const res = await fetch(
        `${BASE}/api/residence/departamentos-usuarios/deactivate`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(TOKEN ? {Authorization: `Bearer ${TOKEN}`} : {}),
          },
          body: JSON.stringify(payload),
        },
      );

      const text = await res.text().catch(() => '');
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch (_) {
        json = null;
      }

      if (!res.ok) {
        const message =
          json?.error || json?.message || text || `HTTP ${res.status}`;
        throw new Error(message);
      }

      setShowUnlinkModal(false);
      await performLogout();
    } catch (err) {
      console.warn('Error al desvincular:', err);
      setUnlinking(false);
      setShowUnlinkModal(false);
    }
  };
  useEffect(() => {
    let mounted = true;

    async function loadFromStorageAndFetch() {
      setLoading(true);
      try {
        const storedUsuarioAppId = await AsyncStorage.getItem(
          'user_usuario_app_id',
        );
        const usuario_app_id = storedUsuarioAppId || null;

        const storedDeptId = await AsyncStorage.getItem(
          'user_residence_departamento_id_actual',
        );
        const departamento_id = storedDeptId
          ? String(storedDeptId).trim()
          : null;

        if (!departamento_id) {
          console.warn(
            'MiembrosResidence: no se encontró user_residence_departamento_id_actual en AsyncStorage',
          );
          if (mounted) {
            setResidents([]);
            setResidentCount(0);
            setLoading(false);
          }
          return;
        }
        if (!TOKEN || TOKEN.length === 0) {
          console.warn(
            'MiembrosResidence: TOKEN no está configurado o está vacío. Pon tu token en la constante TOKEN si es necesario.',
          );
          if (mounted) {
            setResidents([]);
            setResidentCount(0);
            setLoading(false);
          }
          return;
        }

        const fetchWithAuth = async (url, opts = {}) => {
          const method = (opts.method || 'GET').toUpperCase();
          let body = opts.body;

          const headers = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${TOKEN}`,
            ...(opts.headers || {}),
          };

          const fetchOptions = {method, headers};

          if (body !== undefined && body !== null) {
            fetchOptions.body =
              typeof body === 'string' ? body : JSON.stringify(body);
          }

          const res = await fetch(url, fetchOptions);
          const text = await res.text().catch(() => '');
          let json = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch (e) {
            json = null;
          }

          if (!res.ok) {
            const errText =
              json && (json.error || json.message)
                ? json.error || json.message
                : text || `HTTP ${res.status}`;
            const err = new Error(`HTTP ${res.status} - ${errText}`);
            err.status = res.status;
            err.bodyText = text;
            err.bodyJson = json;
            throw err;
          }
          return json;
        };

        const deptUrl = `${BASE}/api/residence/departamentos/${encodeURIComponent(
          departamento_id,
        )}`;
        let deptResp = null;
        try {
          deptResp = await fetchWithAuth(deptUrl, {method: 'GET'});
        } catch (errDept) {
          console.warn(
            'MiembrosResidence: error al consultar departamento',
            errDept.message || errDept,
            {
              status: errDept.status,
              bodyText: errDept.bodyText,
              bodyJson: errDept.bodyJson,
              deptUrl,
            },
          );
          throw errDept;
        }

        if (mounted) {
          const numeroDepto =
            deptResp?.numero_departamento ?? `${departamento_id}`;
          setDepartmentLabel(`Departamento ${numeroDepto}`);
        }

        const usuariosVinculados = Array.isArray(deptResp?.usuarios_vinculados)
          ? deptResp?.usuarios_vinculados
          : [];

        const mails = usuariosVinculados
          .map(u => (u && typeof u.mail === 'string' ? u.mail.trim() : ''))
          .filter(m => m && m.length > 0);

        if (mails.length === 0) {
          if (mounted) {
            setResidents([]);
            setResidentCount(0);
            setLoading(false);
          }
          return;
        }

        const fetchedResidents = [];
        for (const mail of mails) {
          try {
            const usuariosUrl = `${BASE2}/api/mobileapp/usuarios?mail=${encodeURIComponent(
              mail,
            )}&presign_ttl=30`;
            const usuariosResp = await fetchWithAuth(usuariosUrl, {
              method: 'GET',
            });
            const usuarioObj =
              Array.isArray(usuariosResp?.usuarios) &&
              usuariosResp.usuarios.length > 0
                ? usuariosResp.usuarios[0]
                : null;

            if (usuarioObj) {
              const nombre = usuarioObj.nombre ?? '';
              const apellido = usuarioObj.apellido ?? '';
              const phone = usuarioObj.telefono ?? '';
              const rol =
                usuarioObj.residence_rol_actual ?? usuarioObj.rol ?? '';
              const foto = usuarioObj.foto_perfil_url ?? '';
              const mailResp = usuarioObj.mail ?? mail;
              const usuario_app_id_resp = usuarioObj.usuario_app_id ?? '';

              fetchedResidents.push({
                id:
                  usuario_app_id_resp || mailResp || `${mail}-${Math.random()}`,
                name: `${nombre} ${apellido}`.trim() || mailResp,
                relation: rol || '',
                phone: phone || '',
                email: mailResp || mail,
                badge: rol || '',
                photo: foto || null,
                raw: usuarioObj,
              });
            } else {
              fetchedResidents.push({
                id: mail,
                name: mail,
                relation: '',
                phone: '',
                email: mail,
                badge: '',
                photo: null,
                raw: null,
              });
            }
          } catch (errMail) {
            console.warn(
              'Error buscando usuario por mail',
              mail,
              errMail.message || errMail,
              {
                status: errMail.status,
                bodyText: errMail.bodyText,
                bodyJson: errMail.bodyJson,
              },
            );
            fetchedResidents.push({
              id: mail,
              name: mail,
              relation: '',
              phone: '',
              email: mail,
              badge: '',
              photo: null,
              raw: null,
            });
          }
        }

        const isOwner = it => {
          const test = ((it.badge || it.relation || '') + '').toLowerCase();
          return test.includes('propiet');
        };

        fetchedResidents.sort((a, b) => {
          const aOwner = isOwner(a) ? 0 : 1;
          const bOwner = isOwner(b) ? 0 : 1;
          if (aOwner !== bOwner) return aOwner - bOwner;
          return 0;
        });

        if (mounted) {
          setResidents(fetchedResidents);
          setResidentCount(fetchedResidents.length);
        }
      } catch (err) {
        console.warn(
          'MiembrosResidence: error en flujo de integracion',
          err.message || err,
          {
            status: err.status,
            bodyText: err.bodyText,
            bodyJson: err.bodyJson,
          },
        );
        if (mounted) {
          setResidents([]);
          setResidentCount(0);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadFromStorageAndFetch();

    return () => {
      mounted = false;
    };
  }, []); // se ejecuta una vez: usamos AsyncStorage para obtener el departamento
  const baseScale = width / 375;
  const headerPaddingTop = clamp(
    Math.round(rf(12) + (height > 800 ? 6 : 0)),
    80,
    90,
  );
  const headerPaddingBottom = clamp(
    Math.round(rf(6) + (height > 800 ? 4 : 0)),
    12,
    32,
  );
  const headerBorderRadius = Math.round(
    clamp(rf(20) + Math.floor(baseScale * 4), 12, 36),
  );

  const titleFont = Math.round(
    clamp(rf(20) * (1 + (baseScale - 1) * 0.22), 16, 30),
  );
  const subtitleFont = Math.round(
    clamp(rf(12) * (1 + (baseScale - 1) * 0.18), 11, 20),
  );
  const nameFont = Math.round(
    clamp(rf(16) * (1 + (baseScale - 1) * 0.14), 14, 20),
  );
  const relationFont = Math.round(clamp(rf(13), 11, 16));
  const contactFont = Math.round(clamp(rf(13), 11, 16));
  const avatarInitialsFont = Math.round(clamp(rf(18), 14, 28));

  const avatarSize = clamp(Math.round(56 * baseScale), 44, 92);
  const rowVerticalPadding = clamp(Math.round(12 * baseScale), 8, 22);
  const listPadHorizontal = clamp(Math.round(14 * baseScale), 10, 28);

  const contactIconSize = Math.round(
    clamp(rf(14) * (1 + (baseScale - 1) * 0.1), 12, 22),
  );
  const backBtnPadV = clamp(Math.round(10 * baseScale), 8, 16);
  const backBtnPadH = clamp(Math.round(20 * baseScale), 14, 34);
  const backBtnMinWidth = clamp(Math.round(140 * baseScale), 110, 260);
  const dividerMarginTop = Math.round(rowVerticalPadding * 0.9);
  const renderItem = ({item, index}) => {
    const initials = getInitials(item.name);
    const grad = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
    const avatarSize = rf(56);
    const borderRadius = Math.round(avatarSize / 2);

    return (
      <View style={styles.rowWrap}>
        <View style={styles.rowInner}>
          {item.photo ? (
            <Image
              source={{uri: item.photo}}
              style={[
                styles.avatar,
                {width: avatarSize, height: avatarSize, borderRadius},
              ]}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={grad}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={[
                styles.avatar,
                {width: avatarSize, height: avatarSize, borderRadius},
              ]}>
              <Text
                style={[styles.avatarInitials, {fontSize: Math.round(rf(18))}]}>
                {initials}
              </Text>
            </LinearGradient>
          )}

          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text
                style={[styles.nameText, {fontSize: Math.round(rf(16))}]}
                numberOfLines={2}>
                {item.name}
              </Text>

              {item.badge ? (
                <View style={styles.badgeWrap}>
                  <Text
                    style={[styles.badgeText, {fontSize: Math.round(rf(11))}]}>
                    {item.badge}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={[styles.relationText, {fontSize: Math.round(rf(13))}]}>
              {item.relation}
            </Text>

            <View style={styles.contactRow}>
              <Ionicons
                name="call-outline"
                size={Math.round(rf(14))}
                color="#6b7280"
                style={{marginRight: 8}}
              />
              <Text
                style={[styles.contactText, {fontSize: Math.round(rf(13))}]}>
                {item.phone}
              </Text>
            </View>

            <View style={[styles.contactRow, {marginTop: 6}]}>
              <Ionicons
                name="mail-outline"
                size={Math.round(rf(14))}
                color="#6b7280"
                style={{marginRight: 8}}
              />
              <Text
                style={[styles.contactText, {fontSize: Math.round(rf(13))}]}>
                {item.email}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />
      </View>
    );
  };
  const ListFooter = () => (
    <View style={{alignItems: 'center', marginVertical: 18}}>
      <TouchableOpacity
        style={[
          styles.unlinkButton,
          {
            paddingVertical: backBtnPadV,
            paddingHorizontal: backBtnPadH,
            minWidth: backBtnMinWidth,
            marginBottom: 12,
          },
        ]}
        onPress={() => setShowUnlinkModal(true)}
        activeOpacity={0.85}>
        <Text style={styles.unlinkButtonText}>Desvincular</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.backButton,
          {
            paddingVertical: backBtnPadV,
            paddingHorizontal: backBtnPadH,
            minWidth: backBtnMinWidth,
          },
        ]}
        onPress={() => {
          try {
            navigation.navigate('QrResidence');
          } catch (e) {
            // fallback: try goBack
            try {
              navigation.goBack?.();
            } catch (e2) {}
          }
        }}
        activeOpacity={0.85}>
        <Text style={styles.backButtonText}>Volver</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.safe}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content" // purple header => light icons usually look best
      />
      <LinearGradient
        colors={['#9F4CFF', '#6A43FF', '#2C7DFF']}
        start={{x: 0, y: 1}}
        end={{x: 1, y: 0}}
        style={[
          styles.header,
          {
            height: headerHeight,
          },
        ]}>
        {' '}
        <View style={styles.encab}>
          <Text style={[styles.title, {fontSize: rf(20)}]}>
            {departmentLabel}
          </Text>
          <Text style={[styles.subtitle, {fontSize: rf(13)}]}>
            {loading
              ? 'Cargando residentes...'
              : `${residentCount} residentes registrados`}
          </Text>
        </View>
      </LinearGradient>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={residents}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{padding: 20}}>
            <Text style={{color: '#374151'}}>
              {loading ? 'Cargando...' : 'No se encontraron residentes.'}
            </Text>
          </View>
        }
        ListFooterComponent={ListFooter}
      />
      <Modal
        visible={showUnlinkModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!unlinking) setShowUnlinkModal(false);
        }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              ¿Estás seguro que quieres desvincularte de este departamento?
            </Text>

            {unlinking ? (
              <View style={{marginTop: 18, alignItems: 'center'}}>
                <ActivityIndicator size="large" color="#0046ff" />
                <Text style={styles.modalLoadingText}>Desvinculando...</Text>
              </View>
            ) : (
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => setShowUnlinkModal(false)}
                  activeOpacity={0.85}>
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirmButton]}
                  onPress={handleUnlink}
                  activeOpacity={0.85}>
                  <Text style={styles.modalConfirmText}>Sí, desvincular</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#fff'},

  header: {
    width: '100%',

    justifyContent: 'center',

    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: {width: 0, height: 6},
    shadowRadius: 15,
  },

  title: {color: '#fff', fontWeight: '800', paddingTop: 30},
  subtitle: {color: 'rgba(255,255,255,0.9)', marginTop: 6},

  listContent: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 36,
    backgroundColor: '#fff',
  },

  encab: {
    paddingHorizontal: 33,
  },

  rowWrap: {backgroundColor: '#fff'},
  rowInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: {width: 0, height: 4},
    shadowRadius: 8,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  avatarInitials: {color: '#fff', fontWeight: '800'},

  info: {flex: 1, paddingRight: 8},
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameText: {color: '#111827', fontWeight: '700', flex: 1},

  badgeWrap: {
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderColor: 'rgba(124,58,237,0.2)',
    borderWidth: 0.6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {color: '#6D28D9', fontWeight: '700'},

  relationText: {color: '#6b7280', marginTop: 6},

  contactRow: {flexDirection: 'row', alignItems: 'center'},
  contactText: {color: '#374151'},

  divider: {height: 1, backgroundColor: '#f1f3f5', marginTop: 12},
  /* nuevo estilo para el botón volver */
  backButton: {
    backgroundColor: '#0046ff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 26,
    borderWidth: 1,
    borderColor: '#E6E9EE',
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 6,
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  unlinkButton: {
    backgroundColor: '#e11d48',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecdd3',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 6,
  },
  unlinkButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 18,
  },
  modalTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 18,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#e5e7eb',
  },
  modalConfirmButton: {
    backgroundColor: '#e11d48',
  },
  modalCancelText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 14,
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  modalLoadingText: {
    marginTop: 12,
    color: '#374151',
    fontWeight: '600',
  },
});
