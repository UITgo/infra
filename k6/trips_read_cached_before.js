import http from 'k6/http';
import { check, sleep } from 'k6';

// ===== CONFIG =====
// TODO: Paste your JWT token here (get from login response)
const TOKEN = 'YOUR_JWT_TOKEN_HERE';

// Gateway base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3004';

// TODO: Replace with actual trip ID (create a trip first, then use its ID)
const TRIP_ID = __ENV.TRIP_ID || 'YOUR_TRIP_ID_HERE';

// ===== IMPORTANT =====
// This script tests GET /api/v1/trips/:id WITHOUT Redis cache
// To disable cache in trip-service:
// 1. Comment out RedisModule import in trip-service/src/trips/trips.module.ts
// 2. Comment out RedisService usage in trip-service/src/trips/trips.service.ts (get method)
// 3. Restart trip-service
// OR set environment variable: REDIS_URL="" to disable Redis connection

// Test options
export const options = {
  vus: parseInt(__ENV.VUS || '50'),
  duration: __ENV.DURATION || '1m',
  thresholds: {
    http_req_duration: ['p(95)<100'], // 95% of requests should be below 100ms (expect higher without cache)
    http_req_failed: ['rate<0.01'], // Error rate should be less than 1%
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
    'response has trip data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id === TRIP_ID && body.status !== undefined;
      } catch {
        return false;
      }
    },
    'response time is reasonable': (r) => r.timings.duration < 500,
  });

  sleep(0.2); // 0.2 second between requests (high frequency read test)
}

