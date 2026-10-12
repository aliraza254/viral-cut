import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDocFromServer,
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { SavedProject } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App with environment variable override or config
const resolvedFirebaseConfig = {
  ...firebaseConfig,
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || firebaseConfig.apiKey || '',
};

const app = getApps().length === 0 ? initializeApp(resolvedFirebaseConfig) : getApp();

// Use specific firestoreDatabaseId configured in config
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

// Strict Firestore error handling specification per integration guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Diagnostic connection test document
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline. Please check network connectivity.');
    }
  }
}
testConnection();

// Google Sign-In (ProvisionFirebase enables Google Login by default)
export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  try {
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  } catch (error) {
    console.error('Google Sign-in error:', error);
    throw error;
  }
}

// Sign-Out
export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-out error:', error);
    throw error;
  }
}

// Listen for auth state changes
export function onAuthUserChanged(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

// Persist a project to Firestore
export async function saveProjectToFirestore(project: SavedProject): Promise<void> {
  let user = auth.currentUser;
  if (!user) {
    // Prompt Google Sign-In if unauthenticated so data is saved under their account
    user = await signInWithGoogle();
  }

  const sanitizedId = (project.id || `proj_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `projects/${sanitizedId}`;
  const projectRef = doc(db, 'projects', sanitizedId);

  const payload: SavedProject = {
    ...project,
    id: sanitizedId,
    userId: user.uid,
  };

  try {
    await setDoc(projectRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Load all projects owned by the currently authenticated user
export async function loadProjectsFromFirestore(): Promise<SavedProject[]> {
  const user = auth.currentUser;
  if (!user) {
    return [];
  }

  const path = 'projects';
  try {
    const q = query(collection(db, 'projects'), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const projects: SavedProject[] = [];
    snapshot.forEach((docSnap) => {
      projects.push(docSnap.data() as SavedProject);
    });
    return projects;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

// Delete a project from Firestore
export async function deleteProjectFromFirestore(id: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Must be signed in to delete a project');
  }

  const sanitizedId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `projects/${sanitizedId}`;
  try {
    await deleteDoc(doc(db, 'projects', sanitizedId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Subscribe to real-time updates for projects
export function subscribeToProjects(callback: (projects: SavedProject[]) => void): () => void {
  let unsubscribeSnapshot: (() => void) | null = null;

  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    // Clean up any existing snapshot listener
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
      unsubscribeSnapshot = null;
    }

    if (!user) {
      callback([]);
      return;
    }

    const path = 'projects';
    const q = query(collection(db, path), where('userId', '==', user.uid));
    unsubscribeSnapshot = onSnapshot(
      q,
      (snapshot) => {
        const projects: SavedProject[] = [];
        snapshot.forEach((docSnap) => {
          projects.push(docSnap.data() as SavedProject);
        });
        callback(projects);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  });

  return () => {
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }
    unsubscribeAuth();
  };
}
