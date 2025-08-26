# Arduino board target
BOARD=arduino:avr:uno

# Default sketch to build (can override at command line: make SKETCH=examples/SensorTest build)
SKETCH=examples/Blink

# Force build artifacts into a local build folder
BUILD_DIR=$(SKETCH)/build

# Compile sketch -> .hex in $(BUILD_DIR)
build:
	arduino-cli compile --fqbn $(BOARD) --build-path $(BUILD_DIR) $(SKETCH)

# Upload sketch to Arduino (update COM port if needed)
upload:
	arduino-cli upload -p COM3 --fqbn $(BOARD) $(SKETCH)

# Clean build folder
clean:
	rm -rf $(BUILD_DIR)
