#!/bin/bash

# 开发环境一键启动脚本
set -e

echo "🚀 Starting Development Environment..."

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 检查依赖
check_dependencies() {
    echo -e "${YELLOW}Checking dependencies...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Node.js is not installed${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}npm is not installed${NC}"
        exit 1
    fi
    
    if ! command -v psql &> /dev/null; then
        echo -e "${YELLOW}PostgreSQL client not found, database setup may fail${NC}"
    fi
    
    echo -e "${GREEN}✓ Dependencies check passed${NC}"
}

# 安装依赖
install_deps() {
    echo -e "${YELLOW}Installing dependencies...${NC}"
    
    # 后端依赖
    if [ -d "server" ]; then
        echo "Installing server dependencies..."
        cd server
        npm install
        cd ..
    fi
    
    # 前端依赖
    if [ -d "client" ]; then
        echo "Installing client dependencies..."
        cd client
        npm install
        cd ..
    fi
    
    echo -e "${GREEN}✓ Dependencies installed${NC}"
}

# 设置环境变量
setup_env() {
    echo -e "${YELLOW}Setting up environment...${NC}"
    
    # 后端环境变量
    if [ ! -f "server/.env" ] && [ -f "server/.env.example" ]; then
        cp server/.env.example server/.env
        echo -e "${YELLOW}Created server/.env from example${NC}"
    fi
    
    # 前端环境变量
    if [ ! -f "client/.env" ] && [ -f "client/.env.example" ]; then
        cp client/.env.example client/.env
        echo -e "${YELLOW}Created client/.env from example${NC}"
    fi
    
    echo -e "${GREEN}✓ Environment setup complete${NC}"
}

# 数据库初始化
init_database() {
    echo -e "${YELLOW}Initializing database...${NC}"
    
    if command -v psql &> /dev/null; then
        # 检查数据库是否存在
        if ! psql -lqt | cut -d \| -f 1 | grep -qw telegram_clone; then
            echo "Creating database..."
            createdb telegram_clone || echo "Database may already exist"
        fi
    fi
    
    echo -e "${GREEN}✓ Database initialized${NC}"
}

# 启动服务
start_services() {
    echo -e "${YELLOW}Starting services...${NC}"
    
    # 使用并发启动
    if command -v concurrently &> /dev/null; then
        concurrently \
            --names "SERVER,CLIENT" \
            --prefix-colors "bgBlue.bold,bgGreen.bold" \
            "cd server && npm run dev" \
            "cd client && npm start"
    else
        # 备用方案：使用后台进程
        echo "Starting server..."
        cd server && npm run dev &
        SERVER_PID=$!
        
        echo "Starting client..."
        cd ../client && npm start &
        CLIENT_PID=$!
        
        # 等待进程
        wait $SERVER_PID $CLIENT_PID
    fi
}

# 清理函数
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    pkill -f "node" || true
    echo -e "${GREEN}✓ Services stopped${NC}"
    exit 0
}

# 注册清理函数
trap cleanup EXIT INT TERM

# 主流程
main() {
    check_dependencies
    install_deps
    setup_env
    init_database
    
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}Development environment ready!${NC}"
    echo -e "${GREEN}================================${NC}"
    echo -e "Server: http://localhost:5000"
    echo -e "Client: http://localhost:3000"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"
    
    start_services
}

# 运行主流程
main