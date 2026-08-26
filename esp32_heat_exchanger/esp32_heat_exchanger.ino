#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ArduinoJson.h>
#include <Adafruit_ADS1X15.h>

// ============================================================================
// 1. KREDENSIAL & KONFIGURASI SUPABASE TERBARU
// ============================================================================
const char* WIFI_SSID     = "Orange Bakeri"; 
const char* WIFI_PASSWORD = "ChatEva1Yosep2";
String SUPABASE_URL       = "https://kkxfbjpbaxnmgsnxrbpj.supabase.co";
String SUPABASE_KEY       = "sb_secret_oXE1SgqHQS1TrYPfa9SCmw_plDrix1H";

// ============================================================================
// 2. DEFINISI PIN AKTUATOR, I2C, DS18B20 & FLOW SENSORS
// ============================================================================
#define PIN_FLOW_CONTROL 26  // Relay Mode Aliran (Co-Current / Counter-Current)
#define PIN_HEATER_1     12  // Relay Pemanas 1 (Active LOW)
#define PIN_HEATER_2     14  // Relay Pemanas 2 (Active LOW)
#define PIN_AIR_DINGIN   13  // Relay Katup Air Dingin (Active LOW)
#define PIN_UAP          5   // Relay Katup Uap (Active LOW)
#define PIN_FLOW_1       18  // Pin Digital Water Flow Sensor 1 (YF-B1)
#define PIN_FLOW_2       19  // Pin Digital Water Flow Sensor 2 (YF-B1)
#define PIN_DS18B20      15  // Pin OneWire Bus 4x Sensor Suhu DS18B20

const int I2C_SDA = 22;
const int I2C_SCL = 21;

// Sensor Suhu Dallas DS18B20
OneWire oneWire(PIN_DS18B20);
DallasTemperature sensors(&oneWire);

DeviceAddress addr_T1 = { 0x28, 0x92, 0x37, 0x6C, 0x00, 0x00, 0x00, 0x96 };
DeviceAddress addr_T2 = { 0x28, 0xCA, 0x78, 0x6C, 0x00, 0x00, 0x00, 0x9F };
DeviceAddress addr_T3 = { 0x28, 0xB5, 0x85, 0x6B, 0x00, 0x00, 0x00, 0xEF };
DeviceAddress addr_T4 = { 0x28, 0x37, 0xC7, 0x69, 0x00, 0x00, 0x00, 0x06 };

LiquidCrystal_I2C lcd(0x27, 16, 2);
Adafruit_ADS1115 ads; // Alamat 0x48

// Variabel Suhu
float t1 = 25.0, t2 = 25.0, t3 = 25.0, t4 = 25.0;

// Variabel Tekanan Pasangan 1 & 2 (4 Channel ADS1115)
float pressureInlet1 = 0.00;
float pressureOutlet1 = 0.00;
float deltaPressure1 = 0.00;
float pressureInlet2 = 0.00;
float pressureOutlet2 = 0.00;
float deltaPressure2 = 0.00;

// Variabel Flow Rate 1 & 2 (YF-B1)
volatile long pulseCount1 = 0;
volatile long pulseCount2 = 0;
float flowRate1 = 0.00; // L/min
float flowRate2 = 0.00; // L/min
unsigned long oldTime = 0;

// Variabel Kontrol dari Supabase
String controlMode = "MANUAL";  
String flowMode    = "COUNTER"; 
float targetTemp   = 50.0;      
float targetFlow   = 2.0;       

bool webHeaterCmd    = false;
bool webUapCmd       = false;
bool webAirDinginCmd = false;

bool h1ActualState = false, h2ActualState = false;
String warningStatus = "NORMAL";
unsigned long lastSyncTime = 0;
const long syncInterval = 3000; // Synchronize every 3 seconds

// Fungsi Interrupt untuk Flow Sensor 1 & 2
void IRAM_ATTR pulseCounter1() { pulseCount1++; }
void IRAM_ATTR pulseCounter2() { pulseCount2++; }

