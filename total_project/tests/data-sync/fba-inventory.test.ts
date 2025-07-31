/**
 * FBA库存数据同步测试
 * 测试从赛狐数据库到MySQL再到系统调用的完整流程
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { testClient, testAdapter, TestDataGenerator, TestAssertions } from '../setup';
import { AdDataDAO } from '../../src/lib/database/ad-data-dao';

describe('FBA库存数据同步测试', () => {
  let adDataDAO: AdDataDAO;

  beforeEach(async () => {
    adDataDAO = new AdDataDAO(testClient);
    
    // 清理测试数据
    await testClient.query('DELETE FROM fba_inventory WHERE data_date >= CURDATE()');
  });

  describe('数据写入测试', () => {
    test('应该能够批量插入FBA库存数据', async () => {
      // 生成测试数据
      const testData = TestDataGenerator.generateFbaInventoryData(5);
      
      // 插入数据
      const result = await TestDataGenerator.insertTestData('fba_inventory', testData);
      
      // 验证插入成功
      expect(result.affectedRows).toBe(5);
      
      // 验证数据库记录数量
      await TestAssertions.assertRecordCount('fba_inventory', 5);
    });

    test('应该能够处理重复数据更新', async () => {
      // 第一次插入
      const testData = TestDataGenerator.generateFbaInventoryData(3);
      await TestDataGenerator.insertTestData('fba_inventory', testData);
      
      // 修改数据再次插入（相同ASIN和marketplace）
      const updatedData = testData.map(item => ({
        ...item,
        quantity_available: item.quantity_available + 100,
        updated_at: new Date(),
      }));
      
      const result = await TestDataGenerator.insertTestData('fba_inventory', updatedData);
      
      // 验证更新成功，记录数量不变
      expect(result.affectedRows).toBeGreaterThan(0);
      await TestAssertions.assertRecordCount('fba_inventory', 3);
      
      // 验证数据已更新
      const updatedRecord = await adDataDAO.getFbaInventory({
        asin: testData[0].asin,
        marketplace: testData[0].marketplace,
      });
      
      expect(updatedRecord.data[0].quantity_available).toBe(testData[0].quantity_available + 100);
    });
  });

  describe('数据查询测试', () => {
    beforeEach(async () => {
      // 准备测试数据
      const testData = TestDataGenerator.generateFbaInventoryData(10);
      await TestDataGenerator.insertTestData('fba_inventory', testData);
    });

    test('应该能够根据ASIN查询FBA库存', async () => {
      const targetAsin = 'B07XXXXX01';
      
      const result = await adDataDAO.getFbaInventory({ asin: targetAsin });
      
      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(record => {
        expect(record.asin).toBe(targetAsin);
        TestAssertions.assertDataIntegrity(record, [
          'asin', 'marketplace', 'product_name', 'quantity_available', 'fulfillable_quantity'
        ]);
      });
    });

    test('应该能够根据市场筛选FBA库存', async () => {
      const targetMarketplace = 'US';
      
      const result = await adDataDAO.getFbaInventory({ marketplace: targetMarketplace });
      
      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(record => {
        expect(record.marketplace).toBe(targetMarketplace);
      });
    });

    test('应该能够分页查询FBA库存', async () => {
      const page1 = await adDataDAO.getFbaInventory({}, { page: 1, limit: 5 });
      const page2 = await adDataDAO.getFbaInventory({}, { page: 2, limit: 5 });
      
      expect(page1.data.length).toBe(5);
      expect(page2.data.length).toBe(5);
      expect(page1.total).toBe(10);
      expect(page2.total).toBe(10);
      
      // 验证分页数据不重复
      const page1Ids = page1.data.map(r => r.id);
      const page2Ids = page2.data.map(r => r.id);
      const intersection = page1Ids.filter(id => page2Ids.includes(id));
      expect(intersection.length).toBe(0);
    });

    test('应该能够按日期范围查询FBA库存', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();
      
      const result = await adDataDAO.getFbaInventory({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      
      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(record => {
        const recordDate = new Date(record.data_date);
        expect(recordDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(recordDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });
  });

  describe('数据适配器测试', () => {
    beforeEach(async () => {
      // 准备多样化测试数据
      const testData = [
        ...TestDataGenerator.generateFbaInventoryData(5).map(item => ({
          ...item,
          marketplace: 'US',
          sales_person: '张三',
        })),
        ...TestDataGenerator.generateFbaInventoryData(3).map(item => ({
          ...item,
          marketplace: 'UK',
          sales_person: '李四',
        })),
      ];
      await TestDataGenerator.insertTestData('fba_inventory', testData);
    });

    test('应该能够获取FBA库存汇总数据', async () => {
      const summary = await testAdapter.getFbaInventorySummary();
      
      // 验证汇总数据结构
      TestAssertions.assertDataIntegrity(summary, [
        'totalProducts', 'totalInventory', 'marketplaces', 'averagePrice'
      ]);
      
      // 验证数值合理性
      TestAssertions.assertNumberRange(summary.totalProducts, 1, 100, 'totalProducts');
      TestAssertions.assertNumberRange(summary.totalInventory, 0, 100000, 'totalInventory');
      expect(summary.marketplaces.length).toBeGreaterThan(0);
    });

    test('应该能够按市场分组FBA库存数据', async () => {
      const groupedData = await testAdapter.getFbaInventoryByMarketplace();
      
      expect(Array.isArray(groupedData)).toBe(true);
      expect(groupedData.length).toBeGreaterThan(0);
      
      groupedData.forEach(group => {
        TestAssertions.assertDataIntegrity(group, [
          'marketplace', 'productCount', 'totalInventory', 'averagePrice'
        ]);
        expect(['US', 'UK', 'DE', 'FR', 'ES', 'IT', 'JP']).toContain(group.marketplace);
      });
    });

    test('应该能够获取低库存预警数据', async () => {
      const lowStockItems = await testAdapter.getLowStockItems(100); // 库存少于100的商品
      
      expect(Array.isArray(lowStockItems)).toBe(true);
      
      lowStockItems.forEach(item => {
        TestAssertions.assertDataIntegrity(item, [
          'asin', 'marketplace', 'product_name', 'quantity_available'
        ]);
        expect(item.quantity_available).toBeLessThan(100);
      });
    });
  });

  describe('数据完整性测试', () => {
    test('应该验证必要字段存在', async () => {
      const testData = TestDataGenerator.generateFbaInventoryData(1);
      await TestDataGenerator.insertTestData('fba_inventory', testData);
      
      const result = await adDataDAO.getFbaInventory({});
      const record = result.data[0];
      
      // 验证所有必要字段
      const requiredFields = [
        'asin', 'marketplace', 'seller_sku', 'product_name',
        'quantity_available', 'fulfillable_quantity', 'data_date'
      ];
      
      TestAssertions.assertDataIntegrity(record, requiredFields);
    });

    test('应该验证数值字段类型正确', async () => {
      const testData = TestDataGenerator.generateFbaInventoryData(1);
      await TestDataGenerator.insertTestData('fba_inventory', testData);
      
      const result = await adDataDAO.getFbaInventory({});
      const record = result.data[0];
      
      // 验证数值字段
      expect(typeof record.quantity_available).toBe('number');
      expect(typeof record.fulfillable_quantity).toBe('number');
      expect(typeof record.price).toBe('number');
      
      // 验证数值范围合理性
      TestAssertions.assertNumberRange(record.quantity_available, 0, 999999, 'quantity_available');
      TestAssertions.assertNumberRange(record.price, 0, 10000, 'price');
    });

    test('应该验证日期格式正确', async () => {
      const testData = TestDataGenerator.generateFbaInventoryData(1);
      await TestDataGenerator.insertTestData('fba_inventory', testData);
      
      const result = await adDataDAO.getFbaInventory({});
      const record = result.data[0];
      
      // 验证日期字段
      expect(record.data_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(record.created_at)).toBeInstanceOf(Date);
      expect(new Date(record.updated_at)).toBeInstanceOf(Date);
    });
  });

  describe('性能测试', () => {
    test('批量插入大量数据性能测试', async () => {
      const largeDataSet = TestDataGenerator.generateFbaInventoryData(1000);
      
      const startTime = Date.now();
      await TestDataGenerator.insertTestData('fba_inventory', largeDataSet);
      const endTime = Date.now();
      
      const insertTime = endTime - startTime;
      console.log(`插入1000条FBA库存数据耗时: ${insertTime}ms`);
      
      // 验证插入成功
      await TestAssertions.assertRecordCount('fba_inventory', 1000);
      
      // 性能断言：插入1000条记录应该在10秒内完成
      expect(insertTime).toBeLessThan(10000);
    });

    test('大数据量查询性能测试', async () => {
      // 准备大量测试数据
      const largeDataSet = TestDataGenerator.generateFbaInventoryData(5000);
      await TestDataGenerator.insertTestData('fba_inventory', largeDataSet);
      
      // 测试查询性能
      const startTime = Date.now();
      const result = await adDataDAO.getFbaInventory({}, { page: 1, limit: 100 });
      const endTime = Date.now();
      
      const queryTime = endTime - startTime;
      console.log(`查询FBA库存数据耗时: ${queryTime}ms`);
      
      // 验证查询结果
      expect(result.data.length).toBe(100);
      expect(result.total).toBe(5000);
      
      // 性能断言：查询应该在2秒内完成
      expect(queryTime).toBeLessThan(2000);
    });
  });

  describe('边界条件测试', () => {
    test('应该能够处理空数据插入', async () => {
      const result = await TestDataGenerator.insertTestData('fba_inventory', []);
      expect(result.affectedRows).toBe(0);
    });

    test('应该能够处理不存在的ASIN查询', async () => {
      const result = await adDataDAO.getFbaInventory({ asin: 'NONEXISTENT' });
      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
    });

    test('应该能够处理极大分页参数', async () => {
      const testData = TestDataGenerator.generateFbaInventoryData(10);
      await TestDataGenerator.insertTestData('fba_inventory', testData);
      
      const result = await adDataDAO.getFbaInventory({}, { page: 999, limit: 100 });
      expect(result.data.length).toBe(0);
      expect(result.total).toBe(10);
    });
  });
});