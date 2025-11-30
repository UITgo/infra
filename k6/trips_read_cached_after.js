import http from 'k6/http';
import { check, sleep } from 'k6';

// ===== CONFIG =====
const TOKEN = __ENV.TOKEN || 'YOUR_JWT_TOKEN_HERE';
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3004';
const TRIP_ID = __ENV.TRIP_ID;

// ===== IMPORTANT =====
// This script tests GET /api/v1/trips/:id WITH Redis cache ENABLED
// Make sure:
// 1. Redis is running and connected to trip-service
// 2. RedisModule is imported in trip-service/src/trips/trips.module.ts
// 3. RedisService is used in trip-service/src/trips/trips.service.ts (get method)
// 4. trip-service has REDIS_URL environment variable set

// Test options
export const options = {
  vus: parseInt(__ENV.VUS || '30'),
  duration: __ENV.DURATION || '1m',
  thresholds: {
    http_req_duration: ['p(95)<60'],
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

  // Debug logging for non-2xx responses
  if (res.status < 200 || res.status >= 300) {
    console.log('ERROR status =', res.status, 'body =', res.body);
  }

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has trip id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return !!body.id;
      } catch {
        return false;
      }
    },
  });

  sleep(0.2); // 0.2 second between requests (high frequency read test)
}


