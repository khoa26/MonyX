from neo4j import GraphDatabase
from typing import List, Dict, Any, Optional
from app.core.config import settings

class Neo4jClient:
    def __init__(self):
        self._driver = None

    def connect(self):
        """Khởi tạo kết nối driver tới Neo4j"""
        if not self._driver:
            self._driver = GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
            )

    def close(self):
        """Đóng driver khi tắt ứng dụng"""
        if self._driver:
            self._driver.close()
            self._driver = None

    def execute_query(self, query: str, parameters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Thực thi câu lệnh Cypher và trả về kết quả dưới dạng List các Dict
        """
        if not self._driver:
            self.connect()
            
        with self._driver.session() as session:
            result = session.run(query, parameters or {})
            return [record.data() for record in result]

    def execute_write_transaction(self, query: str, parameters: Optional[Dict[str, Any]] = None) -> Any:
        """
        Thực thi transaction ghi dữ liệu
        """
        if not self._driver:
            self.connect()

        def _tx(tx):
            res = tx.run(query, parameters or {})
            return [record.data() for record in res]

        with self._driver.session() as session:
            return session.execute_write(_tx)

# Tạo singleton instance dùng chung toàn app
db_client = Neo4jClient()