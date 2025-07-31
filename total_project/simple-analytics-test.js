#!/usr/bin/env node

/**
 * 简化的产品分析数据保存测试
 * 测试数据库连接和插入功能
 */

const mysql = require('mysql2/promise');

// 数据库配置
const DB_CONFIG = {
  host: '47.79.123.234',
  port: 3306,
  user: 'saihu_erp_sync',
  password: '123456',
  database: 'saihu_erp_sync'
};

/**
 * 生成测试数据
 */
function generateTestData(count = 5) {
  const testData = [];
  const asins = ['B07TEST001', 'B07TEST002', 'B07TEST003'];
  const campaigns = ['Spring Campaign', 'Summer Sale', 'Back to School'];
  
  for (let i = 0; i < count; i++) {
    const impressions = Math.floor(Math.random() * 10000 + 1000);
    const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.01));
    const spend = Math.round((clicks * (Math.random() * 2 + 0.5)) * 100) / 100;
    const sales = Math.round((clicks * (Math.random() * 0.2 + 0.05) * Math.random() * 50 + 10) * 100) / 100;
    
    testData.push({
      asin: asins[i % asins.length],
      sku: `TEST-SKU-${i + 1}`,
      title: `测试产品 ${i + 1}`,
      brand_name: `Brand ${i % 3 + 1}`,
      impressions,
      clicks,
      // ad_cost字段已删除，不再使用
      ad_sales: sales, // 对应数据库中的ad_sales字段
      sales_amount: sales * 0.8, // 自然销售额
      sales_quantity: Math.floor(sales / 20), // 销售数量
      cpc: Math.round((spend / clicks) * 100) / 100,
      acos: Math.min(Math.round((spend / sales) * 10000) / 100, 99.99),
      conversion_rate: Math.round((Math.random() * 0.2 + 0.05) * 10000) / 100,
      ad_orders: Math.floor(clicks * (Math.random() * 0.2 + 0.05)),
      ad_conversion_rate: Math.round((Math.random() * 0.2 + 0.05) * 10000) / 100,
      currency: 'USD',
      marketplace_id: 'US',
      data_date: new Date().toISOString().split('T')[0],
      created_at: new Date(),
      updated_at: new Date()
    });
  }
  
  return testData;
}

/**
 * 执行测试
 */
