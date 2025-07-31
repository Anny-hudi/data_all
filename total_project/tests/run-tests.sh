#!/bin/bash

# 广告数据同步测试运行脚本
# 用于执行完整的数据同步测试套件

set -e  # 出错时退出

echo "🚀 开始广告数据同步测试..."
echo "=================================="

# 检查Node.js和npm环境
echo "📋 检查环境..."
node --version
npm --version

# 检查测试数据库连接
echo "🗄️  检查测试数据库连接..."
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL客户端未安装，请先安装MySQL"
    exit 1
fi

# 检查测试数据库是否可访问
DB_HOST=${TEST_DB_HOST:-localhost}
DB_PORT=${TEST_DB_PORT:-3306}
DB_USER=${TEST_DB_USER:-root}
DB_NAME=${TEST_DB_NAME:-sync_saihu_erp_test}

echo "测试数据库连接: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

# 创建测试数据库（如果不存在）
echo "🔧 准备测试数据库..."
mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" ${TEST_DB_PASSWORD:+-p"$TEST_DB_PASSWORD"} -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\`;" 2>/dev/null || {
    echo "⚠️  无法连接到测试数据库，请检查数据库配置"
    echo "环境变量："
    echo "  TEST_DB_HOST=$DB_HOST"
    echo "  TEST_DB_PORT=$DB_PORT"
    echo "  TEST_DB_USER=$DB_USER"
    echo "  TEST_DB_NAME=$DB_NAME"
    exit 1
}

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 检查Jest是否安装
if ! npm list jest > /dev/null 2>&1; then
    echo "📦 安装Jest测试框架..."
    npm install --save-dev jest @jest/globals ts-jest @types/jest
fi

# 设置测试环境变量
export NODE_ENV=test
export TEST_DB_HOST="$DB_HOST"
export TEST_DB_PORT="$DB_PORT"
export TEST_DB_USER="$DB_USER"
export TEST_DB_PASSWORD="$TEST_DB_PASSWORD"
export TEST_DB_NAME="$DB_NAME"

echo "✅ 环境检查完成"
echo ""

# 运行不同类型的测试
echo "🧪 运行测试套件..."
echo "=================================="

# 1. 运行FBA库存数据同步测试
echo "📊 测试FBA库存数据同步..."
npx jest tests/data-sync/fba-inventory.test.ts --verbose --detectOpenHandles --forceExit

if [ $? -eq 0 ]; then
    echo "✅ FBA库存数据同步测试通过"
else
    echo "❌ FBA库存数据同步测试失败"
    exit 1
fi

echo ""

# 2. 运行广告分析数据同步测试  
echo "📈 测试广告分析数据同步..."
npx jest tests/data-sync/product-analytics.test.ts --verbose --detectOpenHandles --forceExit

if [ $? -eq 0 ]; then
    echo "✅ 广告分析数据同步测试通过"
else
    echo "❌ 广告分析数据同步测试失败"
    exit 1
fi

echo ""

# 3. 运行库存明细数据同步测试
echo "📦 测试库存明细数据同步..."
npx jest tests/data-sync/inventory-details.test.ts --verbose --detectOpenHandles --forceExit

if [ $? -eq 0 ]; then
    echo "✅ 库存明细数据同步测试通过"
else
    echo "❌ 库存明细数据同步测试失败"
    exit 1
fi

echo ""

# 4. 运行端到端集成测试
echo "🔄 测试端到端集成..."
npx jest tests/integration/end-to-end.test.ts --verbose --detectOpenHandles --forceExit

if [ $? -eq 0 ]; then
    echo "✅ 端到端集成测试通过"
else
    echo "❌ 端到端集成测试失败"
    exit 1
fi

echo ""

# 5. 运行覆盖率测试（可选）
if [ "$1" = "--coverage" ]; then
    echo "📋 生成测试覆盖率报告..."
    npx jest --coverage --detectOpenHandles --forceExit
    
    echo ""
    echo "📊 覆盖率报告已生成到 coverage/ 目录"
fi

# 清理测试数据（可选）
if [ "$1" = "--cleanup" ] || [ "$2" = "--cleanup" ]; then
    echo "🧹 清理测试数据..."
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" ${TEST_DB_PASSWORD:+-p"$TEST_DB_PASSWORD"} "$DB_NAME" -e "
        DELETE FROM fba_inventory WHERE data_date >= CURDATE() - INTERVAL 7 DAY;
        DELETE FROM inventory_details WHERE data_date >= CURDATE() - INTERVAL 7 DAY;
        DELETE FROM product_analytics WHERE data_date >= CURDATE() - INTERVAL 7 DAY;
    " 2>/dev/null || echo "⚠️  清理测试数据时出现警告"
    echo "✅ 测试数据清理完成"
fi

echo ""
echo "🎉 所有测试完成！"
echo "=================================="
echo "✅ FBA库存数据同步测试"
echo "✅ 广告分析数据同步测试"  
echo "✅ 库存明细数据同步测试"
echo "✅ 端到端集成测试"
echo ""
echo "📈 测试总结："
echo "   - 数据同步流程: 正常"
echo "   - API接口响应: 正常"
echo "   - 数据完整性: 正常"
echo "   - 性能表现: 正常"
echo ""
echo "🚀 广告数据同步系统已通过所有测试，可以部署使用！"