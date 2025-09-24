"""
企业级生产部署系统 - 完整的部署、监控和运维方案
包括Docker容器化、Kubernetes编排、监控告警、日志管理等
"""

import os
import json
import yaml
import time
import logging
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import asyncio

logger = logging.getLogger(__name__)

# ============= 部署配置 =============
@dataclass
class DeploymentConfig:
    """部署配置"""
    environment: str  # dev/staging/production
    replicas: int = 3
    cpu_limit: str = "2"
    memory_limit: str = "4Gi"
    storage_size: str = "100Gi"
    
    # 数据库配置
    db_host: str = "postgres"
    db_port: int = 5432
    db_name: str = "chat_capture"
    
    # Redis配置
    redis_host: str = "redis"
    redis_port: int = 6379
    
    # 监控配置
    prometheus_enabled: bool = True
    grafana_enabled: bool = True
    elk_enabled: bool = True

# ============= Docker配置生成器 =============
class DockerConfigGenerator:
    """Docker配置生成器"""
    
    @staticmethod
    def generate_dockerfile() -> str:
        """生成Dockerfile"""
        return """
# 多阶段构建 - 基础镜像
FROM python:3.11-slim as base

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    curl \
    unzip \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# 安装Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 生产镜像
FROM base as production

# 复制应用代码
COPY quickreply/ /app/quickreply/
COPY *.py /app/

# 创建非root用户
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# 设置环境变量
ENV PYTHONUNBUFFERED=1
ENV DISPLAY=:99

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8080/health')"

# 启动命令
CMD ["python", "-m", "quickreply.production_server"]
"""
    
    @staticmethod
    def generate_docker_compose() -> str:
        """生成docker-compose.yml"""
        return """
version: '3.8'

services:
  # 主应用
  app:
    build:
      context: .
      target: production
    image: quickreply:latest
    container_name: quickreply_app
    restart: unless-stopped
    ports:
      - "8080:8080"
      - "9222-9322:9222-9322"  # CDP端口范围
    environment:
      - ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=chat_capture
      - DB_USER=quickreply
      - DB_PASSWORD=${DB_PASSWORD}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./profiles:/app/profiles
    depends_on:
      - postgres
      - redis
    networks:
      - quickreply_network
      
  # PostgreSQL数据库
  postgres:
    image: postgres:15-alpine
    container_name: quickreply_db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=chat_capture
      - POSTGRES_USER=quickreply
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - quickreply_network
      
  # Redis缓存
  redis:
    image: redis:7-alpine
    container_name: quickreply_redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - quickreply_network
      
  # Prometheus监控
  prometheus:
    image: prom/prometheus:latest
    container_name: quickreply_prometheus
    restart: unless-stopped
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    ports:
      - "9090:9090"
    networks:
      - quickreply_network
      
  # Grafana可视化
  grafana:
    image: grafana/grafana:latest
    container_name: quickreply_grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana:/etc/grafana/provisioning
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
    networks:
      - quickreply_network

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:

networks:
  quickreply_network:
    driver: bridge
"""

# ============= Kubernetes配置生成器 =============
class KubernetesConfigGenerator:
    """Kubernetes配置生成器"""
    
    @staticmethod
    def generate_deployment(config: DeploymentConfig) -> str:
        """生成Kubernetes Deployment"""
        return f"""
apiVersion: apps/v1
kind: Deployment
metadata:
  name: quickreply-app
  namespace: quickreply
  labels:
    app: quickreply
    environment: {config.environment}
spec:
  replicas: {config.replicas}
  selector:
    matchLabels:
      app: quickreply
  template:
    metadata:
      labels:
        app: quickreply
        version: v1
    spec:
      containers:
      - name: quickreply
        image: quickreply:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9222
          name: cdp
        env:
        - name: ENV
          value: {config.environment}
        - name: DB_HOST
          value: {config.db_host}
        - name: DB_PORT
          value: "{config.db_port}"
        - name: DB_NAME
          value: {config.db_name}
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: quickreply-secrets
              key: db-password
        - name: REDIS_HOST
          value: {config.redis_host}
        - name: REDIS_PORT
          value: "{config.redis_port}"
        resources:
          limits:
            cpu: {config.cpu_limit}
            memory: {config.memory_limit}
          requests:
            cpu: "500m"
            memory: "1Gi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: data
          mountPath: /app/data
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: quickreply-data-pvc
      - name: logs
        persistentVolumeClaim:
          claimName: quickreply-logs-pvc
"""
    
    @staticmethod
    def generate_service() -> str:
        """生成Kubernetes Service"""
        return """
apiVersion: v1
kind: Service
metadata:
  name: quickreply-service
  namespace: quickreply
spec:
  selector:
    app: quickreply
  ports:
  - name: http
    port: 8080
    targetPort: 8080
  - name: cdp
    port: 9222
    targetPort: 9222
  type: LoadBalancer
"""
    
    @staticmethod
    def generate_configmap() -> str:
        """生成ConfigMap"""
        return """
apiVersion: v1
kind: ConfigMap
metadata:
  name: quickreply-config
  namespace: quickreply
data:
  app.config.json: |
    {
      "max_concurrent_accounts": 10,
      "capture_interval": 1.0,
      "batch_size": 100,
      "cache_size": 5000
    }
  logging.config.yaml: |
    version: 1
    formatters:
      default:
        format: '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    handlers:
      console:
        class: logging.StreamHandler
        formatter: default
      file:
        class: logging.handlers.RotatingFileHandler
        filename: /app/logs/quickreply.log
        maxBytes: 104857600
        backupCount: 10
        formatter: default
    root:
      level: INFO
      handlers: [console, file]
"""

