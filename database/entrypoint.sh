#!/bin/bash
set -e

# Kiểm tra nếu cơ sở dữ liệu neo4j chưa tồn tại trong volume data
if [ ! -d "/data/databases/neo4j" ]; then
    echo "[MonyX DB Init] Cơ sở dữ liệu chưa tồn tại. Đang kiểm tra file dump..."
    if [ -f "/var/lib/neo4j/dumps/neo4j.dump" ]; then
        echo "[MonyX DB Init] Tìm thấy file dump! Đang tự động nạp dữ liệu vào Neo4j..."
        neo4j-admin database load neo4j --from-path=/var/lib/neo4j/dumps --overwrite-destination=true
        echo "[MonyX DB Init] Nạp dữ liệu hoàn tất!"
    else
        echo "[MonyX DB Init] Không tìm thấy file dump. Neo4j sẽ khởi tạo CSDL trống và nạp qua Cypher Seed..."
    fi
else
    echo "[MonyX DB Init] Cơ sở dữ liệu cục bộ đã tồn tại. Bỏ qua bước nạp dump."
fi

# Chuyển quyền điều khiển lại cho entrypoint gốc của Neo4j
exec /startup/docker-entrypoint.sh neo4j