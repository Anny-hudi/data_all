// 测试数据库连接
const mysql = require('mysql2/promise');

async function testConnection() {
  const config = {
    host: process.env.SAIHU_MYSQL_HOST || '47.79.123.234',
    port: parseInt(process.env.SAIHU_MYSQL_PORT || '3306'),
    user: process.env.SAIHU_MYSQL_USER || 'saihu_erp_sync',
    password: process.env.SAIHU_MYSQL_PASSWORD || '123456',
    database: process.env.SAIHU_MYSQL_DATABASE || 'saihu_erp_sync',
  };

  console.log('🔍 测试数据库连接...');
  console.log('配置:', { ...config, password: '***' });

  try {
    const connection = await mysql.createConnection(config);
    
    // 测试基本连接
    console.log('✅ 数据库连接成功');
    
    // 检查表是否存在
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'inventory_points'"
    );
    
    if (tables.length > 0) {
      console.log('✅ inventory_points 表存在');
      
      // 检查数据数量
      const [counts] = await connection.execute(
        'SELECT COUNT(*) as count FROM inventory_points'
      );
      console.log(`📊 inventory_points 表数据量: ${counts[0].count}`);
      
      // 获取最新数据日期
      const [dates] = await connection.execute(
        'SELECT MAX(data_date) as latest_date FROM inventory_points'
      );
      console.log(`📅 最新数据日期: ${dates[0].latest_date}`);
      
      // 测试汇总查询
      const [summary] = await connection.execute(`
        SELECT 
          COUNT(DISTINCT asin) as total_products,
          COUNT(*) as total_points,
          SUM(total_inventory) as total_inventory,
          SUM(daily_sales_amount) as total_daily_sales,
          SUM(ad_spend) as total_ad_spend
        FROM inventory_points 
        WHERE data_date = '2025-07-27'
      `);
      
      console.log('📈 数据汇总测试:');
      console.log('  总产品数:', summary[0].total_products);
      console.log('  总库存点:', summary[0].total_points);
      console.log('  总库存:', summary[0].total_inventory);
      console.log('  总日销售额:', summary[0].total_daily_sales);
      console.log('  总广告支出:', summary[0].total_ad_spend);
      
    } else {
      console.log('❌ inventory_points 表不存在');
    }
    
    await connection.end();
    console.log('✅ 数据库连接测试完成');
    
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
  }
}

testConnection();