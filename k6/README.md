# K6 Load Test Scripts

## Overview

This directory contains K6 load test scripts for testing UITGo services through the API Gateway.

## Scripts

### 1. `trips_create.js`
- **Purpose**: Test POST /api/v1/trips (Create Trip + Find Driver flow)
- **Usage**: 
  ```bash
  k6 run --env TOKEN=your_jwt_token --env BASE_URL=http://localhost:3004 trips_create.js
  ```
- **Metrics**: Tests latency-sensitive flow, expects p(95) < 200ms

### 2. `drivers_update_location.js`
- **Purpose**: Test PUT /api/v1/drivers/:id/location (Driver location updates)
- **Usage**:
  ```bash
  k6 run --env TOKEN=your_jwt_token --env BASE_URL=http://localhost:3004 drivers_update_location.js
  ```
- **Metrics**: Tests throughput-sensitive flow, expects p(95) < 50ms

### 3. `trips_read_cached.js`
- **Purpose**: General test for GET /api/v1/trips/:id
- **Usage**:
  ```bash
  k6 run --env TOKEN=your_jwt_token --env BASE_URL=http://localhost:3004 --env TRIP_ID=trip_123 trips_read_cached.js
  ```

### 4. `trips_read_cached_before.js`
- **Purpose**: Test GET /api/v1/trips/:id **WITHOUT** Redis cache
- **Usage**:
  ```bash
  k6 run --env TOKEN=your_jwt_token --env BASE_URL=http://localhost:3004 --env TRIP_ID=trip_123 trips_read_cached_before.js
  ```
- **Setup**: Disable Redis cache in trip-service before running
  - Comment out RedisModule in `trip-service/src/trips/trips.module.ts`
  - Comment out RedisService usage in `trip-service/src/trips/trips.service.ts` (get method)
  - Or set `REDIS_URL=""` environment variable

### 5. `trips_read_cached_after.js`
- **Purpose**: Test GET /api/v1/trips/:id **WITH** Redis cache enabled
- **Usage**:
  ```bash
  k6 run --env TOKEN=your_jwt_token --env BASE_URL=http://localhost:3004 --env TRIP_ID=trip_123 trips_read_cached_after.js
  ```
- **Setup**: Ensure Redis is running and connected to trip-service

## Cache Comparison Workflow

To demonstrate the impact of Redis cache on GET /trips/:id:

1. **Create a trip first**:
   ```bash
   curl -X POST http://localhost:3004/api/v1/trips \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"origin":{"lat":10.8231,"lng":106.6297},"destination":{"lat":10.7626,"lng":106.6602}}'
   ```
   Note the `id` from the response.

2. **Test WITHOUT cache**:
   ```bash
   # Disable Redis in trip-service, then:
   k6 run --env TOKEN=your_token --env TRIP_ID=your_trip_id trips_read_cached_before.js
   ```
   Expected: Higher latency (p(95) ~100ms), all requests hit Postgres

3. **Test WITH cache**:
   ```bash
   # Enable Redis in trip-service, then:
   k6 run --env TOKEN=your_token --env TRIP_ID=your_trip_id trips_read_cached_after.js
   ```
   Expected: Lower latency (p(95) < 50ms), most requests hit Redis cache

4. **Compare metrics**:
   - `http_req_duration` (p95, p99)
   - `http_req_duration{expected_response:true}` (cache hits)
   - Request rate (requests/second)

## Environment Variables

- `TOKEN`: JWT token from login (required)
- `BASE_URL`: Gateway base URL (default: http://localhost:3004)
- `TRIP_ID`: Trip ID for read tests (required for read scripts)
- `VUS`: Virtual users (default: 30-50)
- `DURATION`: Test duration (default: 1m)

## Example Full Test Run

```bash
# 1. Get JWT token
TOKEN=$(curl -X POST http://localhost:3004/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.accessToken')

# 2. Create a trip
TRIP_ID=$(curl -X POST http://localhost:3004/api/v1/trips \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"origin":{"lat":10.8231,"lng":106.6297},"destination":{"lat":10.7626,"lng":106.6602}}' \
  | jq -r '.id')

# 3. Test without cache
k6 run --env TOKEN=$TOKEN --env TRIP_ID=$TRIP_ID trips_read_cached_before.js

# 4. Test with cache
k6 run --env TOKEN=$TOKEN --env TRIP_ID=$TRIP_ID trips_read_cached_after.js
```

## Notes

- All tests go through the API Gateway (`/api/v1/*`)
- Tests require valid JWT tokens (get from `/api/v1/sessions`)
- For cache comparison, ensure the same trip ID is used in both tests
- Cache TTL is 60 seconds (configured in trip-service)


