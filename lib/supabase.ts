import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

// SecureStore adapter for Supabase
const asyncStorage = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key)
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value)
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key)
  },
}

// Replace with your Supabase URL and anon key
const supabaseUrl = 'https://jqaleylprugxtowbuljw.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxYWxleWxwcnVneHRvd2J1bGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2ODEyNTYsImV4cCI6MjA2MjI1NzI1Nn0.MKB06DUxPvFqxSDKt7_XUOCZ3DJZGxGx4qll_snuunU'

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  localStorage: asyncStorage,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false
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
