'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Code,
  Terminal,
  Cpu,
  Sliders,
  Power,
  RefreshCw,
  Server,
  Activity,
  Zap,
  ArrowRightLeft,
  Lock,
  LogOut,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

interface TelemetryPayload {
  device_id: string;
  firmware: string;
  protocol: string;
  timestamp: string;
  relays: {
    relay_1_heater1: boolean;
    relay_2_heater2: boolean;
    relay_3_sv1_nc: boolean;
    relay_4_sv2_no: boolean;
    relay_5_sv3_nc: boolean;
    relay_6_sv4_no: boolean;
  };
  telemetry: {
    ti1_hot_in: number;
    ti2_hot_out: number;
    ti3_cold_in: number;
    ti4_cold_out: number;
    pi1_hot_in: number;
    pi2_hot_out: number;
    delta_p_hot: number;
    fc1_flow_hot: number;
    fc2_flow_cold: number;
  };
}

export default function DeveloperPortalPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [devEmail, setDevEmail] = useState<string>('dev@uad.ac.id');
  const [devPassword, setDevPassword] = useState<string>('••••••••');

  // Developer Hardware Settings
  const [modbusPort, setModbusPort] = useState<string>('/dev/ttyUSB0');
  const [modbusBaud, setModbusBaud] = useState<number>(9600);
  const [modbusSlaveId, setModbusSlaveId] = useState<number>(1);
  const [mqttEndpoint, setMqttEndpoint] = useState<string>('mqtt://iot.uad.ac.id:1883');
  const [mqttTopic, setMqttTopic] = useState<string>('uad/chemeng/he/telemetry');
  const [mqttConnected, setMqttConnected] = useState<boolean>(true);

  // Manual Relay Overrides (Developer Low-Level Control)
  const [relayHeater1, setRelayHeater1] = useState<boolean>(true);
  const [relayHeater2, setRelayHeater2] = useState<boolean>(true);
  const [relaySv1NC, setRelaySv1NC] = useState<boolean>(false);
  const [relaySv2NO, setRelaySv2NO] = useState<boolean>(true);
  const [relaySv3NC, setRelaySv3NC] = useState<boolean>(false);
  const [relaySv4NO, setRelaySv4NO] = useState<boolean>(true);

  // Sensor Calibration Offsets
  const [tempOffset, setTempOffset] = useState<number>(0.0);
  const [pressOffset, setPressOffset] = useState<number>(0.0);
  const [flowMultiplier, setFlowMultiplier] = useState<number>(1.0);

  // Live Packet Telemetry Stream State
  const [rxPacketCount, setRxPacketCount] = useState<number>(1420);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);
  const [simulatedTime, setSimulatedTime] = useState<string>('');

  useEffect(() => {
    setSimulatedTime(new Date().toLocaleTimeString('id-ID'));
    const interval = setInterval(() => {
      setSimulatedTime(new Date().toLocaleTimeString('id-ID'));
      setRxPacketCount((prev) => prev + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const rawPayload: TelemetryPayload = useMemo(() => {
    const ti1 = parseFloat((65.4 + tempOffset + (Math.random() - 0.5) * 0.2).toFixed(1));
    const ti2 = parseFloat((49.2 + tempOffset + (Math.random() - 0.5) * 0.2).toFixed(1));
    const pi1 = parseFloat((2.20 + pressOffset).toFixed(2));
    const pi2 = parseFloat((1.75 + pressOffset).toFixed(2));

    return {
      device_id: 'HE-RIG-UAD-DEV01',
      firmware: 'v2.5-DualHeater-SV4',
      protocol: 'Modbus-RTU over RS485 (9600 8N1)',
      timestamp: simulatedTime || '12.00.00',
      relays: {
        relay_1_heater1: relayHeater1,
        relay_2_heater2: relayHeater2,
        relay_3_sv1_nc: relaySv1NC,
        relay_4_sv2_no: relaySv2NO,
        relay_5_sv3_nc: relaySv3NC,
        relay_6_sv4_no: relaySv4NO
      },
      telemetry: {
        ti1_hot_in: ti1,
        ti2_hot_out: ti2,
        ti3_cold_in: 27.2,
        ti4_cold_out: 41.8,
        pi1_hot_in: pi1,
        pi2_hot_out: pi2,
        delta_p_hot: parseFloat((pi1 - pi2).toFixed(2)),
        fc1_flow_hot: parseFloat((18.5 * flowMultiplier).toFixed(1)),
        fc2_flow_cold: parseFloat((24.2 * flowMultiplier).toFixed(1))
      }
    };
  }, [simulatedTime, relayHeater1, relayHeater2, relaySv1NC, relaySv2NO, relaySv3NC, relaySv4NO, tempOffset, pressOffset, flowMultiplier]);

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(rawPayload, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggedIn(true);
  };

  // ─── LOGIN SCREEN FOR DEVELOPER PORTAL (LIGHT THEME) ───
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between p-4 md:p-8 font-sans relative">
        <header className="flex justify-between items-center max-w-7xl mx-auto w-full z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center text-purple-700">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                FluidHE <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold border border-purple-200">Dev Portal</span>
              </h1>
              <p className="text-xs text-slate-500">Developer & Hardware Protocol Console</p>
            </div>
          </div>

          <a
            href="http://localhost:3000"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-xs font-semibold text-slate-700 hover:text-purple-700 transition"
          >
            Dashboard Utama <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
          </a>
        </header>

        <main className="max-w-md w-full mx-auto my-auto py-8 z-10">
          <div className="asklepios-card p-8 bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-xl space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 bg-purple-50 border border-purple-100 rounded-2xl text-purple-700 mb-1">
                <Terminal className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Developer Console</h2>
              <p className="text-xs text-slate-500">Pengujian Perangkat Keras & Logika Protokol IoT</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Developer</label>
                <input
                  type="email"
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-800 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kata Sandi / Passcode</label>
                <input
                  type="password"
                  value={devPassword}
                  onChange={(e) => setDevPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-800 font-medium"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-100 text-xs text-purple-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <span>
                  Portal pengujian khusus untuk melihat aliran raw JSON stream, relay GPIO override, serta offset kalibrasi sensor.
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-bold rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
              >
                Masuk ke Console Developer <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </main>

        <footer className="text-center text-xs text-slate-400 z-10 py-2">
          © 2026 Heat Exchanger Control System - Universitas Ahmad Dahlan
        </footer>
      </div>
    );
  }

  // ─── MAIN DEVELOPER DASHBOARD VIEW (LIGHT THEME) ───
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3 flex justify-between items-center no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-xl border border-purple-200 flex items-center justify-center text-purple-700 shadow-sm">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Developer Console <span className="text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 font-extrabold">Light Mode</span>
            </h1>
            <p className="text-xs text-slate-500">Modbus RTU, MQTT Protocol & GPIO Relay Testing</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-600 font-semibold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Rx Packets: {rxPacketCount}</span>
          </div>

          <a
            href="http://localhost:3000"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 rounded-xl border border-slate-200/80 transition"
          >
            Dashboard Utama Lab <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
          </a>

          <button
            onClick={() => setIsLoggedIn(false)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
            title="Keluar"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 space-y-6">

        {/* Top Protocol Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="asklepios-card p-4 bg-white space-y-2 border-l-4 border-l-purple-600">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Modbus RTU / RS485</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                CONNECTED
              </span>
            </div>
            <p className="text-sm font-extrabold text-slate-900 font-mono">{modbusPort}</p>
            <div className="flex justify-between text-xs text-slate-500 font-semibold">
              <span>Baud: {modbusBaud} 8N1</span>
              <span>Slave ID: {modbusSlaveId}</span>
            </div>
          </div>

          <div className="asklepios-card p-4 bg-white space-y-2 border-l-4 border-l-sky-600">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">MQTT Broker Stream</span>
              <button
                onClick={() => setMqttConnected(!mqttConnected)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  mqttConnected ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200'
                }`}
              >
                {mqttConnected ? 'ONLINE' : 'OFFLINE'}
              </button>
            </div>
            <p className="text-sm font-extrabold text-slate-900 font-mono truncate">{mqttEndpoint}</p>
            <div className="text-xs text-slate-500 font-semibold truncate">
              Topic: {mqttTopic}
            </div>
          </div>

          <div className="asklepios-card p-4 bg-white space-y-2 border-l-4 border-l-indigo-600">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Microcontroller MCU</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                ESP32-S3
              </span>
            </div>
            <p className="text-sm font-extrabold text-slate-900">Dual-Heater + 4 Solenoid Rig</p>
            <div className="flex justify-between text-xs text-slate-500 font-semibold">
              <span>Heap Free: 184 KB</span>
              <span>Uptime: 42h 18m</span>
            </div>
          </div>
        </div>

        {/* Center Grid: Manual Relay Overrides & Calibration Offsets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 1. Low-Level Manual Relay GPIO Matrix Override */}
          <div className="asklepios-card p-6 bg-white space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600" /> Manual GPIO Relay Matrix Override
              </h3>
              <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                Low-Level Control
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className={`p-3.5 rounded-2xl border flex justify-between items-center transition ${
                relayHeater1 ? 'bg-orange-50/80 border-orange-200 text-orange-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <div>
                  <p className="font-extrabold text-slate-900">Relay 1: Heater 1</p>
                  <span className="text-[10px] text-slate-500 font-normal">500W Pemanas 1</span>
                </div>
                <button
                  onClick={() => setRelayHeater1(!relayHeater1)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition ${
                    relayHeater1 ? 'bg-orange-600 text-white shadow-sm' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {relayHeater1 ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className={`p-3.5 rounded-2xl border flex justify-between items-center transition ${
                relayHeater2 ? 'bg-orange-50/80 border-orange-200 text-orange-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <div>
                  <p className="font-extrabold text-slate-900">Relay 2: Heater 2</p>
                  <span className="text-[10px] text-slate-500 font-normal">500W Pemanas 2</span>
                </div>
                <button
                  onClick={() => setRelayHeater2(!relayHeater2)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition ${
                    relayHeater2 ? 'bg-orange-600 text-white shadow-sm' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {relayHeater2 ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className={`p-3.5 rounded-2xl border flex justify-between items-center transition ${
                relaySv1NC ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <div>
                  <p className="font-extrabold text-slate-900">Relay 3: SV1 (NC)</p>
                  <span className="text-[10px] text-slate-500 font-normal">Normally Closed</span>
                </div>
                <button
                  onClick={() => setRelaySv1NC(!relaySv1NC)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition ${
                    relaySv1NC ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {relaySv1NC ? 'ACTIVE' : 'IDLE'}
                </button>
              </div>

              <div className={`p-3.5 rounded-2xl border flex justify-between items-center transition ${
                relaySv2NO ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <div>
                  <p className="font-extrabold text-slate-900">Relay 4: SV2 (NO)</p>
                  <span className="text-[10px] text-slate-500 font-normal">Normally Open</span>
                </div>
                <button
                  onClick={() => setRelaySv2NO(!relaySv2NO)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition ${
                    relaySv2NO ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {relaySv2NO ? 'ACTIVE' : 'IDLE'}
                </button>
              </div>

              <div className={`p-3.5 rounded-2xl border flex justify-between items-center transition ${
                relaySv3NC ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <div>
                  <p className="font-extrabold text-slate-900">Relay 5: SV3 (NC)</p>
                  <span className="text-[10px] text-slate-500 font-normal">Normally Closed</span>
                </div>
                <button
                  onClick={() => setRelaySv3NC(!relaySv3NC)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition ${
                    relaySv3NC ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {relaySv3NC ? 'ACTIVE' : 'IDLE'}
                </button>
              </div>

              <div className={`p-3.5 rounded-2xl border flex justify-between items-center transition ${
                relaySv4NO ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <div>
                  <p className="font-extrabold text-slate-900">Relay 6: SV4 (NO)</p>
                  <span className="text-[10px] text-slate-500 font-normal">Normally Open</span>
                </div>
                <button
                  onClick={() => setRelaySv4NO(!relaySv4NO)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition ${
                    relaySv4NO ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {relaySv4NO ? 'ACTIVE' : 'IDLE'}
                </button>
              </div>
            </div>
          </div>

          {/* 2. Sensor Offsets & Calibration Tuning */}
          <div className="asklepios-card p-6 bg-white space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-purple-600" /> Sensor Calibration & Linear Offsets
              </h3>
              <button
                onClick={() => {
                  setTempOffset(0);
                  setPressOffset(0);
                  setFlowMultiplier(1.0);
                }}
                className="text-[11px] text-purple-700 hover:text-purple-900 flex items-center gap-1 font-bold"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Default
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div>
                <div className="flex justify-between text-slate-700 mb-1.5">
                  <span>Temperature Offset (TI1-TI6):</span>
                  <strong className="text-purple-700 font-bold text-sm">{tempOffset > 0 ? `+${tempOffset}` : tempOffset}°C</strong>
                </div>
                <input
                  type="range"
                  min="-5.0"
                  max="5.0"
                  step="0.1"
                  value={tempOffset}
                  onChange={(e) => setTempOffset(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-700 mb-1.5">
                  <span>Pressure Transducer Offset (PI1-PI4):</span>
                  <strong className="text-sky-700 font-bold text-sm">{pressOffset > 0 ? `+${pressOffset}` : pressOffset} bar</strong>
                </div>
                <input
                  type="range"
                  min="-0.5"
                  max="0.5"
                  step="0.01"
                  value={pressOffset}
                  onChange={(e) => setPressOffset(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-700 mb-1.5">
                  <span>Flow Sensor Pulse Multiplier (FC1 & FC2):</span>
                  <strong className="text-emerald-700 font-bold text-sm">{flowMultiplier.toFixed(2)}x</strong>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={flowMultiplier}
                  onChange={(e) => setFlowMultiplier(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Raw JSON Payload Stream Inspector (Clean Code Block) */}
        <div className="asklepios-card p-6 bg-white space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-600" /> Live MQTT/Modbus JSON Payload Stream Inspector
            </h3>
            <button
              onClick={handleCopyJSON}
              className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
            >
              {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedPayload ? 'Salin Berhasil!' : 'Salin JSON Payload'}
            </button>
          </div>

          <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl overflow-x-auto max-h-80 shadow-inner border border-slate-800 leading-relaxed">
            {JSON.stringify(rawPayload, null, 2)}
          </pre>
        </div>

      </main>
    </div>
  );
}
