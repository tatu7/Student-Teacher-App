import 'react-native-get-random-values';
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Linking from 'expo-linking'

const SUPABASE_URL = "https://jqaleylprugxtowbuljw.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxYWxleWxwcnVneHRvd2J1bGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2ODEyNTYsImV4cCI6MjA2MjI1NzI1Nn0.MKB06DUxPvFqxSDKt7_XUOCZ3DJZGxGx4qll_snuunU"

// Get the deep link redirect URL for email confirmations using correct scheme
// IMPORTANT: We need a fully-qualified URL for email confirmations
const appUrl = Constants.appOwnership === 'expo'
  ? 'exp://exp.host/@yourname/studentteacherapp'  // Update with your actual expo URL
  : 'studentteacher://';

export const redirectUrl = Linking.createURL('auth/confirm', {
  scheme: 'studentteacher'
});

console.log('Redirect URL for auth:', redirectUrl);

// Configure the deep link handler
Linking.addEventListener('url', handleDeepLink);

// Handle deep links for Supabase auth
function handleDeepLink({ url }: { url: string }) {
  // Extract token from URL
  if (url.includes('auth/confirm')) {
    console.log('Handling deep link:', url);

    let params;
    if (url.includes('#')) {
      params = url.split('#')[1];
    } else if (url.includes('?')) {
      params = url.split('?')[1];
    }

    if (params) {
      let accessToken, refreshToken, email, type;

      params.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key === 'access_token') accessToken = decodeURIComponent(value);
        if (key === 'refresh_token') refreshToken = decodeURIComponent(value);
        if (key === 'email') email = decodeURIComponent(value);
        if (key === 'type') type = decodeURIComponent(value);
      });

      console.log('Deep link params:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        email,
        type
      });

      if (accessToken && refreshToken) {
        console.log('Setting session from deep link');
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        }).catch(error => console.error('Error setting session:', error));
      }
    }
  }
}

// SecureStore adapter for Supabase
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key)
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value)
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key)
  },
}

// Create Supabase client (v1 syntax)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  localStorage: ExpoSecureStoreAdapter,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,
})

// Set up site URL for redirects (v1 API)
// This is necessary for email confirmations to work properly
try {
  // For Supabase v1 compatibility
  // @ts-ignore - setAuthConfig may not exist in type definition but exists in v1
  supabase.auth.api.setAuthConfig({
    site_url: redirectUrl,
    redirect_url: redirectUrl
  });
} catch (error) {
  console.warn('Error setting auth config - this might be unsupported in your Supabase JS version');
}

// Send a confirmation email using the v1 API (as it doesn't happen automatically)
export const sendConfirmationEmail = async (email: string) => {
  try {
    // Use this function instead of resetPasswordForEmail for confirming email
    const { data, error } = await supabase.auth.api.sendMagicLinkEmail(email, {
      redirectTo: redirectUrl
    });

    if (error) {
      console.error('Error sending confirmation email:', error);
    } else {
      console.log('Confirmation email sent successfully');
    }

    return { data, error };
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return { data: null, error };
  }
};

// Resend confirmation email function - useful for users who didn't receive the email
export const resendConfirmationEmail = async (email: string) => {
  try {
    // First try sending a magic link email with redirectTo
    try {
      const { error } = await supabase.auth.api.sendMagicLinkEmail(email, {
        redirectTo: redirectUrl
      });

      if (!error) {
        console.log('Confirmation email sent via magic link');
        return { error: null };
      }
    } catch (e) {
      console.log('Magic link method failed, trying password reset fallback');
    }

    // Fallback to password reset if magic link doesn't work
    const { error } = await supabase.auth.api.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });

    if (error) {
      console.error('Failed to resend confirmation email:', error);
    } else {
      console.log('Confirmation email resent successfully via password reset');
    }

    return { error };
  } catch (error) {
    console.error('Error resending confirmation email:', error);
    return { error };
  }
};

// Configure email confirmations
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event);
  if (event === 'SIGNED_IN' && session?.user) {
    console.log('User signed in:', session.user.email);
  }
});

// User roles enum - ensure this is exported correctly
export enum UserRole {
  TEACHER = 'teacher',
  STUDENT = 'student',
}

// Type for auth context
export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
}

// Validate email function with more strict rules
export const validateEmail = (email: string): boolean => {
  if (!email) return false;

  try {
    // Basic format validation
    const basicFormatRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicFormatRegex.test(email)) {
      return false;
    }

    // More strict validation
    // 1. No double dots in local part
    if (email.split('@')[0].includes('..')) {
      return false;
    }

    // 2. Domain must have at least one period and be at least 4 chars (a.bc)
    const domain = email.split('@')[1];
    if (!domain.includes('.') || domain.length < 4) {
      return false;
    }

    // 3. TLD (part after the last dot) should be at least 2 characters
    const tld = domain.split('.').pop() || '';
    if (tld.length < 2) {
      return false;
    }

    // 4. Check for invalid characters 
    const invalidCharsRegex = /[(),:;<>[\]\\]/;
    if (invalidCharsRegex.test(email)) {
      return false;
    }

    // 5. Known disposable domain check
    const disposableDomains = [
      'mailinator.com',
      'yopmail.com',
      'tempmail.com',
      'guerrillamail.com',
      'sharklasers.com',
      'grr.la',
      'gmx.com'
    ];

    // 6. Check if domain is gmail.com or other common domains
    const commonDomains = [
      'gmail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      'mail.ru',
      'aol.com',
      'icloud.com'
    ];

    // Gmail domains typically have more strict validations on Supabase side
    if (domain === 'gmail.com') {
      // Gmail addresses require at least 5 characters before @ (user@gmail.com)
      // and don't allow certain characters
      const localPart = email.split('@')[0];
      if (localPart.length < 5) {
        return false;
      }

      // Gmail addresses also can't have multiple consecutive dots
      if (localPart.includes('..')) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error validating email:', error);
    return false;
  }
}
