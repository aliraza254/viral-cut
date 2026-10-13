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

// Check if Firebase configuration has a valid, non-empty API key
const hasValidConfig = Boolean(
  resolvedFirebaseConfig.apiKey &&
  typeof resolvedFirebaseConfig.apiKey === 'string' &&
  resolvedFirebaseConfig.apiKey.trim() !== '' &&
  resolvedFirebaseConfig.projectId
);

let appInstance: any = null;
let dbInstance: any = null;
let authInstance: any = null;

if (hasValidConfig) {
  try {
    appInstance = getApps().length === 0 ? initializeApp(resolvedFirebaseConfig) : getApp();
    dbInstance = firebaseConfig.firestoreDatabaseId
      ? getFirestore(appInstance, firebaseConfig.firestoreDatabaseId)
      : getFirestore(appInstance);
    authInstance = getAuth(appInstance);
  } catch (initErr) {
    console.warn('[Firebase] Initialization skipped (offline local mode active):', initErr);
    appInstance = null;
    dbInstance = null;
    authInstance = null;
  }
} else {
  console.info('[Firebase] Running in local offline storage mode (no API key configured).');
}

export const db = dbInstance;
export const auth = authInstance;

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
  const currentUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData?.map((provider: any) => ({
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
  if (!dbInstance) return;
  try {
    await getDocFromServer(doc(dbInstance, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline. Please check network connectivity.');
    }
  }
}
if (hasValidConfig && dbInstance) {
  testConnection();
}

// Google Sign-In (ProvisionFirebase enables Google Login by default)
export async function signInWithGoogle(): Promise<User> {
  if (!authInstance) {
    throw new Error('Google Sign-in is not configured. Your projects are safely saved locally on this browser.');
  }
  const provider = new GoogleAuthProvider();
  try {
    const cred = await signInWithPopup(authInstance, provider);
    return cred.user;
  } catch (error) {
    console.error('Google Sign-in error:', error);
    throw error;
  }
}

// Sign-Out
export async function signOutUser(): Promise<void> {
  if (!authInstance) return;
  try {
    await signOut(authInstance);
  } catch (error) {
    console.error('Sign-out error:', error);
    throw error;
  }
}

// Listen for auth state changes
export function onAuthUserChanged(callback: (user: User | null) => void): () => void {
  if (!authInstance) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(authInstance, callback);
}

const LOCAL_PROJECTS_KEY = 'viralcut_offline_projects';

function getLocalProjects(): SavedProject[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_PROJECTS_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalProjects(projects: SavedProject[]) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
    }
  } catch {}
}

// Persist a project to Firestore or local storage
export async function saveProjectToFirestore(project: SavedProject): Promise<void> {
  const sanitizedId = (project.id || `proj_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
  const payload: SavedProject = {
    ...project,
    id: sanitizedId,
    userId: auth?.currentUser?.uid || 'local-user',
  };

  if (!db || !auth) {
    const current = getLocalProjects();
    const filtered = current.filter((p) => p.id !== sanitizedId);
    setLocalProjects([payload, ...filtered]);
    return;
  }

  let user = auth.currentUser;
  if (!user) {
    user = await signInWithGoogle();
  }

  const path = `projects/${sanitizedId}`;
  const projectRef = doc(db, 'projects', sanitizedId);
  payload.userId = user.uid;

  try {
    await setDoc(projectRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Load all projects owned by the user or local storage
export async function loadProjectsFromFirestore(): Promise<SavedProject[]> {
  if (!db || !auth) {
    return getLocalProjects();
  }

  const user = auth.currentUser;
  if (!user) {
    return getLocalProjects();
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

// Delete a project from Firestore or local storage
export async function deleteProjectFromFirestore(id: string): Promise<void> {
  const sanitizedId = id.replace(/[^a-zA-Z0-9_-]/g, '_');

  if (!db || !auth) {
    const current = getLocalProjects();
    setLocalProjects(current.filter((p) => p.id !== sanitizedId));
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error('Must be signed in to delete a project');
  }

  const path = `projects/${sanitizedId}`;
  try {
    await deleteDoc(doc(db, 'projects', sanitizedId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Subscribe to real-time updates for projects
export function subscribeToProjects(callback: (projects: SavedProject[]) => void): () => void {
  if (!db || !auth) {
    callback(getLocalProjects());
    return () => {};
  }

  let unsubscribeSnapshot: (() => void) | null = null;

  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
      unsubscribeSnapshot = null;
    }

    if (!user) {
      callback(getLocalProjects());
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
