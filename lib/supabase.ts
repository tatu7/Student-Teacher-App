import 'react-native-get-random-values';
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
const SUPABASE_URL = "https://jqaleylprugxtowbuljw.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxYWxleWxwcnVneHRvd2J1bGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2ODEyNTYsImV4cCI6MjA2MjI1NzI1Nn0.MKB06DUxPvFqxSDKt7_XUOCZ3DJZGxGx4qll_snuunU"
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

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  localStorage: ExpoSecureStoreAdapter,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,
})

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
