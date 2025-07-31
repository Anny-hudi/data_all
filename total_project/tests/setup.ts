/**
 * 测试环境设置文件
 * 配置测试数据库连接、测试数据准备等
 */

import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { MySQLClient } from '../src/lib/database/mysql-client';
import { SaiHuAdapter } from '../src/lib/adapters/saihu-adapter';

// 测试数据库配置
const TEST_DB_CONFIG = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '3306'),
  user: process.env.TEST_DB_USER || 'test',
  password: process.env.TEST_DB_PASSWORD || 'test',
  database: process.env.TEST_DB_NAME || 'sync_saihu_erp_test',
};

// 全局测试实例
export let testClient: MySQLClient;
export let testAdapter: SaiHuAdapter;

/**
 * 测试数据库初始化
 */
export async function setupTestDatabase() {
  // 设置测试环境变量
  process.env.SAIHU_MYSQL_HOST = TEST_DB_CONFIG.host;
  process.env.SAIHU_MYSQL_PORT = TEST_DB_CONFIG.port.toString();
  process.env.SAIHU_MYSQL_USER = TEST_DB_CONFIG.user;
  process.env.SAIHU_MYSQL_PASSWORD = TEST_DB_CONFIG.password;
  process.env.SAIHU_MYSQL_DATABASE = TEST_DB_CONFIG.database;
  
  testClient = new MySQLClient();
  testAdapter = new SaiHuAdapter(testClient);

  // 测试数据库连接
  const connected = await testClient.testConnection();
  if (!connected) {
    throw new Error('无法连接到测试数据库');
  }

  // 清理测试数据
  await cleanupTestData();

  // 初始化测试表结构
  await initializeTestTables();
}

/**
 * 测试数据库清理
 */
export async function teardownTestDatabase() {
  if (testClient) {
    await cleanupTestData();
    await testClient.close();
  }
}

/**
 * 清理测试数据
 */
export async function cleanupTestData() {
  const tables = [
    'fba_inventory',
    'inventory_details', 
    'product_analytics',
    'inventory_points'
  ];

  for (const table of tables) {
    try {
      await testClient.query(`DELETE FROM ${table} WHERE created_at >= CURDATE() - INTERVAL 30 DAY`);
    } catch (error) {
      console.warn(`清理表 ${table} 失败:`, error);
    }
  }
}

/**
 * 初始化测试表结构
 */
async function initializeTestTables() {
  // 这里可以创建测试专用的表结构或索引
  // 由于使用现有数据库，这里主要是验证表是否存在
  const tables = [
    'fba_inventory',
    'inventory_details', 
    'product_analytics'
  ];

  for (const table of tables) {
    const result = await testClient.query(`SHOW TABLES LIKE '${table}'`);
    if (result.data.length === 0) {
      throw new Error(`测试数据库缺少必要的表: ${table}`);
    }
  }
}

// Jest 全局设置钩子
beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  // 每个测试前的准备工作
  console.log('开始测试...');
});

afterEach(async () => {
  // 每个测试后的清理工作
  console.log('测试完成');
});

/**
 * 测试数据生成器
 */
export class TestDataGenerator {
  
  /**
   * 生成测试FBA库存数据
   */
  static generateFbaInventoryData(count: number = 10) {
    const data = [];
    const marketplaces = ['US', 'UK', 'DE', 'FR', 'ES', 'IT', 'JP'];
    const asins = ['B07XXXXX01', 'B08XXXXX02', 'B09XXXXX03', 'B10XXXXX04'];

    for (let i = 0; i < count; i++) {
      data.push({
        asin: asins[i % asins.length],
        marketplace: marketplaces[i % marketplaces.length],
        seller_sku: `TEST-SKU-${i.toString().padStart(3, '0')}`,
        product_name: `测试产品 ${i + 1}`,
        condition: 'New',
        price: Math.round((Math.random() * 100 + 10) * 100) / 100,
        quantity_available: Math.floor(Math.random() * 1000),
        quantity_inbound_working: Math.floor(Math.random() * 100),
        quantity_inbound_shipped: Math.floor(Math.random() * 50),
        quantity_inbound_receiving: Math.floor(Math.random() * 30),
        reserved_quantity: Math.floor(Math.random() * 20),
        fulfillable_quantity: Math.floor(Math.random() * 900),
        created_at: new Date(),
        updated_at: new Date(),
        data_date: new Date().toISOString().split('T')[0],
        sales_person: ['张三', '李四', '王五'][i % 3],
      });
    }

    return data;
  }