# ============= 监控配置生成器 =============
class MonitoringConfigGenerator:
    """监控配置生成器"""
    
    @staticmethod
    def generate_prometheus_config() -> str:
        """生成Prometheus配置"""
        return """
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'quickreply'
    static_configs:
      - targets: ['app:8080']
    metrics_path: /metrics
    
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
      
  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
      
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - '/etc/prometheus/alerts.yml'
"""
    
    @staticmethod
    def generate_alert_rules() -> str:
        """生成告警规则"""
        return """
groups:
  - name: quickreply_alerts
    interval: 30s
    rules:
      # 高CPU使用率
      - alert: HighCPUUsage
        expr: rate(process_cpu_seconds_total[5m]) * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is above 80% (current value: {{ $value }}%)"
          
      # 高内存使用率
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / 1024 / 1024 > 4000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is above 4GB (current value: {{ $value }}MB)"
          
      # 低成功率
      - alert: LowSuccessRate
        expr: rate(capture_success_total[5m]) / rate(capture_total[5m]) < 0.95
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Low capture success rate"
          description: "Success rate is below 95% (current value: {{ $value }})"
          
      # 数据库连接问题
      - alert: DatabaseConnectionError
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection lost"
          description: "Cannot connect to PostgreSQL database"
          
      # Redis连接问题
      - alert: RedisConnectionError
        expr: up{job="redis"} == 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Redis connection lost"
          description: "Cannot connect to Redis cache"
"""
    
    @staticmethod
    def generate_grafana_dashboard() -> str:
        """生成Grafana仪表板"""
        return """
{
  "dashboard": {
    "title": "QuickReply Monitoring",
    "panels": [
      {
        "title": "Capture Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(capture_total[5m])",
            "legendFormat": "Messages/sec"
          }
        ]
      },
      {
        "title": "Success Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(capture_success_total[5m]) / rate(capture_total[5m]) * 100",
            "legendFormat": "Success %"
          }
        ]
      },
      {
        "title": "Active Accounts",
        "type": "graph",
        "targets": [
          {
            "expr": "active_accounts",
            "legendFormat": "Accounts"
          }
        ]
      },
      {
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(process_cpu_seconds_total[5m]) * 100",
            "legendFormat": "CPU %"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "process_resident_memory_bytes / 1024 / 1024",
            "legendFormat": "Memory MB"
          }
        ]
      },
      {
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends",
            "legendFormat": "Connections"
          }
        ]
      }
    ]
  }
}
"""