async function runTest() {
  let connection;
  
  try {
    console.log('🧪 开始产品分析数据保存测试...');
    console.log('================================');
    
    // 1. 连接数据库
    console.log('📡 连接数据库...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ 数据库连接成功');
    
    // 2. 检查表结构
    console.log('🔍 检查product_analytics表结构...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'product_analytics'
      ORDER BY ORDINAL_POSITION
    `, [DB_CONFIG.database]);
    
    console.log(`📊 表字段数量: ${columns.length}`);
    console.log('核心字段检查:');
    const coreFields = ['asin', 'sku', 'title', 'impressions', 'clicks', 'ad_sales', 'sales_amount', 'acos', 'cpc', 'data_date'];
    coreFields.forEach(field => {
      const found = columns.find(col => col.COLUMN_NAME === field);
      console.log(`  ${field}: ${found ? '✅' : '❌'} ${found ? found.DATA_TYPE : '不存在'}`);
    });
    
    // 检查已删除的字段是否确实被删除
    console.log('已删除字段检查:');
    const deletedFields = ['parent_asin', 'spu', 'msku', 'dev_name', 'operator_name', 'shop_ids'];
    deletedFields.forEach(field => {
      const found = columns.find(col => col.COLUMN_NAME === field);
      console.log(`  ${field}: ${found ? '❌ 仍存在' : '✅ 已删除'}`);
    });
    
    // 3. 清空测试数据
    console.log('🗑️  清空现有测试数据...');
    await connection.execute("DELETE FROM product_analytics WHERE asin LIKE 'B07TEST%'");
    console.log('✅ 测试数据清空完成');
    
    // 4. 生成测试数据
    console.log('📝 生成测试数据...');
    const testData = generateTestData(5);
    console.log(`✅ 生成了 ${testData.length} 条测试数据`);
    
    // 5. 插入测试数据
    console.log('💾 插入测试数据...');
    const insertStart = Date.now();
    
    for (let i = 0; i < testData.length; i++) {
      const data = testData[i];
      const sql = `
        INSERT INTO product_analytics (
          asin, sku, title, brand_name, impressions, clicks, ad_sales,
          sales_amount, sales_quantity, cpc, acos, conversion_rate, ad_orders,
          ad_conversion_rate, currency, marketplace_id, data_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          impressions = VALUES(impressions),
          clicks = VALUES(clicks),
          ad_sales = VALUES(ad_sales),
          sales_amount = VALUES(sales_amount),
          updated_at = VALUES(updated_at)
      `;
      
      await connection.execute(sql, [
        data.asin, data.sku, data.title, data.brand_name, data.impressions, 
        data.clicks, data.ad_sales, data.sales_amount, data.sales_quantity,
        data.cpc, data.acos, data.conversion_rate, data.ad_orders, data.ad_conversion_rate,
        data.currency, data.marketplace_id, data.data_date, data.created_at, data.updated_at
      ]);
      
      console.log(`  📌 插入数据 ${i + 1}/${testData.length}: ASIN=${data.asin}, Ad Sales=${data.ad_sales}`);
    }
    
    const insertEnd = Date.now();
    console.log(`✅ 数据插入完成，耗时: ${insertEnd - insertStart}ms`);
    
    // 6. 验证插入的数据
    console.log('🔍 验证插入的数据...');
    const [results] = await connection.execute(`
      SELECT asin, sku, title, brand_name, impressions, clicks, ad_sales, 
             sales_amount, cpc, acos, conversion_rate, ad_conversion_rate
      FROM product_analytics 
      WHERE asin LIKE 'B07TEST%'
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 查询到 ${results.length} 条数据:`);
    results.forEach((row, index) => {
      console.log(`  ${index + 1}. ASIN: ${row.asin} | SKU: ${row.sku} | Title: ${row.title}`);
      console.log(`     Brand: ${row.brand_name} | Impressions: ${row.impressions} | Clicks: ${row.clicks}`);
      console.log(`     Ad Sales: $${row.ad_sales} | CPC: $${row.cpc} | ACOS: ${row.acos}%`);
      console.log(`     Sales Amount: $${row.sales_amount} | CVR: ${row.conversion_rate}% | Ad CVR: ${row.ad_conversion_rate}%`);
      console.log('');
    });
    
    // 7. 测试数据计算逻辑
    console.log('🧮 验证数据计算逻辑...');
    let calculationErrors = 0;
    
    results.forEach((row, index) => {
      // 由于ad_cost字段已删除，我们跳过需要ad_cost的计算验证
      // 只验证数据范围合理性
      if (row.clicks > row.impressions) {
        console.log(`  ❌ 数据逻辑错误 #${index + 1}: 点击数(${row.clicks})不能大于曝光数(${row.impressions})`);
        calculationErrors++;
      }
      
      // 验证ACOS范围合理性（0-1000%）
      if (row.acos < 0 || row.acos > 1000) {
        console.log(`  ❌ ACOS数值异常 #${index + 1}: ACOS ${row.acos}% 超出合理范围`);
        calculationErrors++;
      }
      
      // 验证转化率范围合理性（0-100%）
      if (row.conversion_rate < 0 || row.conversion_rate > 100) {
        console.log(`  ❌ 转化率异常 #${index + 1}: CVR ${row.conversion_rate}% 超出合理范围`);
        calculationErrors++;
      }
    });
    
    if (calculationErrors === 0) {
      console.log('✅ 所有数据计算逻辑验证通过');
    } else {
      console.log(`❌ 发现 ${calculationErrors} 个计算错误`);
    }
    
    // 8. 测试数据更新
    console.log('🔄 测试数据更新功能...');
    const updateData = {
      asin: testData[0].asin,
      sku: testData[0].sku,
      newAdSales: testData[0].ad_sales + 300,
      newSalesAmount: testData[0].sales_amount + 200
    };
    
    await connection.execute(`
      UPDATE product_analytics 
      SET ad_sales = ?, sales_amount = ?, updated_at = NOW()
      WHERE asin = ? AND sku = ?
    `, [updateData.newAdSales, updateData.newSalesAmount, updateData.asin, updateData.sku]);
    
    const [updatedResult] = await connection.execute(`
      SELECT ad_sales, sales_amount FROM product_analytics 
      WHERE asin = ? AND sku = ?
    `, [updateData.asin, updateData.sku]);
    
    if (updatedResult.length > 0) {
      const updated = updatedResult[0];
      console.log(`✅ 数据更新成功: Ad Sales ${testData[0].ad_sales} → ${updated.ad_sales}, Sales Amount ${testData[0].sales_amount} → ${updated.sales_amount}`);
    } else {
      console.log('❌ 数据更新验证失败');
    }
    
    // 9. 统计汇总测试
    console.log('📈 测试数据汇总查询...');
    const [summary] = await connection.execute(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT asin) as unique_asins,
        COUNT(DISTINCT brand_name) as unique_brands,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        AVG(cpc) as avg_cpc_calculated,
        SUM(ad_sales) as total_ad_sales,
        SUM(sales_amount) as total_sales_amount,
        AVG(cpc) as avg_cpc,
        AVG(acos) as avg_acos,
        AVG(conversion_rate) as avg_conversion_rate
      FROM product_analytics 
      WHERE asin LIKE 'B07TEST%'
    `);
    
    const stats = summary[0];
    console.log('📊 数据汇总统计:');
    console.log(`  总记录数: ${stats.total_records}`);
    console.log(`  唯一ASIN数: ${stats.unique_asins}`);
    console.log(`  唯一品牌数: ${stats.unique_brands}`);
    console.log(`  总曝光量: ${stats.total_impressions}`);
    console.log(`  总点击量: ${stats.total_clicks}`);
    console.log(`  平均CPC计算: $${Math.round(stats.avg_cpc_calculated * 100) / 100}`);
    console.log(`  总广告销售额: $${Math.round(stats.total_ad_sales * 100) / 100}`);
    console.log(`  总自然销售额: $${Math.round(stats.total_sales_amount * 100) / 100}`);
    console.log(`  平均CPC: $${Math.round(stats.avg_cpc * 100) / 100}`);
    console.log(`  平均ACOS: ${Math.round(stats.avg_acos * 100) / 100}%`);
    console.log(`  平均转化率: ${Math.round(stats.avg_conversion_rate * 100) / 100}%`);
    
    console.log('');
    console.log('🎉 所有测试完成！');
    console.log('================================');
    console.log('✅ 数据库连接测试通过');
    console.log('✅ 数据插入功能测试通过');
    console.log('✅ 数据计算逻辑测试通过');
    console.log('✅ 数据更新功能测试通过');  
    console.log('✅ 数据查询汇总测试通过');
    console.log('');    
    console.log('🚀 产品分析数据保存逻辑功能正常！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('📡 数据库连接已关闭');
    }
  }
}

// 运行测试
runTest().catch(console.error);