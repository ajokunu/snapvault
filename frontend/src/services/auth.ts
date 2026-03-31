import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from "amazon-cognito-identity-js";
import { config } from "./config";

const userPool = new CognitoUserPool({
  UserPoolId: config.userPoolId,
  ClientId: config.userPoolClientId,
});

// In-memory token storage (never localStorage)
let currentSession: CognitoUserSession | null = null;

export interface AuthState {
  isAuthenticated: boolean;
  email: string | null;
  userId: string | null;
}

export function getAuthState(): AuthState {
  const user = userPool.getCurrentUser();
  if (!user || !currentSession || !currentSession.isValid()) {
    return { isAuthenticated: false, email: null, userId: null };
  }
  const idToken = currentSession.getIdToken();
  return {
    isAuthenticated: true,
    email: idToken.payload.email as string,
    userId: idToken.payload.sub as string,
  };
}

export function getAccessToken(): string | null {
  if (!currentSession || !currentSession.isValid()) return null;
  return currentSession.getAccessToken().getJwtToken();
}

export function getIdToken(): string | null {
  if (!currentSession || !currentSession.isValid()) return null;
  return currentSession.getIdToken().getJwtToken();
}

export async function signIn(
  email: string,
  password: string
): Promise<AuthState> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    user.authenticateUser(authDetails, {
      onSuccess: (session) => {
        currentSession = session;
        resolve(getAuthState());
      },
      onFailure: (err) => {
        reject(new Error(err.message || "Authentication failed"));
      },
      newPasswordRequired: () => {
        reject(new Error("Password change required. Contact admin."));
      },
    });
  });
}

export async function refreshSession(): Promise<boolean> {
  return new Promise((resolve) => {
    const user = userPool.getCurrentUser();
    if (!user) {
      resolve(false);
      return;
    }

    user.getSession(
      (err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session || !session.isValid()) {
          currentSession = null;
          resolve(false);
          return;
        }
        currentSession = session;
        resolve(true);
      }
    );
  });
}

export function signOut(): void {
  const user = userPool.getCurrentUser();
  if (user) {
    user.signOut();
  }
  currentSession = null;
}
