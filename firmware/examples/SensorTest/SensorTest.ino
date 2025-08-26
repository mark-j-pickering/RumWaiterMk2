/*
  SensorTest.ino
  RUMWaiter Mk2 Example

  Purpose:
    - Test digital limit switches
    - Print their state over Serial
    - Simple loop with 500ms refresh
*/

const int PIN_LIMIT_TOP    = 7;
const int PIN_LIMIT_BOTTOM = 6;
const int PIN_DOOR         = 5;

void setup() {
  Serial.begin(115200);

  pinMode(PIN_LIMIT_TOP, INPUT_PULLUP);
  pinMode(PIN_LIMIT_BOTTOM, INPUT_PULLUP);
  pinMode(PIN_DOOR, INPUT_PULLUP);

  Serial.println("RUMWaiter Mk2 - Sensor Test starting...");
}

void loop() {
  int top    = digitalRead(PIN_LIMIT_TOP);
  int bottom = digitalRead(PIN_LIMIT_BOTTOM);
  int door   = digitalRead(PIN_DOOR);

  Serial.print("Top: ");
  Serial.print(top == LOW ? "TRIGGERED" : "OPEN");
  Serial.print(" | Bottom: ");
  Serial.print(bottom == LOW ? "TRIGGERED" : "OPEN");
  Serial.print(" | Door: ");
  Serial.println(door == LOW ? "CLOSED" : "OPEN");

  delay(500);
}
