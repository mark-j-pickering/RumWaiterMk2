// BlinkRawSlow.ino
// Directly toggles Arduino Uno pin 13 (PORTB5) with a crude busy loop delay
// This avoids Arduino's delay() which depends on Timer0 (not yet emulated).

void setup() {
  // Set pin 13 (PORTB5) as output
  DDRB |= (1 << DDB5);
}

void loop() {
  // Set pin 13 HIGH
  PORTB |= (1 << PORTB5);

  // Busy wait to slow down
  for (volatile long i = 0; i < 500000; i++) {
    // waste time
  }

  // Set pin 13 LOW
  PORTB &= ~(1 << PORTB5);

  // Busy wait again
  for (volatile long i = 0; i < 500000; i++) {
    // waste time
  }
}