void updateLCD() {
  lcd.setCursor(0, 0);
  lcd.print("T1:"); lcd.print((int)t1);
  lcd.print("C M:"); lcd.print(flowMode.substring(0, 3));
  lcd.print(" ");

  lcd.setCursor(0, 1);
  lcd.print("F1:"); lcd.print(flowRate1, 1);
  lcd.print(" P1:"); lcd.print(pressureInlet1, 1);
  lcd.print("a ");
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n[INIT] Memulai ESP32 Heat Exchanger Controller (2 Flow & 4 Pressure Channel)...");

  // Setup Pin Flow Sensors
  pinMode(PIN_FLOW_1, INPUT_PULLUP);
  pinMode(PIN_FLOW_2, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_FLOW_1), pulseCounter1, FALLING);
  attachInterrupt(digitalPinToInterrupt(PIN_FLOW_2), pulseCounter2, FALLING);

  // Inisialisasi Relay (Active LOW -> HIGH = OFF)
  pinMode(PIN_FLOW_CONTROL, OUTPUT);
  pinMode(PIN_HEATER_1, OUTPUT);
  pinMode(PIN_HEATER_2, OUTPUT);
  pinMode(PIN_AIR_DINGIN, OUTPUT);
  pinMode(PIN_UAP, OUTPUT);

  digitalWrite(PIN_FLOW_CONTROL, HIGH);
  digitalWrite(PIN_HEATER_1, HIGH);
  digitalWrite(PIN_HEATER_2, HIGH);
  digitalWrite(PIN_AIR_DINGIN, HIGH);
  digitalWrite(PIN_UAP, HIGH);

  // Mulai komunikasi I2C (SCL 21, SDA 22)
  Wire.begin(I2C_SDA, I2C_SCL);

  lcd.init(); lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Heat Exchanger");
  lcd.setCursor(0, 1);
  lcd.print("Connecting WiFi");

  // Inisialisasi ADS1115 (0x48)
  if (!ads.begin(0x48)) {
    Serial.println("[WARNING] ADS1115 (0x48) tidak terdeteksi!");
  } else {
    Serial.println("[SUCCESS] ADS1115 (0x48) Siap!");
  }
  ads.setGain(GAIN_ONE); // Range +/- 4.096V

  sensors.begin(); sensors.setResolution(10);

  // Koneksi WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Menghubungkan ke WiFi");
  while (WiFi.status() != WL_CONNECTED) { 
    delay(500); 
    Serial.print(".");
  }
  Serial.println("\n[SUCCESS] WiFi Terhubung!");
  lcd.clear();
  lcd.print("WiFi Connected!");
  delay(1000);
}

