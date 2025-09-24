#!/bin/bash

# 测试脚本 - 单元测试和覆盖率
set -e

echo "🧪 Running Tests..."

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 测试模式
MODE=${1:-"all"}

# 运行后端测试
run_backend_tests() {
    echo -e "${YELLOW}Running backend tests...${NC}"
    
    cd server
    
    # 安装测试依赖
    npm install --save-dev jest supertest @types/jest
    
    # 运行测试
    npm test -- --coverage --watchAll=false
    
    # 生成覆盖率报告
    if [ -d "coverage" ]; then
        echo -e "${GREEN}Coverage report generated at server/coverage${NC}"
    fi
    
    cd ..
}

# 运行前端测试
run_frontend_tests() {
    echo -e "${YELLOW}Running frontend tests...${NC}"
    
    cd client
    
    # 运行测试
    CI=true npm test -- --coverage --watchAll=false
    
    # 生成覆盖率报告
    if [ -d "coverage" ]; then
        echo -e "${GREEN}Coverage report generated at client/coverage${NC}"
    fi
    
    cd ..
}

# 运行集成测试
run_integration_tests() {
    echo -e "${YELLOW}Running integration tests...${NC}"
    
    # 启动测试数据库
    export NODE_ENV=test
    export DATABASE_URL=postgresql://localhost:5432/telegram_clone_test
    
    # 创建测试数据库
    createdb telegram_clone_test 2>/dev/null || true
    
    # 运行集成测试
    cd server
    npm run test:integration || true
    cd ..
    
    # 清理测试数据库
    dropdb telegram_clone_test 2>/dev/null || true
}

# 生成测试报告
generate_report() {
    echo -e "${YELLOW}Generating test report...${NC}"
    
    # 合并覆盖率报告
    if command -v nyc &> /dev/null; then
        nyc merge server/coverage client/coverage coverage/
        nyc report --reporter=html --reporter=text
    fi
    
    # 打印摘要
    echo -e "\n${GREEN}================================${NC}"
    echo -e "${GREEN}Test Summary${NC}"
    echo -e "${GREEN}================================${NC}"
    
    # 检查覆盖率阈值
    COVERAGE_THRESHOLD=80
    
    if [ -f "coverage/coverage-summary.json" ]; then
        COVERAGE=$(cat coverage/coverage-summary.json | grep -o '"pct":[0-9.]*' | head -1 | cut -d: -f2)
        
        if (( $(echo "$COVERAGE >= $COVERAGE_THRESHOLD" | bc -l) )); then
            echo -e "${GREEN}✓ Coverage: ${COVERAGE}% (threshold: ${COVERAGE_THRESHOLD}%)${NC}"
        else
            echo -e "${RED}✗ Coverage: ${COVERAGE}% (threshold: ${COVERAGE_THRESHOLD}%)${NC}"
            exit 1
        fi
    fi
}

# 主流程
main() {
    case $MODE in
        backend)
            run_backend_tests
            ;;
        frontend)
            run_frontend_tests
            ;;
        integration)
            run_integration_tests
            ;;
        all)
            run_backend_tests
            run_frontend_tests
            run_integration_tests
            generate_report
            ;;
        *)
            echo "Usage: $0 [backend|frontend|integration|all]"
            exit 1
            ;;
    esac
    
    echo -e "\n${GREEN}✓ Tests completed successfully!${NC}"
}

# 运行主流程
main