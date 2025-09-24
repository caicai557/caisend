#!/bin/bash

# 构建脚本
set -e

echo "🏗️  Building Application..."

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 构建模式
MODE=${1:-"production"}
OUTPUT_DIR="dist"

# 清理旧构建
clean_build() {
    echo -e "${YELLOW}Cleaning old builds...${NC}"
    rm -rf $OUTPUT_DIR
    rm -rf client/build
    mkdir -p $OUTPUT_DIR
    echo -e "${GREEN}✓ Clean complete${NC}"
}

# 构建前端
build_frontend() {
    echo -e "${YELLOW}Building frontend...${NC}"
    
    cd client
    
    # 设置环境变量
    export REACT_APP_API_URL=${REACT_APP_API_URL:-"/api"}
    export REACT_APP_SOCKET_URL=${REACT_APP_SOCKET_URL:-""}
    export NODE_ENV=production
    
    # 运行构建
    npm run build
    
    # 复制构建产物
    cp -r build ../dist/client
    
    # 生成构建报告
    if [ -f "build/asset-manifest.json" ]; then
        echo -e "${GREEN}✓ Frontend build complete${NC}"
        echo "Bundle size analysis:"
        du -sh build/static/js/*.js | sort -h
    fi
    
    cd ..
}

# 构建后端
build_backend() {
    echo -e "${YELLOW}Building backend...${NC}"
    
    cd server
    
    # 复制必要文件
    mkdir -p ../dist/server
    cp -r . ../dist/server/
    
    # 清理不必要的文件
    cd ../dist/server
    rm -rf node_modules
    rm -rf uploads
    rm -rf .env
    rm -rf coverage
    rm -rf .git
    
    # 生成生产环境package.json
    cat > package.json << EOF
{
  "name": "telegram-clone-server",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": $(cat ../../server/package.json | jq .dependencies)
}
EOF
    
    # 安装生产依赖
    npm install --production
    
    echo -e "${GREEN}✓ Backend build complete${NC}"
    
    cd ../..
}

# 生成部署配置
generate_configs() {
    echo -e "${YELLOW}Generating deployment configs...${NC}"
    
    # Dockerfile
    cat > $OUTPUT_DIR/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# 复制后端
COPY server/package*.json ./
RUN npm ci --production

COPY server/ ./
COPY client/ ./public/

# 环境变量
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "index.js"]
EOF

    # docker-compose.yml
    cat > $OUTPUT_DIR/docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: telegram_clone
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/telegram_clone
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres
    volumes:
      - uploads:/app/uploads

volumes:
  postgres_data:
  uploads:
EOF

    # 启动脚本
    cat > $OUTPUT_DIR/start.sh << 'EOF'
#!/bin/bash
cd server
node index.js
EOF
    chmod +x $OUTPUT_DIR/start.sh
    
    # 环境变量模板
    cat > $OUTPUT_DIR/.env.production << 'EOF'
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://localhost:5432/telegram_clone
JWT_SECRET=change_this_in_production
EOF
    
    echo -e "${GREEN}✓ Deployment configs generated${NC}"
}

# 优化构建
optimize_build() {
    echo -e "${YELLOW}Optimizing build...${NC}"
    
    # 压缩静态资源
    if command -v gzip &> /dev/null; then
        find $OUTPUT_DIR/client -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" \) \
            -exec gzip -k {} \;
        echo -e "${GREEN}✓ Static files compressed${NC}"
    fi
    
    # 生成构建信息
    cat > $OUTPUT_DIR/build-info.json << EOF
{
  "version": "1.0.0",
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "mode": "$MODE",
  "commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
}
EOF
    
    # 计算构建大小
    TOTAL_SIZE=$(du -sh $OUTPUT_DIR | cut -f1)
    echo -e "${GREEN}✓ Total build size: $TOTAL_SIZE${NC}"
}

# 验证构建
verify_build() {
    echo -e "${YELLOW}Verifying build...${NC}"
    
    # 检查关键文件
    REQUIRED_FILES=(
        "$OUTPUT_DIR/server/index.js"
        "$OUTPUT_DIR/client/index.html"
        "$OUTPUT_DIR/Dockerfile"
        "$OUTPUT_DIR/docker-compose.yml"
    )
    
    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            echo -e "${RED}✗ Missing required file: $file${NC}"
            exit 1
        fi
    done
    
    echo -e "${GREEN}✓ Build verification passed${NC}"
}

# 主流程
main() {
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}Build Mode: $MODE${NC}"
    echo -e "${GREEN}================================${NC}"
    
    clean_build
    build_frontend
    build_backend
    generate_configs
    optimize_build
    verify_build
    
    echo -e "\n${GREEN}================================${NC}"
    echo -e "${GREEN}✓ Build completed successfully!${NC}"
    echo -e "${GREEN}================================${NC}"
    echo -e "Output directory: ${OUTPUT_DIR}/"
    echo -e "To deploy: cd ${OUTPUT_DIR} && docker-compose up"
}

# 运行主流程
main