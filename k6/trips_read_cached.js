import http from 'k6/http';
import { check, sleep } from 'k6';

// ===== CONFIG =====
const TOKEN = __ENV.TOKEN || 'YOUR_JWT_TOKEN_HERE';
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3004';
const TRIP_ID = __ENV.TRIP_ID;

// Test options
export const options = {
  vus: parseInt(__ENV.VUS || '50'),
  duration: __ENV.DURATION || '1m',
  thresholds: {
    http_req_duration: ['p(95)<100'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
  };

  const res = http.get(`${BASE_URL}/api/v1/trips/${TRIP_ID}`, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has trip id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id === TRIP_ID;
      } catch {
        return false;
      }
    },
    'latency < 100ms': (r) => r.timings.duration < 100,
  });

  sleep(0.2); // 0.2 second between requests (high frequency read test)
}

