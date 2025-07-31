/**
 * 简单的广告数据同步测试
 * 直接使用mysql2测试数据库连接和基本功能
 */

const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.TEST_DB_HOST || '47.79.123.234',
  port: parseInt(process.env.TEST_DB_PORT || '3306'),
  user: process.env.TEST_DB_USER || 'saihu_erp_sync',
  password: process.env.TEST_DB_PASSWORD || '123456',
  database: process.env.TEST_DB_NAME || 'saihu_erp_sync',
};

async function testDatabaseConnection() {
  console.log('🔧 测试数据库连接...');
  console.log(`连接到: ${DB_CONFIG.user}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
  
  let connection;
  
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ 数据库连接成功');
    
    // 测试基本查询
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ 基本查询测试通过:', rows[0]);
    
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function testTableStructure() {
  console.log('\n📋 检查数据库表结构...');
  
  let connection;
  
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    
    const tables = ['fba_inventory', 'inventory_details', 'product_analytics'];
    
    for (const table of tables) {
      const [rows] = await connection.execute(`SHOW TABLES LIKE '${table}'`);
      if (rows.length > 0) {
        console.log(`✅ 表 ${table} 存在`);
        
        // 检查表结构
        const [columns] = await connection.execute(`DESCRIBE ${table}`);
        console.log(`   📊 ${table} 表有 ${columns.length} 个字段`);
      } else {
        console.log(`❌ 表 ${table} 不存在`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ 检查表结构失败:', error.message);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function testDataQuery() {
  console.log('\n📊 测试数据查询...');
  
  let connection;
  
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    
    // 查询FBA库存数据
    const [fbaRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM fba_inventory LIMIT 1'
    );
    console.log(`✅ FBA库存表记录数: ${fbaRows[0].count}`);
    
    // 查询库存明细数据
    const [detailRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM inventory_details LIMIT 1'
    );
    console.log(`✅ 库存明细表记录数: ${detailRows[0].count}`);
    
    // 查询广告分析数据
    const [analyticsRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM product_analytics LIMIT 1'
    );
    console.log(`✅ 广告分析表记录数: ${analyticsRows[0].count}`);
    
    return true;
  } catch (error) {
    console.error('❌ 数据查询失败:', error.message);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function testDataInsert() {
  console.log('\n✏️  测试数据插入...');
  
  let connection;
  
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    
    // 生成测试数据
    const testData = {
      asin: 'TEST_ASIN_' + Date.now(),
      marketplace: 'US',
      seller_sku: 'TEST_SKU_' + Date.now(),
      product_name: '测试产品',
      condition: 'New',
      price: 19.99,
      quantity_available: 100,
      fulfillable_quantity: 95,
      data_date: new Date().toISOString().split('T')[0],
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    // 插入测试数据
    const [result] = await connection.execute(
      `INSERT INTO fba_inventory SET ?`,
      [testData]
    );
    
    console.log(`✅ 测试数据插入成功, ID: ${result.insertId}`);
    
    // 查询插入的数据
    const [rows] = await connection.execute(
      'SELECT * FROM fba_inventory WHERE id = ?',
      [result.insertId]
    );
    
    console.log(`✅ 查询到插入的数据: ASIN=${rows[0].asin}, 库存=${rows[0].quantity_available}`);
    
    // 清理测试数据
    await connection.execute(
      'DELETE FROM fba_inventory WHERE id = ?',
      [result.insertId]
    );
    
    console.log('✅ 测试数据清理完成');
    
    return true;
  } catch (error) {
    console.error('❌ 数据插入测试失败:', error.message);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function runTests() {
  console.log('🚀 开始广告数据同步测试...');
  console.log('================================');
  
  const tests = [
    { name: '数据库连接测试', fn: testDatabaseConnection },
    { name: '表结构检查', fn: testTableStructure },
    { name: '数据查询测试', fn: testDataQuery },
    { name: '数据插入测试', fn: testDataInsert },
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    console.log(`\n🧪 运行: ${test.name}`);
    try {
      const result = await test.fn();
      if (result) {
        passedTests++;
        console.log(`✅ ${test.name} 通过`);
      } else {
        console.log(`❌ ${test.name} 失败`);
      }
    } catch (error) {
      console.error(`❌ ${test.name} 异常:`, error.message);
    }
  }
  
  console.log('\n================================');
  console.log(`🎉 测试完成! 通过 ${passedTests}/${tests.length} 个测试`);
  
  if (passedTests === tests.length) {
    console.log('🚀 所有测试通过，广告数据同步系统运行正常！');
    process.exit(0);
  } else {
    console.log('⚠️  部分测试失败，请检查系统配置');
    process.exit(1);
  }
}

// 运行测试
runTests().catch(error => {
  console.error('💥 测试运行异常:', error);
  process.exit(1);
});