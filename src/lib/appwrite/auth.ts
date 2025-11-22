import { account } from "./config";
import { ID } from "appwrite";

export interface AuthUser {
  $id: string;
  email: string;
  name: string;
  phone: string;
  labels?: string[];
}

/**
 * Send OTP to email
 */
export async function sendOTP(email: string): Promise<string> {
  try {
    const token = await account.createEmailToken(ID.unique(), email);
    return token.userId;
  } catch (error: any) {
    throw new Error(
      `Impossible d'envoyer le code OTP: ${error.message || "Vérifiez votre email"}`,
    );
  }
}

/**
 * Verify OTP and create session
 */
export async function verifyOTP(
  userId: string,
  otp: string,
): Promise<AuthUser> {
  try {
    await account.createSession(userId, otp);
    const user = await account.get();
    return {
      $id: user.$id,
      email: user.email,
      name: user.name,
      phone: user.phone,
    };
  } catch (error: any) {
    throw new Error(
      `Code OTP invalide ou expiré: ${error.message || "Réessayez"}`,
    );
  }
}

/**
 * Get current session user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const user = await account.get();
    return {
      $id: user.$id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      labels: user.labels || [],
    };
  } catch (error: any) {
    return null;
  }
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  try {
    await account.deleteSession("current");
  } catch (error: any) {
    throw new Error(`Erreur lors de la déconnexion: ${error.message}`);
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    await account.get();
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if user has admin label
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    return user?.labels?.includes("admin") || false;
  } catch {
    return false;
  }
}
