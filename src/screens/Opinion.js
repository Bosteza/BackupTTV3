import React, {useState, useEffect, useRef} from 'react';
import {useNotifications} from './NotificationProvider';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  Modal,
  Button,
  TextInput,
  useWindowDimensions,
  PixelRatio,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';

const API_BASE_URL = 'https://api.tab-track.com';
const API_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc3MDEzNjkxMCwianRpIjoiMzM3YjlkY2YtYjlkMi00NjFjLTkxMDItYzlkZjFkNDFlYmFjIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NzAxMzY5MTAsImV4cCI6MTc3MjcyODkxMCwicm9sIjoiRWRpdG9yIn0.GVPx2mKxkE7qZQ9AozQnldLlkogOOLksbetncQ8BgmY';

export default function OpinionScreen({navigation, route}) {
  const {width, height} = useWindowDimensions();

  // responsive helpers
  const wp = p => (Number(p) / 100) * width;
  const hp = p => (Number(p) / 100) * height;
  const rf = p => {
    const size = (Number(p) / 100) * width;
    return Math.round(PixelRatio.roundToNearestPixel(size));
  };
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const LEFT_COL = Math.round(clamp(width * 0.16, 56, 110));
  const SLIDE_HEIGHT = Math.round(clamp(width * 0.22, 80, 140));
  const styles = makeStyles({
    width,
    height,
    wp,
    hp,
    rf,
    clamp,
    LEFT_COL,
    SLIDE_HEIGHT,
  });

  const [showNotifications, setShowNotifications] = useState(false);
  const [alreadySent, setAlreadySent] = useState(false);

  const {notifications, unreadCount, markAllRead} = useNotifications();
  const [surveys, setSurveys] = useState([]);
  const [loadingSurveys, setLoadingSurveys] = useState(false);
  const [sending, setSending] = useState(false);

  const [ratingsMap, setRatingsMap] = useState({});
  const [textsMap, setTextsMap] = useState({});

  const visit = route?.params?.visit ?? null;
  const restauranteId =
    visit?.restaurante_id ??
    visit?.restauranteId ??
    visit?.restaurante ??
    visit?.restaurant_id ??
    null;
  const sucursalId =
    visit?.sucursal_id ??
    visit?.sucursal ??
    visit?.sucursalId ??
    visit?.branchId ??
    null;
  const saleId = visit?.sale_id ?? visit?.id ?? visit?.saleId ?? null;
  const bannerFromVisit = visit?.bannerImage ?? visit?.banner ?? null;
  const restaurantLogoFromVisit =
    visit?.restaurantImage ?? visit?.restaurantImageUri ?? visit?.logo ?? null;
  const modalWidth = Math.min(width * 0.92, 720);
  const iconSize = styles.iconSize;
  const basePadding = styles.basePadding;

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimerRef = useRef(null);

  const showToast = (msg, duration = 3000) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToastMsg(String(msg || ''));
    setToastVisible(true);
    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
      toastTimerRef.current = null;
    }, duration);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, []);
  // ----------------------------------------------------------------

  // Cargar encuestas activas para la sucursal/restaurante
  useEffect(() => {
    (async () => {
      if (!restauranteId || !sucursalId) {
        console.warn(
          'OpinionScreen: faltan restaurante o sucursal en params.visit',
        );
        return;
      }
      setLoadingSurveys(true);
      try {
        const url = `${API_BASE_URL.replace(
          /\/$/,
          '',
        )}/api/mobileapp/restaurantes/${encodeURIComponent(
          restauranteId,
        )}/sucursales/${encodeURIComponent(sucursalId)}/encuestas/activas`;
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(API_TOKEN ? {Authorization: `Bearer ${API_TOKEN}`} : {}),
          },
        });
        if (!res.ok) {
          console.warn('OpinionScreen: fetch encuestas failed', res.status);
          setSurveys([]);
          return;
        }
        const json = await res.json();
        let arr = [];
        if (Array.isArray(json)) arr = json;
        else if (Array.isArray(json.data)) arr = json.data;
        else if (Array.isArray(json.encuestas)) arr = json.encuestas;
        else if (
          json &&
          typeof json === 'object' &&
          json.preguntas &&
          Array.isArray(json.preguntas)
        ) {
          arr = [json];
        } else {
          arr = [];
        }
        arr = arr.map(e => ({
          ...e,
          preguntas: Array.isArray(e.preguntas)
            ? e.preguntas
            : Array.isArray(e.questions)
            ? e.questions
            : [],
        }));
        setSurveys(arr);

        // --- NUEVO: después de cargar encuestas, consultamos los reportes previos (respuestas hechas por este usuario para cada encuesta)
        try {
          // obtener user id desde AsyncStorage
          let userId = null;
          try {
            userId = await AsyncStorage.getItem('user_usuario_app_id');
            if (!userId) {
              userId =
                (await AsyncStorage.getItem('user_email')) ||
                (await AsyncStorage.getItem('email')) ||
                null;
            }
          } catch (e) {
            console.warn('OpinionScreen: error reading user id for reports', e);
            userId = null;
          }

          if (userId && saleId && sucursalId) {
            // recorrer encuestas y pedir reportes
            const accumulatedRatings = {};
            const accumulatedTexts = {};
            for (const encuesta of arr) {
              const encuestaId =
                encuesta?.id ?? encuesta?.encuesta_id ?? encuesta?.uuid ?? null;
              if (!encuestaId) continue;

              const repUrl = `${API_BASE_URL.replace(
                /\/$/,
                '',
              )}/api/encuestas/${encodeURIComponent(
                encuestaId,
              )}/reportes?usuario_app_id=${encodeURIComponent(
                userId,
              )}&sale_id=${encodeURIComponent(
                saleId,
              )}&sucursal_id=${encodeURIComponent(sucursalId)}`;

              try {
                const repRes = await fetch(repUrl, {
                  method: 'GET',
                  headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    ...(API_TOKEN
                      ? {Authorization: `Bearer ${API_TOKEN}`}
                      : {}),
                  },
                });

                if (!repRes.ok) {
                  // no abort entire process; sólo log
                  console.warn(
                    'OpinionScreen: fetch reportes failed',
                    repRes.status,
                    encuestaId,
                  );
                  continue;
                }

                const repJson = await repRes.json();

                // Normalizar posibles estructuras:
                // - array directo de reportes/respuestas
                // - { data: [...] } or { reportes: [...] } or { respuestas: [...] }
                // - array de objetos donde cada objeto contiene campo 'respuestas' (tomamos la primera)
                let reps = null;
                if (Array.isArray(repJson)) reps = repJson;
                else if (Array.isArray(repJson.data)) reps = repJson.data;
                else if (Array.isArray(repJson.reportes))
                  reps = repJson.reportes;
                else if (Array.isArray(repJson.respuestas))
                  reps = repJson.respuestas;
                else if (repJson && typeof repJson === 'object') {
                  // buscar en primer nivel arrays
                  const keys = Object.keys(repJson);
                  for (const k of keys) {
                    if (Array.isArray(repJson[k]) && repJson[k].length > 0) {
                      setAlreadySent(true);
                      // si el array contiene objetos con 'pregunta_id' o 'respuestas', lo usamos
                      const sample = repJson[k][0];
                      if (
                        sample &&
                        (sample.pregunta_id !== undefined ||
                          sample.respuesta !== undefined ||
                          sample.respuestas !== undefined ||
                          sample.valor_int !== undefined ||
                          sample.valor_text !== undefined)
                      ) {
                        reps = repJson[k];
                        break;
                      }
                    }
                  }
                  // si no encontramos un array directo, tal vez repJson es { reportes: [{ respuestas: [...] }] }
                  if (!reps) {
                    // intentar extraer respuestas desde el primer elemento
                    if (
                      Array.isArray(repJson.reportes) &&
                      repJson.reportes.length > 0 &&
                      Array.isArray(repJson.reportes[0].respuestas)
                    ) {
                      reps = repJson.reportes[0].respuestas;
                    } else if (
                      Array.isArray(repJson.data) &&
                      repJson.data.length > 0 &&
                      Array.isArray(repJson.data[0].respuestas)
                    ) {
                      reps = repJson.data[0].respuestas;
                    } else if (Array.isArray(repJson) && repJson.length > 0) {
                      reps = repJson;
                    }
                  }
                }

                if (!Array.isArray(reps) || reps.length === 0) {
                  // no hay respuestas previas para esta encuesta
                  continue;
                }

                // reps puede ser un array de objetos que representan respuestas individuales
                // Cada item puede tener: pregunta_id, valor_int, valor_text, valor, respuesta, etc.
                // Recorremos y mappeamos a ratings/texts
                for (const r of reps) {
                  if (!r || typeof r !== 'object') continue;
                  const pid =
                    r.pregunta_id ??
                    r.pregunta ??
                    r.question_id ??
                    r.id_pregunta ??
                    r.preguntaId ??
                    null;
                  if (!pid) {
                    // si la estructura es diferente (ej. r.respuestas contiene items), intentar extraer
                    if (Array.isArray(r.respuestas)) {
                      for (const rr of r.respuestas) {
                        const pid2 =
                          rr.pregunta_id ??
                          rr.pregunta ??
                          rr.question_id ??
                          null;
                        if (!pid2) continue;
                        if (rr.valor_int !== undefined && rr.valor_int !== null)
                          accumulatedRatings[pid2] = Number(rr.valor_int);
                        else if (
                          rr.valor_text !== undefined &&
                          rr.valor_text !== null
                        )
                          accumulatedTexts[pid2] = String(rr.valor_text);
                        else if (
                          rr.valor !== undefined &&
                          (typeof rr.valor === 'number' ||
                            !isNaN(Number(rr.valor)))
                        )
                          accumulatedRatings[pid2] = Number(rr.valor);
                        else if (rr.valor !== undefined)
                          accumulatedTexts[pid2] = String(rr.valor);
                      }
                    }
                    continue;
                  }

                  // prioridad: valor_int, valor_text, valor, respuesta
                  if (r.valor_int !== undefined && r.valor_int !== null) {
                    accumulatedRatings[pid] = Number(r.valor_int);
                  } else if (
                    r.valor_text !== undefined &&
                    r.valor_text !== null
                  ) {
                    accumulatedTexts[pid] = String(r.valor_text);
                  } else if (r.valor !== undefined && r.valor !== null) {
                    // puede ser número o texto
                    if (
                      typeof r.valor === 'number' ||
                      !isNaN(Number(r.valor))
                    ) {
                      accumulatedRatings[pid] = Number(r.valor);
                    } else {
                      accumulatedTexts[pid] = String(r.valor);
                    }
                  } else if (
                    r.respuesta !== undefined &&
                    r.respuesta !== null
                  ) {
                    // campo alternativo
                    if (
                      typeof r.respuesta === 'number' ||
                      !isNaN(Number(r.respuesta))
                    ) {
                      accumulatedRatings[pid] = Number(r.respuesta);
                    } else {
                      accumulatedTexts[pid] = String(r.respuesta);
                    }
                  } else if (
                    r.valor_texto !== undefined &&
                    r.valor_texto !== null
                  ) {
                    accumulatedTexts[pid] = String(r.valor_texto);
                  }
                }
              } catch (err) {
                console.warn(
                  'OpinionScreen: error fetching report for encuesta',
                  encuestaId,
                  err,
                );
                continue;
              }
            } // end for each encuesta

            // aplicar acumulados al estado (merge sin borrar entradas que el usuario ya haya modificado en pantalla)
            setRatingsMap(prev => ({...accumulatedRatings, ...prev})); // priorizamos prev (ya ingresado por usuario) if any
            setTextsMap(prev => ({...accumulatedTexts, ...prev}));
          } // end if have userId & saleId & sucursalId
        } catch (err) {
          console.warn('OpinionScreen: error loading previous reportes', err);
        }
      } catch (err) {
        console.warn('OpinionScreen load surveys error', err);
        setSurveys([]);
      } finally {
        setLoadingSurveys(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restauranteId, sucursalId]);

  // manejar selección de estrellas
  const setStarForQuestion = (preguntaId, value) => {
    setRatingsMap(prev => ({...prev, [preguntaId]: value}));
  };

  const setTextForQuestion = (preguntaId, text) => {
    setTextsMap(prev => ({...prev, [preguntaId]: text}));
  };

  // construir y enviar respuestas para todas las encuestas cargadas (envía una petición por encuesta)
  const handleSend = async () => {
    if (!surveys || surveys.length === 0) {
      showToast('No hay encuestas para enviar.');
      setAlreadySent(true);

      return;
    }

    // obtener usuario id desde AsyncStorage
    let userId = null;
    try {
      userId = await AsyncStorage.getItem('user_usuario_app_id');
      if (!userId) {
        userId =
          (await AsyncStorage.getItem('user_email')) ||
          (await AsyncStorage.getItem('email')) ||
          null;
      }
    } catch (e) {
      console.warn('OpinionScreen: error reading user id', e);
    }

    if (!userId) {
      showToast('Usuario no identificado. Inicia sesión e intenta nuevamente.');
      return;
    }

    setSending(true);
    try {
      for (const encuesta of surveys) {
        const encuestaId =
          encuesta?.id ?? encuesta?.encuesta_id ?? encuesta?.uuid ?? null;
        if (!encuestaId) continue;

        const respuestas = [];
        for (const p of encuesta.preguntas || []) {
          const pid = p.id ?? p.pregunta_id ?? null;
          if (!pid) continue;
          const tipo = (p.tipo ?? '').toUpperCase();
          if (tipo === 'ESTRELLAS') {
            const val = Number(ratingsMap[pid] ?? 0);
            if (val > 0) {
              respuestas.push({pregunta_id: pid, valor_int: val});
            } else if (p.obligatorio) {
              showToast(
                `Responde la pregunta obligatoria: "${p.texto ?? 'Pregunta'}"`,
              );
              setSending(false);
              return;
            }
          } else {
            const txt = (textsMap[pid] ?? '').trim();
            if (txt) {
              respuestas.push({pregunta_id: pid, valor_text: txt});
            } else if (p.obligatorio) {
              showToast(
                `Responde la pregunta obligatoria: "${p.texto ?? 'Pregunta'}"`,
              );
              setSending(false);
              return;
            }
          }
        }

        if (!respuestas || respuestas.length === 0) {
          continue;
        }

        const payload = {
          restaurante_id: restauranteId,
          sucursal_id: sucursalId,
          usuario_app_id: userId,
          sale_id: saleId, // <-- AGREGADO: ahora incluimos sale_id como el servidor espera
          respuestas,
        };

        const url = `${API_BASE_URL.replace(
          /\/$/,
          '',
        )}/api/encuestas/${encodeURIComponent(encuestaId)}/respuestas`;
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              ...(API_TOKEN ? {Authorization: `Bearer ${API_TOKEN}`} : {}),
            },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const text = await res.text().catch(() => null);
            console.warn(
              'OpinionScreen send failed',
              encuestaId,
              res.status,
              text,
            );
            showToast(
              `No se pudo enviar la encuesta (${
                encuesta?.nombre ?? encuestaId
              }).`,
            );
            setSending(false);
            return;
          }
        } catch (err) {
          console.warn('OpinionScreen send error', err);
          showToast(
            'Error de red al enviar las respuestas. Revisa tu conexión.',
          );
          setSending(false);
          return;
        }
      }

      // éxito: navegar a Rating (sin alert)
      setRatingsMap({});
      setTextsMap({});
      navigation.navigate('Rating', {visit});
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Modal de notificaciones */}
      <Modal visible={showNotifications} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, {width: modalWidth}]}>
            <View style={styles.modalHeader}>
              <Text
                style={[styles.modalTitle, {fontSize: clamp(rf(3.8), 16, 20)}]}>
                Notificaciones
              </Text>
              <TouchableOpacity
                onPress={() => setShowNotifications(false)}
                hitSlop={{top: 8, left: 8, right: 8, bottom: 8}}>
                <Ionicons name="close" size={iconSize} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalListHeader}>
              <Text style={styles.modalListHeaderText}>
                Últimas notificaciones
              </Text>
            </View>

            <ScrollView
              style={[
                styles.modalList,
                {maxHeight: Math.round(Math.min(hp(60), 420))},
              ]}>
              {notifications && notifications.length > 0 ? (
                notifications.map(n => (
                  <NotificationRow key={n.id} n={n} styles={styles} />
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
              style={[styles.markReadButton, {margin: basePadding}]}
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

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
          accessibilityRole="button">
          <Ionicons
            name="arrow-back"
            size={styles.iconSize}
            color={styles.headerTitle.color}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Calificar</Text>

        <View style={styles.headerIcons}>
          {/*           <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
          /> */}
          <TouchableOpacity
            onPress={() => setShowNotifications(true)}
            style={styles.headerButton}
            hitSlop={{top: 8, left: 8, right: 8, bottom: 8}}>
            <Ionicons name="notifications-outline" size={30} color="#0046ff" />
            {unreadCount > 0 && (
              <View style={[styles.badge, {right: 6, top: 1}]}>
                <Text
                  style={[
                    styles.badgeText,
                    {fontSize: clamp(rf(2.6), 15, 20)},
                  ]}>
                  {unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/*         <Text style={styles.sectionHeading}>Detalle</Text>
         */}
        <View style={styles.topSection}>
          <View style={styles.logoColumn}>
            <View style={styles.avatarWrapper}>
              {restaurantLogoFromVisit ? (
                <Image
                  source={{uri: restaurantLogoFromVisit}}
                  style={styles.avatar}
                />
              ) : (
                <Image
                  source={require('../../assets/images/barra.png')}
                  style={styles.avatar}
                />
              )}
            </View>
          </View>

          <View style={[styles.slider, {height: styles.slideHeight}]}>
            {bannerFromVisit ? (
              <Image
                source={{uri: bannerFromVisit}}
                style={[
                  styles.slideImage,
                  {height: styles.slideHeight, width: '100%'},
                ]}
              />
            ) : restaurantLogoFromVisit ? (
              <Image
                source={{uri: restaurantLogoFromVisit}}
                style={[
                  styles.slideImage,
                  {height: styles.slideHeight, width: '100%'},
                ]}
              />
            ) : (
              <Image
                source={require('../../assets/images/restaurante.jpeg')}
                style={[
                  styles.slideImage,
                  {height: styles.slideHeight, width: '100%'},
                ]}
              />
            )}
          </View>
        </View>

        <View style={styles.rightColumn}>
          <Text style={styles.instruction}>
            Por favor, califica tu experiencia en{' '}
            <Text style={styles.bold}>
              {visit?.restaurantName ?? visit?.restaurant ?? 'el restaurante'}
            </Text>{' '}
            con base a las siguientes preguntas
          </Text>

          {loadingSurveys ? (
            <View style={{padding: 12, alignItems: 'center'}}>
              <ActivityIndicator size="large" color={BLUE} />
              <Text style={{marginTop: 8}}>Cargando encuestas...</Text>
            </View>
          ) : (
            <>
              {surveys.length === 0 ? (
                <View style={{padding: 12}}>
                  <Text style={{color: '#666'}}>
                    No hay encuestas activas para esta sucursal.
                  </Text>
                </View>
              ) : null}

              {surveys.map((encuesta, si) => (
                <View key={encuesta.id ?? si} style={{marginBottom: 20}}>
                  <Text
                    style={[
                      styles.surveyTitle,
                      {paddingLeft: styles.basePadding},
                    ]}>
                    {encuesta.nombre ??
                      encuesta.titulo ??
                      encuesta.descripcion ??
                      `Encuesta ${si + 1}`}
                  </Text>

                  {(encuesta.preguntas || []).map((p, i) => {
                    const pid = p.id ?? p.pregunta_id ?? `p_${i}`;
                    const tipo = (p.tipo ?? '').toUpperCase();
                    return (
                      <View
                        key={pid}
                        style={[
                          styles.questionBlock,
                          {paddingLeft: styles.basePadding},
                        ]}>
                        <Text
                          style={[
                            styles.questionText,
                            {fontSize: styles.questionFontSize},
                          ]}>{`${i + 1}. ${
                          p.texto ?? p.text ?? 'Pregunta'
                        }`}</Text>

                        {tipo === 'ESTRELLAS' ? (
                          <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map(s => {
                              const filled = (ratingsMap[pid] ?? 0) >= s;
                              return (
                                <TouchableOpacity
                                  key={s}
                                  onPress={() => {
                                    if (!alreadySent)
                                      setStarForQuestion(pid, s);
                                  }}
                                  disabled={alreadySent}
                                  accessibilityRole="button">
                                  <Ionicons
                                    name={filled ? 'star' : 'star-outline'}
                                    size={styles.starSize}
                                    color={filled ? '#FFD700' : '#CCC'}
                                    style={{marginRight: 6}}
                                  />
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        ) : (
                          <TextInput
                            style={styles.opinionInput}
                            multiline
                            numberOfLines={4}
                            placeholder="Escribe tu respuesta..."
                            placeholderTextColor="#999"
                            value={textsMap[pid] ?? ''}
                            editable={!alreadySent}
                            selectTextOnFocus={!alreadySent}
                            onChangeText={t => {
                              if (!alreadySent) setTextForQuestion(pid, t);
                            }}
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}

              <View style={{marginTop: 0}} />
              {alreadySent ? (
                <View style={styles.sentButtonWrapper}>
                  <View style={styles.sentButtonInner}>
                    <LinearGradient
                      colors={['#9F4CFF', '#6A43FF', '#2C7DFF']}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 0}}
                      style={styles.sentGradientBg}
                    />
                    <Text
                      allowFontScaling={false}
                      style={[
                        styles.sentButtonText,
                        {
                          fontSize: 17,
                          lineHeight: Math.round(30 * 1.2),
                        },
                      ]}>
                      Tu respuesta se ha enviado, ¡muchas gracias!
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.btnPrimary, {opacity: sending ? 0.7 : 1}]}
                    onPress={handleSend}
                    disabled={sending}
                    activeOpacity={0.85}>
                    {sending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.btnText}>Enviar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Toast interno */}
      {toastVisible && (
        <View style={styles.localToast}>
          <Text style={styles.localToastText}>{toastMsg}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function NotificationRow({n, styles}) {
  const dateLabel = n.date
    ? new Date(n.date).toLocaleString('es-MX', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : '';

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

const BLUE = '#0046ff';

function makeStyles({
  width,
  height,
  wp,
  hp,
  rf,
  clamp,
  LEFT_COL,
  SLIDE_HEIGHT,
}) {
  const basePadding = Math.round(clamp(wp(4), 12, 24));
  const headerHeight = Math.round(clamp(hp(8), 84, 100));
  const iconSize = Math.round(clamp(rf(2.6), 19, 32));
  const starSize = Math.round(clamp(rf(4.6), 18, 28)); // un poco más grande
  const slideHeight = SLIDE_HEIGHT;
  const leftCol = LEFT_COL;
  const sliderWidth = Math.round(
    Math.max(120, width - leftCol - basePadding * 2 - 24),
  );
  const logoW = Math.round(clamp(width * 0.18, 60, 110));
  const sectionHeadingSize = Math.round(clamp(rf(5.8), 18, 28));
  const textSmall = Math.round(clamp(rf(3.6), 14, 20)); // preguntas más grandes
  const textRegular = Math.round(clamp(rf(3.8), 12, 16));
  const inputHeight = Math.round(clamp(hp(12), 80, 160));

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',

      borderBottomWidth: 1,
      borderBottomColor: BLUE,
      justifyContent: 'space-between',
      height: headerHeight,
      paddingHorizontal: basePadding,
    },
    headerButton: {padding: 8},
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: Math.round(clamp(rf(4.4), 19, 22)),
      fontWeight: '600',
      color: BLUE,
      fontFamily: 'Montserrat-Bold',
    },
    headerIcons: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logo: {
      width: logoW,
      height: Math.round(logoW * 0.28),
      resizeMode: 'contain',
    },
    notificationButton: {marginLeft: 12},

    badge: {
      position: 'absolute',

      backgroundColor: '#ff3b30',
      borderRadius: 9,
      paddingHorizontal: 6,
      paddingVertical: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {color: '#fff', fontSize: Math.round(clamp(rf(2.6), 10, 12))},

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalBox: {
      width: Math.min(width * 0.92, 720),
      backgroundColor: '#fff',
      borderRadius: 12,
      overflow: 'hidden',
      maxHeight: Math.round(hp(70)),
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Math.round(clamp(wp(4), 12, 20)),
      borderBottomWidth: 1,
      borderColor: '#eee',
    },
    modalTitle: {
      fontSize: Math.round(clamp(rf(4.4), 16, 20)),
      color: '#000',
      fontFamily: 'Montserrat-Bold',
    },
    modalList: {
      paddingHorizontal: Math.round(clamp(wp(3), 8, 16)),
      paddingVertical: Math.round(hp(1)),
      flexGrow: 0,
    },
    notificationItem: {
      paddingVertical: Math.round(hp(1.2)),
      borderBottomWidth: 1,
      borderColor: '#f0f0f0',
    },
    notificationText: {
      fontSize: textRegular,
      color: '#333',
      fontFamily: 'Montserrat-Regular',
    },
    unread: {backgroundColor: '#eef5ff'},
    read: {backgroundColor: '#fff'},
    modalBtnWrap: {padding: Math.round(clamp(wp(3), 8, 12))},

    scrollContent: {
      paddingVertical: Math.round(hp(2)),
      paddingBottom: Math.round(hp(6)),
    },

    sectionHeading: {
      fontSize: sectionHeadingSize,
      fontWeight: '600',
      color: BLUE,
      marginBottom: 18,
      paddingHorizontal: basePadding,
      fontFamily: 'Montserrat-Bold',
    },

    topSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      paddingHorizontal: basePadding,
    },
    logoColumn: {width: leftCol, alignItems: 'center'},
    avatarWrapper: {
      width: Math.round(clamp(leftCol * 0.75, 44, 80)),
      height: Math.round(clamp(leftCol * 0.75, 44, 80)),
      borderRadius: Math.round(clamp(leftCol * 0.75, 22, 40)),
      borderWidth: 1,
      borderColor: BLUE,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      backgroundColor: '#fff',
    },
    avatar: {
      width: Math.round(clamp(leftCol * 0.65, 36, 72)),
      height: Math.round(clamp(leftCol * 0.65, 36, 72)),
      borderRadius: Math.round(clamp(leftCol * 0.65, 18, 36)),
    },

    slider: {
      marginLeft: Math.round(clamp(wp(3), 8, 16)),
      width: sliderWidth,
      height: slideHeight,
    },
    slideImage: {
      width: '100%',
      height: slideHeight,
      borderRadius: 8,
      resizeMode: 'cover',
      marginRight: 8,
    },

    rightColumn: {
      marginLeft: 0,
      paddingHorizontal: basePadding,
      paddingBottom: Math.round(hp(1)),
    },
    instruction: {
      fontSize: textRegular,
      color: '#333',
      marginBottom: 16,
      lineHeight: Math.round(textRegular * 1.6),
      fontFamily: 'Montserrat-Bold',
    },
    bold: {fontWeight: '600'},

    surveyTitle: {
      fontSize: Math.round(clamp(rf(5.0), 16, 20)),
      fontWeight: '700',
      color: BLUE,
      marginBottom: 10,
    },
    questionBlock: {marginBottom: 14},
    questionText: {
      fontSize: textSmall,
      color: '#333',
      marginBottom: 8,
      lineHeight: Math.round(textSmall * 1.4),
      fontFamily: 'Montserrat-Regular',
    },
    starsRow: {flexDirection: 'row'},
    starSize,

    opinionLabel: {
      fontSize: textSmall,
      color: '#333',
      marginBottom: 8,
      lineHeight: Math.round(textSmall * 1.6),
      fontFamily: 'Montserrat-Bold',
    },
    opinionInput: {
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 8,
      padding: Math.round(clamp(wp(3), 8, 12)),
      fontSize: textRegular,
      color: '#333',
      marginBottom: 12,
      fontFamily: 'Montserrat-Regular',
      height: inputHeight,
      textAlignVertical: 'top',
      backgroundColor: '#fff',
    },

    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    btnPrimary: {
      flex: 1,
      backgroundColor: BLUE,
      paddingVertical: Math.round(hp(1.6)),
      borderRadius: 10,
      marginRight: 8,
      alignItems: 'center',
    },
    btnSecondary: {
      flex: 1,
      backgroundColor: BLUE,
      paddingVertical: Math.round(hp(1.6)),
      borderRadius: 10,
      marginLeft: 8,
      alignItems: 'center',
    },
    btnText: {
      color: '#fff',
      fontSize: Math.round(clamp(rf(3.8), 12, 14)),
      fontFamily: 'Montserrat-Bold',
    },

    basePadding,
    slideHeight,
    questionFontSize: textSmall,
    iconSize,
    starSize,

    // estilos para toast interno
    localToast: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: Platform.OS === 'android' ? 28 : 40,
      backgroundColor: BLUE,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 6,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 6,
      shadowOffset: {width: 0, height: 4},
    },
    localToastText: {color: '#fff', textAlign: 'center', fontWeight: '700'},
    sentButtonWrapper: {
      width: '100%',
      borderRadius: 10,
      overflow: 'hidden', // IMPORTANT for iOS
      marginTop: 16,
    },

    sentButtonInner: {
      width: '100%',
      minHeight: Math.round(hp(6)),
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Math.round(hp(1.6)),
      paddingHorizontal: Math.round(wp(4)),
    },

    sentGradientBg: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 10,
    },

    sentButtonText: {
      color: '#fff',
      fontSize: Math.round(clamp(rf(3.8), 12, 14)),
      fontFamily: 'Montserrat-Bold',
      lineHeight: Math.round(Math.round(clamp(rf(3.8), 12, 14)) * 1.32),
      paddingBottom: Platform.OS === 'ios' ? 1 : 0, // prevents glyph clipping
    },

    modalListHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderColor: '#eee',
    },

    modalListHeaderText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#333',
    },

    markAllText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#0046ff',
    },
    notificationCard: {
      padding: 14,
      marginVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e6e6e6',
    },

    notificationUnread: {
      backgroundColor: '#eef5ff',
    },

    notificationRead: {
      backgroundColor: '#fff',
    },

    notificationCardText: {
      fontSize: 14,
      color: '#333',
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

    unreadCard: {
      backgroundColor: '#f2f8ff',
      borderColor: '#d7e8ff',
    },

    readCard: {
      backgroundColor: '#ffffff',
      borderColor: '#f0f0f0',
    },

    notLeft: {
      flex: 1,
      paddingRight: 8,
    },

    notRight: {
      alignItems: 'flex-end',
      justifyContent: 'center',
    },

    notBranch: {
      fontWeight: '800',
      fontSize: 14,
      color: '#111',
      marginBottom: 2,
    },

    notSale: {
      color: '#666',
      fontSize: 12,
      marginBottom: 2,
    },

    notDate: {
      color: '#888',
      fontSize: 11,
    },

    notAmount: {
      fontWeight: '900',
      fontSize: 16,
      color: '#0b58ff',
    },

    notCurrency: {
      color: '#666',
      fontSize: 11,
    },
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

    datePicker: {
      width: '100%',
    },

    dateActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
      width: '100%',
    },

    dateBtnSecondary: {
      paddingVertical: 10,
      paddingHorizontal: 16,
    },

    dateBtnSecondaryText: {
      color: '#666',
      fontWeight: '600',
    },

    dateBtnPrimary: {
      paddingVertical: 10,
      paddingHorizontal: 16,
    },

    dateBtnPrimaryText: {
      color: '#0046ff',
      fontWeight: '700',
    },
  });
}
