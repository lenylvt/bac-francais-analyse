import { account } from "./config";
import { ID } from "appwrite";

export interface AuthUser {
  $id: string;
  email: string;
  name: string;
  phone: string;
}

/**
 * Send OTP to email
 */
export async function sendOTP(email: string): Promise<string> {
  try {
    console.log("📧 Sending OTP to:", email);
    const token = await account.createEmailToken(ID.unique(), email);
    console.log("✅ OTP sent successfully, userId:", token.userId);
    return token.userId;
  } catch (error: any) {
    console.error("❌ Error sending OTP:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      type: error.type,
    });
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
    console.log("🔐 Verifying OTP for userId:", userId);
    await account.createSession(userId, otp);
    console.log("✅ Session created successfully");
    const user = await account.get();
    console.log("✅ User authenticated:", user.email);
    return {
      $id: user.$id,
      email: user.email,
      name: user.name,
      phone: user.phone,
    };
  } catch (error: any) {
    console.error("❌ Error verifying OTP:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      type: error.type,
    });
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
    console.log("👤 Current user:", user.email);
    return {
      $id: user.$id,
      email: user.email,
      name: user.name,
      phone: user.phone,
    };
  } catch (error: any) {
    console.log("ℹ️ No authenticated user");
    return null;
  }
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  try {
    console.log("🚪 Logging out...");
    await account.deleteSession("current");
    console.log("✅ Logged out successfully");
  } catch (error: any) {
    console.error("❌ Error logging out:", error);
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