# ============= 部署管理器 =============
class DeploymentManager:
    """部署管理器"""
    
    def __init__(self, config: DeploymentConfig):
        self.config = config
        self.deployment_dir = Path("deployment")
        self.deployment_dir.mkdir(exist_ok=True)
        
    def generate_configs(self) -> None:
        """生成所有配置文件"""
        logger.info("Generating deployment configurations...")
        
        # Docker配置
        self._save_file("Dockerfile", DockerConfigGenerator.generate_dockerfile())
        self._save_file("docker-compose.yml", DockerConfigGenerator.generate_docker_compose())
        
        # Kubernetes配置
        k8s_dir = self.deployment_dir / "k8s"
        k8s_dir.mkdir(exist_ok=True)
        
        self._save_file("k8s/deployment.yaml", 
                       KubernetesConfigGenerator.generate_deployment(self.config))
        self._save_file("k8s/service.yaml", 
                       KubernetesConfigGenerator.generate_service())
        self._save_file("k8s/configmap.yaml", 
                       KubernetesConfigGenerator.generate_configmap())
        
        # 监控配置
        monitoring_dir = self.deployment_dir / "monitoring"
        monitoring_dir.mkdir(exist_ok=True)
        
        self._save_file("monitoring/prometheus.yml", 
                       MonitoringConfigGenerator.generate_prometheus_config())
        self._save_file("monitoring/alerts.yml", 
                       MonitoringConfigGenerator.generate_alert_rules())
        self._save_file("monitoring/dashboard.json", 
                       MonitoringConfigGenerator.generate_grafana_dashboard())
        
        # 生成部署脚本
        self._generate_deploy_scripts()
        
        logger.info(f"Configurations generated in {self.deployment_dir}")
        
    def _save_file(self, filename: str, content: str) -> None:
        """保存文件"""
        filepath = self.deployment_dir / filename
        filepath.parent.mkdir(exist_ok=True, parents=True)
        
        with open(filepath, 'w') as f:
            f.write(content)
            
    def _generate_deploy_scripts(self) -> None:
        """生成部署脚本"""
        
        # Docker部署脚本
        docker_script = """#!/bin/bash
set -e

echo "Building Docker image..."
docker build -t quickreply:latest .

echo "Starting services with docker-compose..."
docker-compose up -d

echo "Waiting for services to be ready..."
sleep 10

echo "Checking service health..."
docker-compose ps

echo "Deployment complete!"
"""
        self._save_file("deploy_docker.sh", docker_script)
        
        # Kubernetes部署脚本
        k8s_script = """#!/bin/bash
set -e

echo "Creating namespace..."
kubectl create namespace quickreply --dry-run=client -o yaml | kubectl apply -f -

echo "Creating secrets..."
kubectl create secret generic quickreply-secrets \
    --from-literal=db-password=$DB_PASSWORD \
    -n quickreply --dry-run=client -o yaml | kubectl apply -f -

echo "Applying configurations..."
kubectl apply -f k8s/

echo "Waiting for deployment..."
kubectl rollout status deployment/quickreply-app -n quickreply

echo "Checking pod status..."
kubectl get pods -n quickreply

echo "Deployment complete!"
"""
        self._save_file("deploy_k8s.sh", k8s_script)
        
        # 使脚本可执行
        os.chmod(self.deployment_dir / "deploy_docker.sh", 0o755)
        os.chmod(self.deployment_dir / "deploy_k8s.sh", 0o755)

