//FUNCIONA
import React, {useCallback, useState} from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {View, Text} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tabs principales
import QRScreen from './QRScreen';
import ProfileScreen from './ProfileScreen';
import GPSScreen from './GPSScreen';
import Feed from './Feed';
import ExperiencesScreen from './ExperiencesScreen';

// Guest gate
import GuestGate from './GuestGate';

// Extras
import RestaurantDetailScreen from './RestaurantDetailScreen';
import Reservation from './Reservation';
import Calificar from './Calificar';
import PaymentMethods from './PaymentMethods';
import InfoPersonal from './InfoPersonal';
import Facturacion from './Facturacion';
import RatingSuccessScreen from './RatingSuccesScreen';
import OpinionScreen from './Opinion';
import OpinionSuccessScreen from './OpinionSuccesScreen';
import FavoritesScreen from './FavoritesScreen';
import SesionAndSecurity from './SesionAndSecurity';
import Help from './Help';
import TermsAndConditions from './TermsAndConditions';
import ChangePassword from './ChangePassword';
import Escanear from './Escanear';
import Consumo from './Consumo';
import Dividir from './Dividir';
import ExperiencesDetails from './ExperiencesDetails';
import EqualSplit from './EqualSplit';
import Branch from './Branch';
import Propina from './Propina';
import ResumenPago from './ResumenPago';
import OneExhibicion from './OneExhibicion';
import PaymentScreen from './PaymentScreen';
import OpenPay from './OpenPay';
import Stripe from './Stripe';
import ConfirmacionPago from './ConfirmacionPago';
import SaleDetail from './PagoDetail';
import ErrorPago from './ErrorPago';
import {StackActions} from '@react-navigation/native';
import SelectDefaultHome from './SelectDefaultHome';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ------- Stacks por cada tab (reciben isGuest como prop) -------

function QRStackScreen({isGuest}) {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="QRMain">
        {props =>
          isGuest ? (
            <GuestGate subtitle="QR está disponible al iniciar sesión.">
              <QRScreen {...props} />
            </GuestGate>
          ) : (
            <QRScreen {...props} />
          )
        }
      </Stack.Screen>

      <Stack.Screen name="Escanear" component={Escanear} />
      <Stack.Screen name="Consumo" component={Consumo} />
      <Stack.Screen name="Dividir" component={Dividir} />
      <Stack.Screen name="EqualSplit" component={EqualSplit} />
      <Stack.Screen name="Propina" component={Propina} />
      <Stack.Screen name="ResumenPago" component={ResumenPago} />
      <Stack.Screen name="OneExhibicion" component={OneExhibicion} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="Openpay" component={OpenPay} />
      <Stack.Screen name="Stripe" component={Stripe} />
      <Stack.Screen name="ConfirmacionPago" component={ConfirmacionPago} />
      <Stack.Screen name="ErrorPago" component={ErrorPago} />
      <Stack.Screen name="Payments" component={PaymentMethods} />
    </Stack.Navigator>
  );
}

function FeedStackScreen() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="FeedMain" component={Feed} />
      <Stack.Screen name="Restaurant" component={RestaurantDetailScreen} />
      <Stack.Screen name="Reservation" component={Reservation} />
      <Stack.Screen name="Calificar" component={Calificar} />
      <Stack.Screen name="Opinion" component={OpinionScreen} />
      <Stack.Screen name="OpinionSucces" component={OpinionSuccessScreen} />
      <Stack.Screen name="Rating" component={RatingSuccessScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
    </Stack.Navigator>
  );
}

function GPSStackScreen() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="GPSMain" component={GPSScreen} />
      <Stack.Screen name="Restaurant" component={RestaurantDetailScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="Reservation" component={Reservation} />
    </Stack.Navigator>
  );
}

function ExperiencesStackScreen({isGuest}) {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="ExperiencesMain">
        {props =>
          isGuest ? (
            <GuestGate subtitle="Experiencias está disponible al iniciar sesión.">
              <ExperiencesScreen {...props} />
            </GuestGate>
          ) : (
            <ExperiencesScreen {...props} />
          )
        }
      </Stack.Screen>

      <Stack.Screen name="ExperiencesDetails" component={ExperiencesDetails} />
      <Stack.Screen name="Rating" component={RatingSuccessScreen} />
      <Stack.Screen name="Calificar" component={Calificar} />
      <Stack.Screen name="Opinion" component={OpinionScreen} />
      <Stack.Screen name="OpinionSucces" component={OpinionSuccessScreen} />
      <Stack.Screen name="SaleDetail" component={SaleDetail} />
    </Stack.Navigator>
  );
}

