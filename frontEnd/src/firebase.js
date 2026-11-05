import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// These values identify your Firebase project; they are meant to be in the app and are not secrets.
// Analytics is left out on purpose: it is not needed for phone sign-in and does not run inside the Android WebView.
const firebaseConfig = {
  apiKey: 'AIzaSyD4K57UUFULnUrdQEqyYVFpRdbNNzlFEfs',
  authDomain: 'remopdf-125a.firebaseapp.com',
  projectId: 'remopdf-125a',
  storageBucket: 'remopdf-125a.firebasestorage.app',
  messagingSenderId: '66449479206',
  appId: '1:66449479206:web:5f8c81e4ee7779f193f8e7',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
