import http from 'k6/http';
import { check, sleep } from 'k6';

// ===== CONFIG =====
// TODO: Paste your JWT token here (get from login response)
const TOKEN = 'YOUR_JWT_TOKEN_HERE';

// Gateway base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3004';

// Test options
export const options = {
  vus: parseInt(__ENV.VUS || '30'),
  duration: __ENV.DURATION || '1m',
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests should be below 200ms
    http_req_failed: ['rate<0.01'], // Error rate should be less than 1%
  },
};

// Fake locations around Ho Chi Minh City
const HCM_CENTERS = [
  { lat: 10.8231, lng: 106.6297 }, // District 1
  { lat: 10.7626, lng: 106.6602 }, // District 7
  { lat: 10.8412, lng: 106.8098 }, // District 2
  { lat: 10.7769, lng: 106.7009 }, // District 5
];

function randomLocation() {
  const center = HCM_CENTERS[Math.floor(Math.random() * HCM_CENTERS.length)];
  // Add random offset within ~5km radius
  const offsetLat = (Math.random() - 0.5) * 0.05; // ~5km
  const offsetLng = (Math.random() - 0.5) * 0.05;
  return {
    lat: center.lat + offsetLat,
    lng: center.lng + offsetLng,
  };
}

export default function () {
  const origin = randomLocation();
  const destination = randomLocation();

  const payload = JSON.stringify({
    origin: {
      lat: origin.lat,
      lng: origin.lng,
    },
    destination: {
      lat: destination.lat,
      lng: destination.lng,
    },
    note: 'k6 load test trip',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
  };

  const res = http.post(`${BASE_URL}/api/v1/trips`, payload, params);

  check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'latency < 200ms': (r) => r.timings.duration < 200,
    'response has trip id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id !== undefined;
      } catch {
        return false;
      }
    },
  });

  sleep(1); // 1 second between requests
}

