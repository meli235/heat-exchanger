/**
 * ─── THERMODYNAMIC & HEAT EXCHANGER CALCULATIONS ───
 * Modul kalkulasi rumus termodinamika murni untuk sistem Double Pipe / Shell & Tube Heat Exchanger.
 */

// Konstanta Termodinamika Air (Spesific Heat Capacity Water at standard lab conditions)
export const CP_WATER = 4184; // J/(kg·°C) or J/(kg·K)
export const DENSITY_WATER = 1.0; // kg/L (1 L/min = 1/60 kg/s)

/**
 * Menghitung Log Mean Temperature Difference (LMTD)
 * @param thi Suhu Hot Inlet (°C)
 * @param tho Suhu Hot Outlet (°C)
 * @param tci Suhu Cold Inlet (°C)
 * @param tco Suhu Cold Outlet (°C)
 * @param isCounter true jika Counter-Current, false jika Co-Current
 * @returns Nilai LMTD dalam °C
 */
export function calculateLMTD(
  thi: number,
  tho: number,
  tci: number,
  tco: number,
  isCounter: boolean
): number {
  const dt1 = isCounter ? thi - tco : thi - tci;
  const dt2 = isCounter ? tho - tci : tho - tco;

  // Jika selisih mendekati 0 untuk mencegah pembagian dengan 0
  if (Math.abs(dt1 - dt2) < 0.1) {
    return Math.max(0.01, dt1);
  }

  const ratio = Math.max(0.01, dt1) / Math.max(0.01, dt2);
  if (ratio <= 0 || isNaN(ratio)) {
    return 0;
  }

  const lmtd = (dt1 - dt2) / Math.log(ratio);
  return isNaN(lmtd) ? 0 : Math.abs(lmtd);
}

/**
 * Menghitung Laju Perpindahan Kalor (Heat Duty Q)
 * Q = m_dot * Cp * deltaT
 * @param flowRateLpm Laju alir volumetrik (Liter/menit)
 * @param deltaT Selisih suhu fluida (°C)
 * @param cp Kapasitas kalor jenis (J/kg·°C), default air = 4184
 * @returns Nilai Kalor Q dalam Watt (J/s)
 */
export function calculateHeatDuty(
  flowRateLpm: number,
  deltaT: number,
  cp: number = CP_WATER
): number {
  // Konversi L/min ke kg/s: flowRateLpm / 60
  const massFlowKgPerSec = (Math.max(0, flowRateLpm) * DENSITY_WATER) / 60;
  const qWatts = massFlowKgPerSec * cp * Math.abs(deltaT);
  return isNaN(qWatts) ? 0 : qWatts;
}

/**
 * Menghitung Koefisien Perpindahan Kalor Menyeluruh (Overall Heat Transfer Coefficient, U)
 * U = Q / (A * LMTD)
 * @param qWatts Laju perpindahan panas Q (Watt)
 * @param areaM2 Luas permukaan perpindahan panas A (m^2)
 * @param lmtd Log Mean Temperature Difference (°C)
 * @returns Nilai U dalam W/(m^2·°C)
 */
export function calculateOverallHeatTransferCoeff(
  qWatts: number,
  areaM2: number,
  lmtd: number
): number {
  if (areaM2 <= 0 || lmtd <= 0) return 0;
  const u = qWatts / (areaM2 * lmtd);
  return isNaN(u) ? 0 : u;
}

/**
 * Menghitung Efisiensi Termal / Heat Balance Exchanger
 * Efisiensi (%) = (Q_cold / Q_hot) * 100%
 * @param qCold Kalor yang diserap fluida dingin (Watt)
 * @param qHot Kalor yang dilepas fluida panas (Watt)
 * @returns Efisiensi dalam persen (0 - 100%)
 */
export function calculateThermalEfficiency(qCold: number, qHot: number): number {
  if (qHot <= 0) return 0;
  const efficiency = (qCold / qHot) * 100;
  return isNaN(efficiency) ? 0 : Math.min(100, Math.max(0, efficiency));
}

/**
 * Menghitung Penurunan Tekanan (Pressure Drop Delta P)
 * @param pInlet Tekanan Inlet (atm-g / bar)
 * @param pOutlet Tekanan Outlet (atm-g / bar)
 * @returns Delta P (atm-g / bar)
 */
export function calculatePressureDrop(pInlet: number, pOutlet: number): number {
  const delta = Math.abs(pInlet - pOutlet);
  return Number(delta.toFixed(2));
}

/**
 * Algoritma Penyesuaian Otomatis Parameter Operasi (Auto-Control Tuning)
 * @param targetTemp Target suhu setpoint (°C)
 * @returns Parameter bukaan servo dan katup aliran yang dihitung
 */
export function calculateAutoControlParameters(targetTemp: number): {
  autoServo: number;
  autoFc1: number;
  autoFc2: number;
} {
  // 1. Hitung sudut servo optimal berdasarkan target suhu (15° - 90°)
  const autoServo = Math.round(Math.min(90, Math.max(15, (targetTemp / 90) * 75)));

  // 2. Hitung bukaan katup optimal:
  // Bukaan katup air panas tetap 85% untuk perendaman optimal heater
  const autoFc1 = 85;
  // Bukaan katup air dingin disesuaikan secara dinamis (40% - 90%)
  const autoFc2 = Math.round(Math.min(90, Math.max(40, 100 - (targetTemp / 90) * 45)));

  return { autoServo, autoFc1, autoFc2 };
}
