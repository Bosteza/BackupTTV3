// App.tsx
/*import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

// Pantallas sin barra (Auth)
import SplashScreen from './src/screens/SplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import CreateAccount from './src/screens/CreateAccount';
import Login from './src/screens/Login';
import Cuenta from './src/screens/Cuenta';
import Loading from './src/screens/Loading';
import ForgotPassword from './src/screens/ForgotPassword';

// Pantalla principal con tabs
import Home from './src/screens/Home';
import TermsAndConditions from './src/screens/TermsAndConditions';
import VerificationScreen from './src/screens/VerificacionScreen';

import RestaurantsScreen from './src/screens/Feed';
import RestaurantScreen from './src/screens/RestaurantDetailScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{headerShown: false}}
        initialRouteName="Home" // 👈 ahora arrancamos en Home
      >
        {/* Paso 1: Home vuelve a ser la pantalla inicial }
        <Stack.Screen name="Home" component={Home} />

        {/* Tus pantallas que ya funcionan }
        <Stack.Screen name="Restaurants" component={RestaurantsScreen} />
        <Stack.Screen name="Restaurant" component={RestaurantScreen} />
        <Stack.Screen name="Favorites" component={FavoritesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
} 
*/ // App.tsx
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {NotificationProvider} from './src/screens/NotificationProvider';

// Pantallas sin barra (Auth)
import SplashScreen from './src/screens/SplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import CreateAccount from './src/screens/CreateAccount';
import Login from './src/screens/Login';
import Cuenta from './src/screens/Cuenta';
import Loading from './src/screens/Loading';
import ForgotPassword from './src/screens/ForgotPassword';

// Pantalla principal con tabs
import Home from './src/screens/Home';
import TermsAndConditions from './src/screens/TermsAndConditions';
import VerificationScreen from './src/screens/VerificacionScreen';
import SendEmail from './src/screens/SendEmail';
import ResetPassword from './src/screens/ResetPassword';
import OpenPay from './src/screens/OpenPay';
import {StripeProvider} from '@stripe/stripe-react-native';

//Residence
import CodeResidence from './src/screensRes/CodeResidence';
import HomeResidence from './src/screensRes/HomeResidence';
import SplashResidence from './src/screensRes/SplashResidence';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NotificationProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{headerShown: false, gestureEnabled: false}}>
          {/* Auth screens (sin barra) */}
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="CreateAccount" component={CreateAccount} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Cuenta" component={Cuenta} />
          <Stack.Screen name="Loading" component={Loading} />
          <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
          <Stack.Screen name="Terms" component={TermsAndConditions} />
          <Stack.Screen name="Verificacion" component={VerificationScreen} />
          <Stack.Screen name="SendEmail" component={SendEmail} />
          <Stack.Screen name="ResetPassword" component={ResetPassword} />

          {/* Auth screens Residence */}

          <Stack.Screen name="CodeResidence" component={CodeResidence} />
          <Stack.Screen name="SplashResidence" component={SplashResidence} />

          {/* Main app con barra */}
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen name="HomeResidence" component={HomeResidence} />
        </Stack.Navigator>
      </NavigationContainer>
    </NotificationProvider>
  );
}