  /**
   * 生成测试库存明细数据
   */
  static generateInventoryDetailsData(count: number = 10) {
    const data = [];
    const asins = ['B07XXXXX01', 'B08XXXXX02', 'B09XXXXX03', 'B10XXXXX04'];
    const marketplaces = ['US', 'UK', 'DE'];

    for (let i = 0; i < count; i++) {
      data.push({
        asin: asins[i % asins.length],
        marketplace: marketplaces[i % marketplaces.length],
        product_name: `测试产品详情 ${i + 1}`,
        condition: 'New',
        your_price: Math.round((Math.random() * 50 + 5) * 100) / 100,
        mfn_listing_exists: i % 2 === 0,
        mfn_fulfillable_quantity: Math.floor(Math.random() * 100),
        afn_listing_exists: true,
        afn_warehouse_quantity: Math.floor(Math.random() * 500),
        afn_fulfillable_quantity: Math.floor(Math.random() * 400),
        afn_unsellable_quantity: Math.floor(Math.random() * 10),
        afn_reserved_quantity: Math.floor(Math.random() * 20),
        afn_total_quantity: Math.floor(Math.random() * 600),
        per_unit_volume: Math.round(Math.random() * 10 * 100) / 100,
        afn_inbound_working_quantity: Math.floor(Math.random() * 50),
        afn_inbound_shipped_quantity: Math.floor(Math.random() * 30),
        afn_inbound_receiving_quantity: Math.floor(Math.random() * 20),
        created_at: new Date(),
        updated_at: new Date(),
        data_date: new Date().toISOString().split('T')[0],
      });
    }

    return data;
  }

  /**
   * 生成测试广告分析数据
   */
  static generateProductAnalyticsData(count: number = 10) {
    const data = [];
    const asins = ['B07XXXXX01', 'B08XXXXX02', 'B09XXXXX03', 'B10XXXXX04'];
    const campaigns = ['Campaign A', 'Campaign B', 'Campaign C'];

    for (let i = 0; i < count; i++) {
      const impressions = Math.floor(Math.random() * 10000 + 1000);
      const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.01)); // 1-6% CTR
      const spend = Math.round((clicks * (Math.random() * 2 + 0.5)) * 100) / 100; // $0.5-$2.5 CPC
      const sales = Math.round((clicks * (Math.random() * 0.2 + 0.05) * Math.random() * 50 + 10) * 100) / 100; // 5-25% CVR

      data.push({
        campaign_name: campaigns[i % campaigns.length],
        ad_group_name: `Ad Group ${i + 1}`,
        asin: asins[i % asins.length],
        product_name: `测试广告产品 ${i + 1}`,
        impressions,
        clicks,
        ctr: Math.round((clicks / impressions) * 10000) / 100, // CTR百分比
        spend,
        cpc: Math.round((spend / clicks) * 100) / 100,
        sales,
        acos: Math.round((spend / sales) * 10000) / 100, // ACOS百分比
        roas: Math.round((sales / spend) * 100) / 100,
        orders: Math.floor(clicks * (Math.random() * 0.2 + 0.05)),
        conversion_rate: Math.round((Math.random() * 0.2 + 0.05) * 10000) / 100,
        cost_per_order: spend > 0 ? Math.round((spend / Math.max(1, Math.floor(clicks * 0.1))) * 100) / 100 : 0,
        created_at: new Date(),
        updated_at: new Date(),
        data_date: new Date().toISOString().split('T')[0],
      });
    }

    return data;
  }

  /**
   * 插入测试数据到数据库
   */
  static async insertTestData(
    type: 'fba_inventory' | 'inventory_details' | 'product_analytics',
    data: any[]
  ) {
    if (!testClient) {
      throw new Error('测试数据库客户端未初始化');
    }

    const updateClause = Object.keys(data[0] || {})
      .map(key => `${key} = VALUES(${key})`)
      .join(', ');
    return await testClient.batchInsert(type, data, updateClause);
  }
}

/**
 * 测试断言辅助函数
 */
export class TestAssertions {
  
  /**
   * 验证数据库记录数量
   */
  static async assertRecordCount(table: string, expectedCount: number) {
    const result = await testClient.query(`SELECT COUNT(*) as count FROM ${table}`);
    const actualCount = result.data[0].count;
    
    if (actualCount !== expectedCount) {
      throw new Error(`表 ${table} 记录数量不匹配: 期望 ${expectedCount}, 实际 ${actualCount}`);
    }
  }

  /**
   * 验证数据字段完整性
   */
  static assertDataIntegrity(data: any, requiredFields: string[]) {
    for (const field of requiredFields) {
      if (!(field in data) || data[field] === null || data[field] === undefined) {
        throw new Error(`缺少必要字段: ${field}`);
      }
    }
  }

  /**
   * 验证数值范围
   */
  static assertNumberRange(value: number, min: number, max: number, fieldName: string) {
    if (value < min || value > max) {
      throw new Error(`${fieldName} 值 ${value} 超出期望范围 [${min}, ${max}]`);
    }
  }

  /**
   * 验证数据一致性
   */
  static assertDataConsistency(source: any, target: any, fields: string[]) {
    for (const field of fields) {
      if (source[field] !== target[field]) {
        throw new Error(`字段 ${field} 数据不一致: 源数据 ${source[field]}, 目标数据 ${target[field]}`);
      }
    }
  }
}