# @wokwi/rfc2217

RFC 2217 (Telnet Com Port Control) server implementation. Enables serial port forwarding over TCP, allowing tools like PySerial and `socat` to connect to simulated devices via `rfc2217://localhost:<port>`.

## Installation

```bash
npm install @wokwi/rfc2217
```

## Usage

```typescript
import { RFC2217Server } from '@wokwi/rfc2217';

const server = new RFC2217Server();

server.on('connected', () => {
  console.log('Client connected');
});

server.on('data', (data) => {
  // Handle incoming serial data from the client
  console.log('Received:', data);
});

server.on('control', ({ dtr, rts }) => {
  console.log('Control signals:', { dtr, rts });
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

server.listen(4000);

// Send data to all connected clients
server.write(0x48); // 'H'

// Clean up
server.dispose();
```

## Connecting

Once the server is listening, connect with any RFC 2217-compatible client:

```bash
# PySerial
python -c "import serial; s = serial.serial_for_url('rfc2217://localhost:4000')"

# socat
socat - TCP:localhost:4000
```

## License

[The MIT License (MIT)](LICENSE)
