import React, {createContext, useContext, useReducer} from 'react';

const NotificationContext = createContext(null);

const initialNotifications = [
  {id: 'n1', text: 'Tu reserva en La Pizzería fue confirmada.', read: false},
  {
    id: 'n2',
    text: 'Nueva oferta: 20% de descuento en Sushi Place.',
    read: false,
  },
  {
    id: 'n3',
    text: 'Recuerda calificar tu última visita a Café Central.',
    read: true,
  },
];

function reducer(state, action) {
  switch (action.type) {
    case 'MARK_ALL_READ':
      return state.map(n => ({...n, read: true}));

    case 'MARK_ONE_READ':
      return state.map(n => (n.id === action.id ? {...n, read: true} : n));

    default:
      return state;
  }
}

export function NotificationProvider({children}) {
  const [notifications, dispatch] = useReducer(reducer, initialNotifications);

  return (
    <NotificationContext.Provider value={{notifications, dispatch}}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      'useNotifications must be used inside NotificationProvider',
    );
  }
  return ctx;
}
