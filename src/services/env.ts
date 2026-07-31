const firebaseKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const

export const env = {
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  },
  booksApiUrl: import.meta.env.VITE_BOOKS_API_URL,
  catalogSource: import.meta.env.VITE_CATALOG_SOURCE === 'firestore' ? 'firestore' : 'apps-script',
  adminPin: import.meta.env.VITE_ADMIN_PIN || '2468',
  useFirebaseEmulators: import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true',
  acceptanceMode: import.meta.env.VITE_ACCEPTANCE_MODE === 'true',
}

export const missingFirebaseKeys = firebaseKeys.filter((key) => !import.meta.env[key])
export const firebaseConfigured = missingFirebaseKeys.length === 0
export const isDemoMode = !firebaseConfigured
