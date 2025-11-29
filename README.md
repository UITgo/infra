# UITGo Infrastructure

Thư mục chứa cấu hình infrastructure cho UITGo, bao gồm Docker Compose và k6 load testing scripts.

## Tổng quan

Infrastructure setup cho UITGo bao gồm:
- **Docker Compose**: Cấu hình để chạy toàn bộ hệ thống local
- **k6 Scripts**: Load testing scripts để đánh giá performance
- **Protos**: gRPC proto files (nếu cần)

## Cách chạy hệ thống local

### Yêu cầu

- Docker >= 20.x
- Docker Compose >= 2.x
- ít nhất 8GB RAM (để chạy tất cả services)

### Bước 1: Khởi động infrastructure

Từ thư mục `infra`, chạy:

```bash
docker compose up
```

Hoặc chạy ở background:

```bash
docker compose up -d
```

Lệnh này sẽ khởi động:

**Infrastructure Services:**
- PostgreSQL (port 5432): Database cho trip data
- MongoDB (port 27017): Database cho user data
- Redis (port 6379): Redis Geo + cache
- Kafka + Zookeeper (ports 9092, 29092): Message broker
- OSRM (port 5000): Routing engine

**Application Services:**
- gateway-service (port 3004): API Gateway
- auth-service (port 3000): Authentication
- user-service (port 3001): User profile
- trip-command-service (port 3002): Trip write operations
- trip-query-service (port 3003): Trip read operations
- driver-stream-hcm (port 8081): Driver stream cho HCM region
- driver-stream-hn (port 8082): Driver stream cho HN region

### Bước 2: Kiểm tra health

Kiểm tra các service đã khởi động thành công:

```bash
# Kiểm tra containers đang chạy
docker ps

# Kiểm tra gateway health
curl http://localhost:3004/healthz

# Kiểm tra trip-command-service
curl http://localhost:3002/healthz

# Kiểm tra trip-query-service
curl http://localhost:3003/healthz

# Kiểm tra driver-stream-hcm
curl http://localhost:8081/healthz

# Xem logs của một service
docker logs <container-name>
# Ví dụ: docker logs driver-stream-hcm
```

### Bước 3: Dừng hệ thống

```bash
# Dừng tất cả services
docker compose down

# Dừng và xóa volumes (xóa data)
docker compose down -v
```

## Load Testing với k6

Các script k6 nằm trong thư mục `k6/`:

- **`trips_create.js`**: Test latency của create trip flow
  - Scenario: 30 VUs, 30s duration
  - Threshold: p95 < 200ms
  
- **`drivers_update_location.js`**: Test throughput của location updates
  - Scenario: 50 VUs, 30s duration
  - Threshold: p95 < 50ms
  
- **`trips_read_cached.js`**: Test read-heavy scenario với cache
  - Scenario: 50 VUs, 30s duration
  - Threshold: p95 < 100ms

### Cách chạy k6

```bash
# Cài đặt k6 (nếu chưa có)
# macOS: brew install k6
# Linux: https://k6.io/docs/getting-started/installation/

# Chạy một script
cd k6
k6 run trips_create.js

# Chạy với custom VUs và duration
k6 run --vus 50 --duration 60s trips_create.js
```

### Xem kết quả

k6 sẽ hiển thị metrics:
- **http_req_duration**: Request duration (p50, p95, p99)
- **http_reqs**: Total requests
- **iterations**: Total iterations
- **vus**: Virtual users

Nếu metrics vượt quá thresholds, test sẽ fail.

## Environment Variables

Các service được cấu hình qua environment variables trong `docker-compose.yml`. Các biến quan trọng:

- **Database URLs**: `PRIMARY_DB_URL`, `READ_DB_URL`, `MONGO_URL`
- **Redis**: `REDIS_URL`, `REDIS_ADDR`
- **Kafka**: `KAFKA_BROKERS`, `KAFKA_TOPIC_LOCATION`
- **Service URLs**: `DRIVER_STREAM_HCM_URL`, `DRIVER_STREAM_HN_URL`
- **JWT**: `JWT_SECRET` (phải match giữa gateway và auth-service)

## Troubleshooting

### Service không start

1. Kiểm tra logs:
   ```bash
   docker logs <container-name>
   ```

2. Kiểm tra ports đã được sử dụng:
   ```bash
   # macOS/Linux
   lsof -i :3004
   
   # Windows
   netstat -ano | findstr :3004
   ```

3. Kiểm tra Docker resources:
   ```bash
   docker stats
   ```

### Database connection errors

1. Đảm bảo PostgreSQL/MongoDB đã start:
   ```bash
   docker ps | grep postgres
   docker ps | grep mongo
   ```

2. Kiểm tra connection string trong environment variables

### Kafka connection errors

1. Đảm bảo Zookeeper đã start trước Kafka
2. Kiểm tra `KAFKA_BROKERS` environment variable

## Cấu trúc thư mục

```
infra/
├── README.md              # File này
├── docker-compose.yml     # Docker Compose configuration
├── k6/                    # k6 load testing scripts
│   ├── README.md
│   ├── trips_create.js
│   ├── drivers_update_location.js
│   └── trips_read_cached.js
└── protos/                # gRPC proto files (nếu cần)
```

## Xem thêm

- **Kiến trúc tổng thể**: Xem [`../architecture/README.md`](../architecture/README.md)
- **Service READMEs**: Xem README của từng service trong workspace
- **k6 Documentation**: https://k6.io/docs/
