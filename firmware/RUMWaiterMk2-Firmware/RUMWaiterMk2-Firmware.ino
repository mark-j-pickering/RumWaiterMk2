/*
  RUMWaiter Mk2 - Main Firmware
  Version: 1.0.0 (skeleton)

  Target Board: Arduino Uno (ATmega328P)

  Pin Mapping (draft, adjust as needed):
    - Motor Driver PWM: D9
    - Motor Driver DIR: D8
    - Limit Switch Top: D7
    - Limit Switch Bottom: D6
    - Door Switch: D5
    - I2C (SDA, SCL): A4, A5
    - Current Sensor (INA226): I2C
    - TOF Distance Sensor (VL53L1X): I2C
    - OLED Display (SSD1306 128x64): I2C
*/

#include <Wire.h>
// #include <Adafruit_SSD1306.h>   // placeholder
// #include <Adafruit_VL53L1X.h>   // placeholder
// #include <Adafruit_INA219.h>    // placeholder

// Pin definitions
const int PIN_MOTOR_PWM   = 9;
const int PIN_MOTOR_DIR   = 8;
const int PIN_LIMIT_TOP   = 7;
const int PIN_LIMIT_BOTTOM= 6;
const int PIN_DOOR        = 5;

// Placeholder state
bool motorRunning = false;

void setup() {
  // Serial for debug
  Serial.begin(115200);

  // Pin setup
  pinMode(PIN_MOTOR_PWM, OUTPUT);
  pinMode(PIN_MOTOR_DIR, OUTPUT);
  pinMode(PIN_LIMIT_TOP, INPUT_PULLUP);
  pinMode(PIN_LIMIT_BOTTOM, INPUT_PULLUP);
  pinMode(PIN_DOOR, INPUT_PULLUP);

  // I2C init
  Wire.begin();

  Serial.println("RUMWaiter Mk2 Firmware starting...");
}

void loop() {
  // Example: check door switch
  if (digitalRead(PIN_DOOR) == LOW) {
    Serial.println("Door closed.");
  } else {
    Serial.println("Door open.");
  }

  // Example: toggle motor direction every 2s
  digitalWrite(PIN_MOTOR_DIR, HIGH);
  analogWrite(PIN_MOTOR_PWM, 180);
  delay(2000);

  digitalWrite(PIN_MOTOR_DIR, LOW);
  analogWrite(PIN_MOTOR_PWM, 180);
  delay(2000);
}