# ============= 健康检查服务 =============
class HealthCheckService:
    """健康检查服务"""
    
    def __init__(self):
        self.checks = {
            'database': self.check_database,
            'redis': self.check_redis,
            'chrome': self.check_chrome,
            'disk_space': self.check_disk_space
        }
        
    async def check_database(self) -> bool:
        """检查数据库连接"""
        try:
            # TODO: 实际的数据库连接检查
            return True
        except:
            return False
            
    async def check_redis(self) -> bool:
        """检查Redis连接"""
        try:
            # TODO: 实际的Redis连接检查
            return True
        except:
            return False
            
    async def check_chrome(self) -> bool:
        """检查Chrome可用性"""
        try:
            result = subprocess.run(
                ['google-chrome', '--version'],
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.returncode == 0
        except:
            return False
            
    async def check_disk_space(self) -> bool:
        """检查磁盘空间"""
        import shutil
        
        total, used, free = shutil.disk_usage("/")
        free_gb = free / (1024 ** 3)
        
        return free_gb > 10  # 至少10GB可用空间
        
    async def run_all_checks(self) -> Dict[str, bool]:
        """运行所有健康检查"""
        results = {}
        
        for name, check_func in self.checks.items():
            try:
                results[name] = await check_func()
            except Exception as e:
                logger.error(f"Health check {name} failed: {e}")
                results[name] = False
                
        return results
        
    def get_health_status(self, results: Dict[str, bool]) -> Dict:
        """获取健康状态"""
        all_healthy = all(results.values())
        
        return {
            'status': 'healthy' if all_healthy else 'unhealthy',
            'checks': results,
            'timestamp': time.time()
        }

# ============= 生产服务器 =============
class ProductionServer:
    """生产环境服务器"""
    
    def __init__(self):
        self.health_service = HealthCheckService()
        self.app = None
        
    async def start(self) -> None:
        """启动服务器"""
        logger.info("Starting production server...")
        
        # 健康检查
        health_results = await self.health_service.run_all_checks()
        health_status = self.health_service.get_health_status(health_results)
        
        if health_status['status'] != 'healthy':
            logger.error(f"Health check failed: {health_status}")
            raise Exception("System not healthy")
            
        # 启动主应用
        from chat_capture_system import ChatCaptureSystem, CaptureConfig
        
        config = CaptureConfig(
            db_path=os.environ.get('DB_PATH', 'production.db'),
            batch_size=int(os.environ.get('BATCH_SIZE', '100')),
            max_accounts=int(os.environ.get('MAX_ACCOUNTS', '10'))
        )
        
        self.app = ChatCaptureSystem(config)
        
        # 加载账号配置
        accounts_file = os.environ.get('ACCOUNTS_FILE', 'accounts.json')
        if os.path.exists(accounts_file):
            with open(accounts_file, 'r') as f:
                accounts = json.load(f)
                self.app.setup_accounts(accounts)
                
        # 启动应用
        await self.app.start()
        
        # 启动HTTP服务器（用于健康检查和指标）
        await self._start_http_server()
        
        logger.info("Production server started successfully")
        
    async def _start_http_server(self) -> None:
        """启动HTTP服务器"""
        from aiohttp import web
        
        app = web.Application()
        
        # 健康检查端点
        async def health_handler(request):
            results = await self.health_service.run_all_checks()
            status = self.health_service.get_health_status(results)
            
            return web.json_response(status)
            
        # 就绪检查端点
        async def ready_handler(request):
            is_ready = self.app is not None
            
            return web.json_response({
                'ready': is_ready,
                'timestamp': time.time()
            })
            
        # Prometheus指标端点
        async def metrics_handler(request):
            if not self.app:
                return web.Response(text="")
                
            stats = self.app.manager.get_stats()
            
            # 格式化为Prometheus格式
            metrics = []
            metrics.append(f"# HELP capture_total Total number of captures")
            metrics.append(f"# TYPE capture_total counter")
            metrics.append(f"capture_total {stats['database_stats'].get('total', 0)}")
            
            metrics.append(f"# HELP active_accounts Number of active accounts")
            metrics.append(f"# TYPE active_accounts gauge")
            metrics.append(f"active_accounts {stats['active_accounts']}")
            
            return web.Response(text='\n'.join(metrics))
            
        app.router.add_get('/health', health_handler)
        app.router.add_get('/ready', ready_handler)
        app.router.add_get('/metrics', metrics_handler)
        
        runner = web.AppRunner(app)
        await runner.setup()
        
        site = web.TCPSite(runner, '0.0.0.0', 8080)
        await site.start()
        
    async def stop(self) -> None:
        """停止服务器"""
        logger.info("Stopping production server...")
        
        if self.app:
            await self.app.stop()
            
        logger.info("Production server stopped")

# ============= 主函数 =============
async def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='QuickReply Production Deployment')
    parser.add_argument('--generate', action='store_true', help='Generate deployment configs')
    parser.add_argument('--env', default='production', choices=['dev', 'staging', 'production'])
    parser.add_argument('--replicas', type=int, default=3)
    
    args = parser.parse_args()
    
    if args.generate:
        # 生成部署配置
        config = DeploymentConfig(
            environment=args.env,
            replicas=args.replicas
        )
        
        manager = DeploymentManager(config)
        manager.generate_configs()
        
        print("\n" + "="*50)
        print("部署配置已生成！")
        print("="*50)
        print("\n下一步：")
        print("1. 设置环境变量：")
        print("   export DB_PASSWORD=your_password")
        print("   export GRAFANA_PASSWORD=your_password")
        print("\n2. Docker部署：")
        print("   cd deployment && ./deploy_docker.sh")
        print("\n3. Kubernetes部署：")
        print("   cd deployment && ./deploy_k8s.sh")
        print("="*50)
        
    else:
        # 启动生产服务器
        server = ProductionServer()
        
        try:
            await server.start()
            
            # 保持运行
            while True:
                await asyncio.sleep(60)
                
        except KeyboardInterrupt:
            await server.stop()

if __name__ == "__main__":
    asyncio.run(main())