function ProfileStackScreen({isGuest}) {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="ProfileMain">
        {props =>
          isGuest ? (
            <GuestGate subtitle="Perfil está disponible al iniciar sesión.">
              <ProfileScreen {...props} />
            </GuestGate>
          ) : (
            <ProfileScreen {...props} />
          )
        }
      </Stack.Screen>

      <Stack.Screen name="Payments" component={PaymentMethods} />
      <Stack.Screen name="InfoPersonal" component={InfoPersonal} />
      <Stack.Screen name="Facturacion" component={Facturacion} />
      <Stack.Screen name="Security" component={SesionAndSecurity} />
      <Stack.Screen name="Help" component={Help} />
      <Stack.Screen name="Terms" component={TermsAndConditions} />
      <Stack.Screen name="ChangePassword" component={ChangePassword} />
      <Stack.Screen name="Escanear" component={Escanear} />
      <Stack.Screen name="Dividir" component={Dividir} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="Restaurant" component={RestaurantDetailScreen} />
      <Stack.Screen name="SaleDetail" component={SaleDetail} />
      <Stack.Screen name="ExperiencesDetails" component={ExperiencesDetails} />
      <Stack.Screen name="SelectDefaultHome" component={SelectDefaultHome} />
    </Stack.Navigator>
  );
}

// ------- Home (tabs) -------

export default function Home() {
  const [isGuest, setIsGuest] = useState(false);

  // Refresh guest state whenever Home comes into focus
  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      (async () => {
        try {
          const sessionActive = await AsyncStorage.getItem('session_active');
          const sessionGuest = await AsyncStorage.getItem('session_guest');

          // guest = not logged in AND guest flag is on
          const guest = sessionActive !== '1' && sessionGuest === '1';
          if (mounted) setIsGuest(guest);
        } catch {
          if (mounted) setIsGuest(false);
        }
      })();

      return () => {
        mounted = false;
      };
    }, []),
  );

  return (
    <Tab.Navigator
      initialRouteName="QR" //Change this to Feed/QR if you want iPad to work
      lazy={true}
      screenOptions={({route}) => {
        // Optional: dim + “locked” label for these tabs in guest
        const locked =
          isGuest &&
          (route.name === 'Experiences' ||
            route.name === 'Perfil' ||
            route.name === 'QR'); // keep/remove QR depending on your rules

        return {
          headerShown: false,

          tabBarIcon: ({color}) => {
            let iconName;
            switch (route.name) {
              case 'GPS':
                iconName = 'location-outline';
                break;
              case 'Feed':
                iconName = 'restaurant-outline';
                break;
              case 'QR':
                iconName = 'scan-circle-outline';
                break;
              case 'Experiences':
                iconName = 'sparkles-outline';
                break;
              case 'Perfil':
                iconName = 'person-circle-outline';
                break;
              default:
                iconName = 'ellipse-outline';
            }

            //hace grises los inactivos
            const iconColor = locked ? '#b5b5b5' : color;

            return (
              <View
                style={{
                  width: 100,
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 100,
                }}>
                <Ionicons name={iconName} size={35} color={iconColor} />
              </View>
            );
          },

          tabBarActiveTintColor: '#007aff',
          tabBarInactiveTintColor: 'gray',

          tabBarStyle: {
            height: 100,
            paddingTop: 10,
            marginBottom: 1,
          },

          tabBarLabelStyle: {
            fontSize: 12,
            paddingTop: 10,
          },
        };
      }}>
      <Tab.Screen name="GPS" component={GPSStackScreen} />
      <Tab.Screen name="Feed" component={FeedStackScreen} />

      {/* To pass isGuest into stacks, use children */}
      <Tab.Screen name="QR">
        {() => <QRStackScreen isGuest={isGuest} />}
      </Tab.Screen>

      <Tab.Screen
        name="Experiences"
        listeners={({navigation}) => ({
          tabPress: e => {
            e.preventDefault();

            const state = navigation.getState();
            const experiencesRoute = state.routes.find(
              route => route.name === 'Experiences',
            );

            const nestedKey = experiencesRoute?.state?.key;

            if (nestedKey) {
              navigation.dispatch({
                ...StackActions.popToTop(),
                target: nestedKey,
              });
            }

            navigation.navigate('Experiences', {
              screen: 'ExperiencesMain',
            });
          },
        })}>
        {() => <ExperiencesStackScreen isGuest={isGuest} />}
      </Tab.Screen>

      <Tab.Screen name="Perfil">
        {() => <ProfileStackScreen isGuest={isGuest} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
