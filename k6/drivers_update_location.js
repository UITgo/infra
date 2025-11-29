import http from 'k6/http';
import { check, sleep } from 'k6';

// ===== CONFIG =====
// TODO: Paste your JWT token here (get from login response)
const TOKEN = 'YOUR_JWT_TOKEN_HERE';

// Gateway base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3004';

// Fake driver IDs (simulate multiple drivers)
const DRIVER_IDS = [
  'driver-001',
  'driver-002',
  'driver-003',
  'driver-004',
  'driver-005',
  'driver-006',
  'driver-007',
  'driver-008',
  'driver-009',
  'driver-010',
];

// Test options
export const options = {
  vus: parseInt(__ENV.VUS || '50'),
  duration: __ENV.DURATION || '1m',
  thresholds: {
    http_req_duration: ['p(95)<50'], // 95% of requests should be below 50ms
    http_req_failed: ['rate<0.01'], // Error rate should be less than 1%
  },
};

// Ho Chi Minh City center coordinates
const HCM_CENTER = { lat: 10.8231, lng: 106.6297 };

function randomLocationAroundHCM() {
  // Random offset within ~10km radius
  const offsetLat = (Math.random() - 0.5) * 0.1; // ~10km
  const offsetLng = (Math.random() - 0.5) * 0.1;
  return {
    lat: HCM_CENTER.lat + offsetLat,
    lng: HCM_CENTER.lng + offsetLng,
  };
}

export default function () {
  // Random driver ID
  const driverId = DRIVER_IDS[Math.floor(Math.random() * DRIVER_IDS.length)];
  const location = randomLocationAroundHCM();

  const payload = JSON.stringify({
    lat: location.lat,
    lng: location.lng,
    speed: Math.random() * 60 + 20, // 20-80 km/h
    heading: Math.floor(Math.random() * 360), // 0-359 degrees
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
  };

  const res = http.put(
    `${BASE_URL}/api/v1/drivers/${driverId}/location`,
    payload,
    params,
  );

  check(res, {
    'status is 200 or 202': (r) => r.status === 200 || r.status === 202,
    'latency < 50ms': (r) => r.timings.duration < 50,
    'response indicates success': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.ingested === true || body.driverId !== undefined;
      } catch {
        return false;
      }
    },
  });

  sleep(0.5); // 0.5 second between requests (higher frequency for location updates)
}

