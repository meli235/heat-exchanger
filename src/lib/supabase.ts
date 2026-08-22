import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase Credentials Configuration
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kkxfbjpbaxnmgsnxrbpj.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_IzezoiU9oZxnS4LmMONYsg__y3vG6-K';

export function getStoredAnonKey(): string {
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('supabase_anon_key');
    if (localKey && localKey.trim().length > 5) {
      return localKey.trim();
    }
  }
  return DEFAULT_SUPABASE_ANON_KEY;
}

export function createSupabaseClient(url: string = SUPABASE_URL, anonKey?: string): SupabaseClient {
  const keyToUse = (anonKey && anonKey.trim().length > 5) ? anonKey.trim() : getStoredAnonKey();
  return createClient(url, keyToUse, {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  });
}

// Singleton Supabase Client Instance
export let supabase = createSupabaseClient();

export function setSupabaseAnonKey(newKey: string): SupabaseClient {
  const trimmed = newKey.trim();
  if (typeof window !== 'undefined') {
    localStorage.setItem('supabase_anon_key', trimmed);
  }
  supabase = createSupabaseClient(SUPABASE_URL, trimmed);
  return supabase;
}

// Telemetry Data Interface (Read Data Sensor from telemetry_data table)
export interface TelemetryRow {
  id?: number | string;
  created_at?: string;
  temp_1: number;         // Sensor Suhu T1 (°C)
  temp_2: number;         // Sensor Suhu T2 (°C)
  temp_3: number;         // Sensor Suhu T3 (°C)
  temp_4: number;         // Sensor Suhu T4 (°C)
  pressure: number;       // Tekanan (barg)
  flow_rate: number;      // Debit Air (L/min)
  heater_status: string;  // "ON" | "OFF"
  warning_status: string; // "NORMAL" | "WARN_FLOW_HIGH"
}

// Device Controls Interface (Write & Read Control Commands from device_controls table, row id = 1)
export interface DeviceControlsRow {
  id: number;                                 // Row ID = 1
  flow_mode: 'COUNTER' | 'CO-CURRENT';       // Mode Aliran
  control_mode: 'AUTO' | 'MANUAL';           // Control Mode (Auto / Manual)
  heater_status: boolean;                    // Heater Power (true / false)
  target_temp: number;                       // Target Suhu (°C, float)
  servo_angle: number;                       // Sudut Servo (0 - 90 Derajat, int)
  updated_at?: string;
}

// Status Connection Enum
export type SupabaseConnectionStatus = 'ONLINE' | 'OFFLINE' | 'CONNECTING' | 'ERROR';