void readSensors() {
  // 1. Baca Sensor Suhu DS18B20 dengan Fallback Index
  sensors.requestTemperatures();
  float readT1 = sensors.getTempC(addr_T1);
  float readT2 = sensors.getTempC(addr_T2);
  float readT3 = sensors.getTempC(addr_T3);
  float readT4 = sensors.getTempC(addr_T4);

  if (readT1 > -50.0 && readT1 < 125.0) t1 = readT1;
  else { float idx0 = sensors.getTempCByIndex(0); if (idx0 > -50.0 && idx0 < 125.0) t1 = idx0; }

  if (readT2 > -50.0 && readT2 < 125.0) t2 = readT2;
  else { float idx1 = sensors.getTempCByIndex(1); if (idx1 > -50.0 && idx1 < 125.0) t2 = idx1; }

  if (readT3 > -50.0 && readT3 < 125.0) t3 = readT3;
  else { float idx2 = sensors.getTempCByIndex(2); if (idx2 > -50.0 && idx2 < 125.0) t3 = idx2; }

  if (readT4 > -50.0 && readT4 < 125.0) t4 = readT4;
  else { float idx3 = sensors.getTempCByIndex(3); if (idx3 > -50.0 && idx3 < 125.0) t4 = idx3; }

  // 2. Hitung Flow Rate 1 & 2 (Pin 18 & 19)
  unsigned long currentTime = millis();
  if (currentTime - oldTime >= 1000) {
    detachInterrupt(PIN_FLOW_1);
    detachInterrupt(PIN_FLOW_2);
    flowRate1 = ((1000.0 / (currentTime - oldTime)) * pulseCount1) / 7.5;
    flowRate2 = ((1000.0 / (currentTime - oldTime)) * pulseCount2) / 7.5;
    pulseCount1 = 0;
    pulseCount2 = 0;
    oldTime = millis();
    attachInterrupt(digitalPinToInterrupt(PIN_FLOW_1), pulseCounter1, FALLING);
    attachInterrupt(digitalPinToInterrupt(PIN_FLOW_2), pulseCounter2, FALLING);
  }

  // 3. Baca 4 Channel Sensor Tekanan ADS1115 (A0..A3)
  int16_t adcIn1  = ads.readADC_SingleEnded(0); // A0 -> Inlet 1
  int16_t adcOut1 = ads.readADC_SingleEnded(1); // A1 -> Outlet 1
  int16_t adcIn2  = ads.readADC_SingleEnded(2); // A2 -> Inlet 2
  int16_t adcOut2 = ads.readADC_SingleEnded(3); // A3 -> Outlet 2

  pressureInlet1  = ads.computeVolts(adcIn1) * 5.00;
  pressureOutlet1 = ads.computeVolts(adcOut1) * 5.00;
  pressureInlet2  = ads.computeVolts(adcIn2) * 5.00;
  pressureOutlet2 = ads.computeVolts(adcOut2) * 5.00;

  deltaPressure1 = pressureInlet1 - pressureOutlet1;
  if (deltaPressure1 < 0) deltaPressure1 = 0.00;
  deltaPressure2 = pressureInlet2 - pressureOutlet2;
  if (deltaPressure2 < 0) deltaPressure2 = 0.00;
}

void executeControlLogic() {
  // 1. Logika Interlock Co-Current & Counter-Current (Relay Active LOW)
  if (flowMode == "CO-CURRENT") {
    digitalWrite(PIN_FLOW_CONTROL, LOW);
    Serial.println(" [RELAY] Mode: CO-CURRENT (Pin 26 LOW)");
  } else {
    digitalWrite(PIN_FLOW_CONTROL, HIGH);
    Serial.println(" [RELAY] Mode: COUNTER-CURRENT (Pin 26 HIGH)");
  }

  // 2. Safety & Warning Check
  if (pressureInlet1 > 2.0 || t1 > 65.0 || t2 > 65.0) {
    warningStatus = "WARN_BKA_UAP";
    h1ActualState = false; h2ActualState = false;
  } else {
    warningStatus = "NORMAL";
    if (controlMode == "AUTO") {
      float tempDiff = targetTemp - t2;
      h1ActualState = (tempDiff > 0.0);
      h2ActualState = (tempDiff > 3.0);
    } else {
      h1ActualState = webHeaterCmd;
      h2ActualState = webHeaterCmd;
    }
  }

  digitalWrite(PIN_HEATER_1, h1ActualState ? LOW : HIGH);
  digitalWrite(PIN_HEATER_2, h2ActualState ? LOW : HIGH);
  digitalWrite(PIN_UAP, webUapCmd ? LOW : HIGH);
  digitalWrite(PIN_AIR_DINGIN, webAirDinginCmd ? LOW : HIGH);
}

