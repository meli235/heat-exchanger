// ─── CENTRALIZED APPLICATION TYPES & INTERFACES ───

export type UserRole = 'admin' | 'operator';

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  lastLogin: string;
  isScheduleRestricted?: boolean;
  allowedStartDate?: string; // YYYY-MM-DD
  allowedEndDate?: string;   // YYYY-MM-DD
  allowedDays?: string[];
  allowedStartTime?: string;
  allowedEndTime?: string;
}

export interface TelemetryPoint {
  timestamp: string;
  ti1: number; // Hot Inlet (°C)
  ti2: number; // Hot Outlet (°C - Monitored at Heater 2 Outlet)
  ti3: number; // Cold Inlet (°C)
  ti4: number; // Cold Outlet (°C)
  ti5: number; // Shell Mid 1 (°C)
  ti6: number; // Shell Mid 2 (°C)
  pi1: number; // Hot Inlet Press (atm-g)
  pi2: number; // Hot Outlet Press (atm-g)
  pi3: number; // Cold Inlet Press (atm-g)
  pi4: number; // Cold Outlet Press (atm-g)
  fc1: number; // Hot Flow Rate (L/min)
  fc2: number; // Cold Flow Rate (L/min)
  tc1Setpoint: number; // Target Temp (°C)
  heater1Active: boolean; // Dual Heater 1 Status
  heater2Active: boolean; // Dual Heater 2 Status
  mode: 'Counter-Current' | 'Co-Current';
}

export interface AlarmEvent {
  id: string;
  timestamp: string;
  sensor: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'Critical' | 'Warning' | 'Info';
  acknowledged: boolean;
}

export interface TelemetryRow {
  id?: number | string;
  created_at?: string;
  temp_1: number;         // Sensor Suhu T1 (°C)
  temp_2: number;         // Sensor Suhu T2 (°C)
  temp_3: number;         // Sensor Suhu T3 (°C)
  temp_4: number;         // Sensor Suhu T4 (°C)
  pressure: number;       // Tekanan Inlet 1 (atm-g)
  pressure_outlet?: number; // Tekanan Outlet 1 (atm-g)
  delta_pressure?: number;  // Delta Tekanan 1 (atm-g)
  pressure_inlet_2?: number; // Tekanan Inlet 2 (atm-g)
  pressure_outlet_2?: number;// Tekanan Outlet 2 (atm-g)
  delta_pressure_2?: number; // Delta Tekanan 2 (atm-g)
  flow_rate: number;      // Debit Air 1 (L/min)
  flow_rate_2?: number;   // Debit Air 2 (L/min)
  heater_status: string;  // "ON" | "OFF"
  warning_status: string; // "NORMAL" | "WARN_FLOW_HIGH"
}

export interface DeviceControlsRow {
  id: number;                                // Row ID = 1 (int4)
  updated_at?: string;                       // timestamptz
  control_mode: 'AUTO' | 'MANUAL';           // text
  flow_mode: 'COUNTER' | 'CO-CURRENT';       // text
  heater_status: boolean;                    // bool
  heater_1_status?: boolean;                 // UI extension
  heater_2_status?: boolean;                 // UI extension
  servo_angle: number;                       // int4 (0 - 180)
  target_temp: number;                       // float4
  uap_status?: boolean;                      // bool
  uap_auto_status?: boolean;                 // UI extension
  uap_interval_min?: number;                 // UI extension
  air_dingin?: boolean;                      // bool
  target_flow?: number;                      // numeric
  btn_up?: boolean;                          // bool
  btn_onoff?: boolean;                       // bool
  btn_down?: boolean;                        // bool
}

export type SupabaseConnectionStatus = 'ONLINE' | 'OFFLINE' | 'CONNECTING' | 'ERROR';

export type FlowMode = 'Counter-Current' | 'Co-Current';

export interface DualHeaterState {
  stage?: 'STAGE_1' | 'STAGE_2' | 'SETPOINT_REACHED' | 'STANDBY' | 'OFF' | string;
  powerWatt?: number;
  heater1Active?: boolean;
  heater2Active?: boolean;
  h1?: boolean;
  h2?: boolean;
  dutyCycle?: number;
  note?: string;
  description?: string;
}


export interface TempLabels {
  t1: string;
  t2: string;
  t3: string;
  t4: string;
}

export interface SyncFeedback {
  active: boolean;
  message: string;
  detail: string;
  type: 'syncing' | 'success' | 'idle';
}
