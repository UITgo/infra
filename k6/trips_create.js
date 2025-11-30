import http from 'k6/http';
import { check, sleep } from 'k6';

// ===== CONFIG =====
// Lấy JWT từ env khi chạy k6
const TOKEN = __ENV.TOKEN || 'YOUR_JWT_TOKEN_HERE';

// Gateway base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3004';

// Test options
export const options = {
  vus: parseInt(__ENV.VUS || '30'),
  duration: __ENV.DURATION || '1m',
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% dưới 200ms
    http_req_failed: ['rate<0.01'],   // error rate < 1%
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
  const offsetLat = (Math.random() - 0.5) * 0.05;
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
    cityCode: 'HCM',
    note: 'k6 load test trip',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
  };

  const res = http.post(`${BASE_URL}/api/v1/trips`, payload, params);

  // 🔍 DEBUG: log non-2xx responses
  if (res.status !== 200 && res.status !== 201) {
    console.log('ERROR status =', res.status, 'body =', res.body);
  }

  check(res, {
    'status is 201': (r) => r.status === 201,
    'latency < 200ms': (r) => r.timings.duration < 200,
    'response has trip id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return !!body.id;
      } catch {
        return false;
      }
    },
    'status is DRIVER_SEARCHING or NO_DRIVER_AVAILABLE': (r) => {
      try {
        const body = JSON.parse(r.body);
        return (
          body.status === 'DRIVER_SEARCHING' ||
          body.status === 'NO_DRIVER_AVAILABLE'
        );
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}