void sendDataToSupabase() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String endpointSend = SUPABASE_URL + "/rest/v1/telemetry_data";
  
  if (http.begin(client, endpointSend)) {
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", "Bearer " + SUPABASE_KEY);
    
    StaticJsonDocument<512> docSend;
    docSend["temp_1"] = t1; 
    docSend["temp_2"] = t2;
    docSend["temp_3"] = t3; 
    docSend["temp_4"] = t4;
    docSend["pressure"] = pressureInlet1; 
    docSend["pressure_outlet"] = pressureOutlet1;
    docSend["delta_pressure"] = deltaPressure1;
    docSend["pressure_inlet_2"] = pressureInlet2;
    docSend["pressure_outlet_2"] = pressureOutlet2;
    docSend["delta_pressure_2"] = deltaPressure2;
    docSend["flow_rate"] = flowRate1; 
    docSend["flow_rate_2"] = flowRate2; 
    docSend["heater_status"] = (h1ActualState || h2ActualState) ? "ON" : "OFF";
    docSend["warning_status"] = warningStatus;
    
    String jsonString; 
    serializeJson(docSend, jsonString);
    int postCode = http.POST(jsonString); 
    if (postCode > 0 && postCode < 300) {
      Serial.println("[TELEMETRY] Data Sensor Berhasil Dikirim ke Supabase!");
    } else {
      Serial.print("[ERROR] Gagal POST Telemetri, HTTP: ");
      Serial.println(postCode);
    }
    http.end();
  }
}

void fetchControlsFromSupabase() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String endpointGet = SUPABASE_URL + "/rest/v1/device_controls?id=eq.1";
  
  if (http.begin(client, endpointGet)) {
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", "Bearer " + SUPABASE_KEY);
    http.setTimeout(3000);

    int httpCode = http.GET();
    if (httpCode == 200) {
      String payload = http.getString();
      StaticJsonDocument<1024> docGet;
      DeserializationError err = deserializeJson(docGet, payload);
      if (!err && docGet.size() > 0) {
        JsonObject obj = docGet[0];
        if (obj.containsKey("control_mode") && !obj["control_mode"].isNull()) {
          controlMode = obj["control_mode"].as<String>();
        }
        if (obj.containsKey("flow_mode") && !obj["flow_mode"].isNull()) {
          flowMode = obj["flow_mode"].as<String>();
        }
        if (obj.containsKey("target_temp") && !obj["target_temp"].isNull()) {
          targetTemp = obj["target_temp"].as<float>();
        }
        if (obj.containsKey("heater_status") && !obj["heater_status"].isNull()) {
          webHeaterCmd = obj["heater_status"].as<bool>();
        }
        if (obj.containsKey("uap_status") && !obj["uap_status"].isNull()) {
          webUapCmd = obj["uap_status"].as<bool>();
        }
        if (obj.containsKey("air_dingin") && !obj["air_dingin"].isNull()) {
          webAirDinginCmd = obj["air_dingin"].as<bool>();
        }
      }
    }
    http.end();
  }
}

void syncAndExecuteRelays() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Terputus, mencoba menghubungkan ulang...");
    WiFi.reconnect();
    return;
  }

  readSensors();
  fetchControlsFromSupabase();
  executeControlLogic();

  // CETAK KE SERIAL MONITOR
  Serial.println("\n----------------- MONITOR HEAT EXCHANGER (2 FLOW & 4 PRESSURE) -----------------");
  Serial.print(" Flow Rate 1 (Pin 18) : "); Serial.print(flowRate1, 2); Serial.println(" L/min");
  Serial.print(" Flow Rate 2 (Pin 19) : "); Serial.print(flowRate2, 2); Serial.println(" L/min");
  Serial.println(" [PASANGAN 1]");
  Serial.print(" Inlet 1 | Outlet 1 | Delta 1: ");
  Serial.print(pressureInlet1, 2); Serial.print(" / ");
  Serial.print(pressureOutlet1, 2); Serial.print(" / ");
  Serial.println(deltaPressure1, 2);
  Serial.println(" [PASANGAN 2]");
  Serial.print(" Inlet 2 | Outlet 2 | Delta 2: ");
  Serial.print(pressureInlet2, 2); Serial.print(" / ");
  Serial.print(pressureOutlet2, 2); Serial.print(" / ");
  Serial.println(deltaPressure2, 2);
  Serial.println("--------------------------------------------------------------------------------");

  sendDataToSupabase();
  updateLCD();
}

void loop() {
  unsigned long currentMillis = millis();
  if (currentMillis - lastSyncTime >= syncInterval) {
    lastSyncTime = currentMillis;
    syncAndExecuteRelays();
  }
}
