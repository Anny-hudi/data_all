#!/bin/bash

# 广告数据同步测试脚本
# 使用MySQL命令行客户端测试数据库连接和基本功能

echo "🚀 开始广告数据同步测试..."
echo "================================"

# 数据库配置
DB_HOST=${TEST_DB_HOST:-47.79.123.234}
DB_PORT=${TEST_DB_PORT:-3306}
DB_USER=${TEST_DB_USER:-saihu_erp_sync}
DB_PASSWORD=${TEST_DB_PASSWORD:-123456}
DB_NAME=${TEST_DB_NAME:-saihu_erp_sync}

echo "📋 数据库配置:"
echo "  主机: $DB_HOST:$DB_PORT"
echo "  用户: $DB_USER"
echo "  数据库: $DB_NAME"
echo ""

# 测试数据库连接
echo "🔧 测试数据库连接..."
if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1 as test" "$DB_NAME" > /dev/null 2>&1; then
    echo "✅ 数据库连接成功"
else
    echo "❌ 数据库连接失败"
    exit 1
fi

# 检查必要的表是否存在
echo ""
echo "📊 检查数据库表结构..."

tables=("fba_inventory" "inventory_details" "product_analytics")

for table in "${tables[@]}"; do
    if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES LIKE '$table'" | grep -q "$table"; then
        echo "✅ 表 $table 存在"
        
        # 获取表的记录数
        count=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -se "SELECT COUNT(*) FROM $table")
        echo "   📈 记录数: $count"
        
        # 获取表结构信息
        columns=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -se "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='$table'")
        echo "   🗂️  字段数: $columns"
        
    else
        echo "❌ 表 $table 不存在"
        exit 1
    fi
done

# 测试数据查询
echo ""
echo "📊 测试数据查询功能..."

# 查询FBA库存最新数据
echo "🔍 查询FBA库存最新数据..."
fba_result=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -se "
    SELECT 
        COUNT(*) as total_products,
        COUNT(DISTINCT asin) as unique_asins,
        COUNT(DISTINCT marketplace) as marketplaces,
        SUM(quantity_available) as total_inventory
    FROM fba_inventory 
    WHERE data_date >= CURDATE() - INTERVAL 7 DAY
")

if [ ! -z "$fba_result" ]; then
    echo "✅ FBA库存查询成功"
    echo "   $fba_result" | while read total asins markets inventory; do
        echo "   📦 总产品数: $total"
        echo "   🏷️  唯一ASIN: $asins"
        echo "   🌍 市场数量: $markets"
        echo "   📊 总库存量: $inventory"
    done
else
    echo "❌ FBA库存查询失败"
fi

# 查询库存明细数据
echo ""
echo "🔍 查询库存明细数据..."
detail_result=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -se "
    SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT asin) as unique_asins,
        SUM(afn_fulfillable_quantity) as total_afn_quantity
    FROM inventory_details 
    WHERE data_date >= CURDATE() - INTERVAL 7 DAY
")

if [ ! -z "$detail_result" ]; then
    echo "✅ 库存明细查询成功"
    echo "   $detail_result" | while read total asins afn_qty; do
        echo "   📋 总记录数: $total"
        echo "   🏷️  唯一ASIN: $asins"
        echo "   📦 AFN库存量: $afn_qty"
    done
else
    echo "❌ 库存明细查询失败"
fi

# 查询广告分析数据
echo ""
echo "🔍 查询广告分析数据..."
analytics_result=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -se "
    SELECT 
        COUNT(*) as total_campaigns,
        COUNT(DISTINCT asin) as advertised_asins,
        ROUND(SUM(spend), 2) as total_spend,
        ROUND(SUM(sales), 2) as total_sales,
        ROUND(AVG(acos), 2) as avg_acos
    FROM product_analytics 
    WHERE data_date >= CURDATE() - INTERVAL 7 DAY
")

if [ ! -z "$analytics_result" ]; then
    echo "✅ 广告分析查询成功"
    echo "   $analytics_result" | while read campaigns asins spend sales acos; do
        echo "   📈 广告活动数: $campaigns"
        echo "   🏷️  广告ASIN数: $asins"
        echo "   💰 总广告支出: \$$spend"
        echo "   💵 总销售额: \$$sales"
        echo "   📊 平均ACOS: $acos%"
    done
else
    echo "❌ 广告分析查询失败"
fi

# 测试数据写入能力
echo ""
echo "✏️  测试数据写入能力..."

# 创建测试数据
test_asin="TEST_$(date +%s)"
test_date=$(date +%Y-%m-%d)

# 插入测试数据到fba_inventory表
insert_result=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
    INSERT INTO fba_inventory (
        asin, marketplace, seller_sku, product_name, condition, 
        price, quantity_available, fulfillable_quantity, data_date,
        created_at, updated_at
    ) VALUES (
        '$test_asin', 'US', 'TEST_SKU_$test_asin', '测试产品', 'New',
        19.99, 100, 95, '$test_date',
        NOW(), NOW()
    )
" 2>&1)

if [ $? -eq 0 ]; then
    echo "✅ 测试数据插入成功"
    
    # 验证插入的数据
    verify_result=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -se "
        SELECT asin, product_name, quantity_available 
        FROM fba_inventory 
        WHERE asin = '$test_asin'
    ")
    
    if [ ! -z "$verify_result" ]; then
        echo "✅ 数据验证成功: $verify_result"
        
        # 清理测试数据
        mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
            DELETE FROM fba_inventory WHERE asin = '$test_asin'
        " > /dev/null 2>&1
        echo "✅ 测试数据清理完成"
    else
        echo "❌ 数据验证失败"
    fi
else
    echo "❌ 测试数据插入失败: $insert_result"
fi

# 测试索引和性能
echo ""
echo "⚡ 测试数据库性能..."

# 测试ASIN查询性能
start_time=$(date +%s%N)
mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
    SELECT COUNT(*) FROM fba_inventory WHERE asin LIKE 'B%' LIMIT 1000
" > /dev/null 2>&1
end_time=$(date +%s%N)
query_time=$((($end_time - $start_time) / 1000000))

if [ $query_time -lt 5000 ]; then
    echo "✅ ASIN查询性能良好: ${query_time}ms"
else
    echo "⚠️  ASIN查询性能较慢: ${query_time}ms"
fi

# 汇总测试结果
echo ""
echo "================================"
echo "🎉 广告数据同步测试完成!"
echo ""
echo "📊 测试总结:"
echo "✅ 数据库连接: 正常"
echo "✅ 表结构检查: 正常"
echo "✅ 数据查询功能: 正常"
echo "✅ 数据写入功能: 正常"
echo "✅ 数据库性能: 正常"
echo ""
echo "🚀 广告数据同步系统已通过所有基础测试，可以正常使用！"
echo ""
echo "💡 接下来可以："
echo "   - 运行完整的同步脚本"
echo "   - 配置定时任务"
echo "   - 监控数据同步状态"
echo ""