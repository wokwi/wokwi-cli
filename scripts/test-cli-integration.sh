#!/bin/bash
set -e

TEST_PROJECT_DIR="test-project"
TEST_REPO="https://github.com/wokwi/esp-idf-hello-world.git"

# Clone test project if it doesn't exist
if [ ! -d "$TEST_PROJECT_DIR" ]; then
  echo "Cloning test project..."
  git clone "$TEST_REPO" "$TEST_PROJECT_DIR"
else
  echo "Test project already exists, skipping clone..."
fi

# Create test scenario file
cat > "$TEST_PROJECT_DIR/test-scenario.yaml" << 'EOF'
name: "Basic Hello World Test"
version: 1
description: "Test that the ESP32 hello world program outputs expected text"

steps:
  - name: "Wait for boot and hello message"
    wait-serial: "Hello world!"

  - name: "Wait for chip information"
    wait-serial: "This is esp32 chip"

  - name: "Wait for restart message"
    wait-serial: "Restarting in 10 seconds"
EOF

echo "Test scenario file created."

# Check if WOKWI_CLI_TOKEN is set
if [ -z "$WOKWI_CLI_TOKEN" ]; then
  echo "Warning: WOKWI_CLI_TOKEN environment variable is not set."
  echo "Integration tests require a Wokwi API token to run."
  echo "Set WOKWI_CLI_TOKEN environment variable to run these tests."
  exit 1
fi

# Run CLI tests
echo "Running CLI integration tests..."

echo "Test 1: Basic expect-text test"
pnpm cli "$TEST_PROJECT_DIR" --timeout 5000 --expect-text "Hello"

echo "Test 2: Scenario file test"
pnpm cli "$TEST_PROJECT_DIR" --scenario "test-scenario.yaml" --timeout 15000

echo "All CLI integration tests passed!"

