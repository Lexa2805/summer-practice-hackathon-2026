"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase";

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await getSupabaseBrowserClient().auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function loginWithEmail(email: string, password: string) {
  const { data, error } = await getSupabaseBrowserClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function sendPasswordResetEmail(email: string, redirectTo: string) {
  const { data, error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
  return data;
}

export async function updatePassword(password: string) {
  const { data, error } = await getSupabaseBrowserClient().auth.updateUser({ password });
  if (error) throw error;
  return data;
}

export async function logout() {
  const { error } = await getSupabaseBrowserClient().auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data, error } = await getSupabaseBrowserClient().auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getCurrentUser() {
  const { data, error } = await getSupabaseBrowserClient().auth.getUser();
  if (error) throw error;
  return data.user;
}
