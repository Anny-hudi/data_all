/**
 * 库存明细数据同步测试
 * 测试库存明细数据的完整同步流程和数据准确性
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { testClient, testAdapter, TestDataGenerator, TestAssertions } from '../setup';
import { AdDataDAO } from '../../src/lib/database/ad-data-dao';

describe('库存明细数据同步测试', () => {
  let adDataDAO: AdDataDAO;

  beforeEach(async () => {
    adDataDAO = new AdDataDAO(testClient);
    
    // 清理测试数据
    await testClient.query('DELETE FROM inventory_details WHERE data_date >= CURDATE()');
  });

  describe('库存明细数据写入测试', () => {
    test('应该能够批量插入库存明细数据', async () => {
      const testData = TestDataGenerator.generateInventoryDetailsData(6);
      
      const result = await TestDataGenerator.insertTestData('inventory_details', testData);
      
      expect(result.affectedRows).toBe(6);
      await TestAssertions.assertRecordCount('inventory_details', 6);
    });

    test('应该能够处理库存明细数据更新', async () => {
      const testData = TestDataGenerator.generateInventoryDetailsData(3);
      await TestDataGenerator.insertTestData('inventory_details', testData);
      
      // 更新库存数据
      const updatedData = testData.map(item => ({
        ...item,
        afn_warehouse_quantity: item.afn_warehouse_quantity + 200,
        afn_fulfillable_quantity: item.afn_fulfillable_quantity + 150,
        your_price: item.your_price + 5,
        updated_at: new Date(),
      }));
      
      const result = await TestDataGenerator.insertTestData('inventory_details', updatedData);
      
      expect(result.affectedRows).toBeGreaterThan(0);
      await TestAssertions.assertRecordCount('inventory_details', 3);
      
      // 验证数据更新
      const updatedRecord = await adDataDAO.getInventoryDetails({
        asin: testData[0].asin,
        marketplace: testData[0].marketplace,
      });
      
      expect(updatedRecord.data[0].afn_warehouse_quantity).toBe(testData[0].afn_warehouse_quantity + 200);
      expect(updatedRecord.data[0].your_price).toBe(testData[0].your_price + 5);
    });

    test('应该正确处理MFN和AFN库存类型', async () => {
      const testData = [
        // MFN库存
        {
          ...TestDataGenerator.generateInventoryDetailsData(1)[0],
          asin: 'B07MFN001',
          mfn_listing_exists: true,
          mfn_fulfillable_quantity: 100,
          afn_listing_exists: false,
          afn_warehouse_quantity: 0,
          afn_fulfillable_quantity: 0,
        },
        // AFN库存
        {
          ...TestDataGenerator.generateInventoryDetailsData(1)[0],
          asin: 'B07AFN001',
          mfn_listing_exists: false,
          mfn_fulfillable_quantity: 0,
          afn_listing_exists: true,
          afn_warehouse_quantity: 300,
          afn_fulfillable_quantity: 280,
        },
        // 混合库存
        {
          ...TestDataGenerator.generateInventoryDetailsData(1)[0],
          asin: 'B07MIX001',
          mfn_listing_exists: true,
          mfn_fulfillable_quantity: 50,
          afn_listing_exists: true,
          afn_warehouse_quantity: 200,
          afn_fulfillable_quantity: 180,
        },
      ];
      
      await TestDataGenerator.insertTestData('inventory_details', testData);
      
      const result = await adDataDAO.getInventoryDetails({});
      
      // 验证MFN库存
      const mfnRecord = result.data.find(r => r.asin === 'B07MFN001');
      expect(mfnRecord?.mfn_listing_exists).toBe(true);
      expect(mfnRecord?.mfn_fulfillable_quantity).toBe(100);
      expect(mfnRecord?.afn_listing_exists).toBe(false);
      
      // 验证AFN库存
      const afnRecord = result.data.find(r => r.asin === 'B07AFN001');
      expect(afnRecord?.afn_listing_exists).toBe(true);
      expect(afnRecord?.afn_warehouse_quantity).toBe(300);
      expect(afnRecord?.mfn_listing_exists).toBe(false);
      
      // 验证混合库存
      const mixRecord = result.data.find(r => r.asin === 'B07MIX001');
      expect(mixRecord?.mfn_listing_exists).toBe(true);
      expect(mixRecord?.afn_listing_exists).toBe(true);
      expect(mixRecord?.mfn_fulfillable_quantity).toBe(50);
      expect(mixRecord?.afn_fulfillable_quantity).toBe(180);
    });
  });

  describe('库存明细数据查询测试', () => {
    beforeEach(async () => {
      // 准备多样化库存明细测试数据
      const usData = TestDataGenerator.generateInventoryDetailsData(4).map(item => ({
        ...item,
        marketplace: 'US',
        asin: `B07US00${item.asin.slice(-1)}`,
      }));
      
      const ukData = TestDataGenerator.generateInventoryDetailsData(3).map(item => ({
        ...item,
        marketplace: 'UK',
        asin: `B07UK00${item.asin.slice(-1)}`,
      }));
      
      const deData = TestDataGenerator.generateInventoryDetailsData(3).map(item => ({
        ...item,
        marketplace: 'DE',
        asin: `B07DE00${item.asin.slice(-1)}`,
      }));
      
      await TestDataGenerator.insertTestData('inventory_details', [...usData, ...ukData, ...deData]);
    });

    test('应该能够根据ASIN查询库存明细', async () => {
      const targetAsin = 'B07US001';
      
      const result = await adDataDAO.getInventoryDetails({ asin: targetAsin });
      
      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(record => {
        expect(record.asin).toBe(targetAsin);
        TestAssertions.assertDataIntegrity(record, [
          'asin', 'marketplace', 'product_name', 'afn_warehouse_quantity', 'afn_fulfillable_quantity'
        ]);
      });
    });

    test('应该能够根据市场筛选库存明细', async () => {
      const targetMarketplace = 'UK';
      
      const result = await adDataDAO.getInventoryDetails({ marketplace: targetMarketplace });
      
      expect(result.data.length).toBe(3);
      result.data.forEach(record => {
        expect(record.marketplace).toBe(targetMarketplace);
      });
    });

    test('应该能够查询有AFN库存的产品', async () => {
      const result = await adDataDAO.getInventoryDetails({ 
        hasAfnInventory: true 
      });
      
      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(record => {
        expect(record.afn_listing_exists).toBe(true);
        expect(record.afn_warehouse_quantity).toBeGreaterThan(0);
      });
    });

    test('应该能够查询有MFN库存的产品', async () => {
      // 先插入一些MFN库存数据
      const mfnData = TestDataGenerator.generateInventoryDetailsData(2).map(item => ({
        ...item,
        asin: `B07MFN0${item.asin.slice(-1)}`,
        mfn_listing_exists: true,
        mfn_fulfillable_quantity: 100,
      }));
      
      await TestDataGenerator.insertTestData('inventory_details', mfnData);
      
      const result = await adDataDAO.getInventoryDetails({ 
        hasMfnInventory: true 
      });
      
      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(record => {
        expect(record.mfn_listing_exists).toBe(true);
        expect(record.mfn_fulfillable_quantity).toBeGreaterThan(0);
      });
    });

    test('应该能够按总库存量排序查询', async () => {
      const result = await adDataDAO.getInventoryDetails(
        {},
        { sortBy: 'afn_total_quantity', sortOrder: 'desc' }
      );
      
      expect(result.data.length).toBe(10);
      
      // 验证排序正确性
      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i].afn_total_quantity).toBeLessThanOrEqual(result.data[i - 1].afn_total_quantity);
      }
    });
  });

  describe('库存明细数据适配器测试', () => {
    beforeEach(async () => {
      // 准备不同库存状态的测试数据
      const lowStockData = TestDataGenerator.generateInventoryDetailsData(3).map(item => ({
        ...item,
        asin: `B07LOW0${item.asin.slice(-1)}`,
        afn_fulfillable_quantity: 15, // 低库存
        afn_warehouse_quantity: 20,
      }));
      
      const highStockData = TestDataGenerator.generateInventoryDetailsData(3).map(item => ({
        ...item,
        asin: `B07HIGH${item.asin.slice(-1)}`,
        afn_fulfillable_quantity: 500, // 高库存
        afn_warehouse_quantity: 600,
      }));
      
      const outOfStockData = TestDataGenerator.generateInventoryDetailsData(2).map(item => ({
        ...item,
        asin: `B07OUT0${item.asin.slice(-1)}`,
        afn_fulfillable_quantity: 0, // 断货
        afn_warehouse_quantity: 0,
      }));
      
      await TestDataGenerator.insertTestData('inventory_details', [...lowStockData, ...highStockData, ...outOfStockData]);
    });

    test('应该能够获取库存明细汇总数据', async () => {
      const summary = await testAdapter.getInventoryDetailsSummary();
      
      TestAssertions.assertDataIntegrity(summary, [
        'totalProducts', 'totalAfnInventory', 'totalMfnInventory', 'averagePrice'
      ]);
      
      TestAssertions.assertNumberRange(summary.totalProducts, 1, 1000, 'totalProducts');
      TestAssertions.assertNumberRange(summary.totalAfnInventory, 0, 1000000, 'totalAfnInventory');
      TestAssertions.assertNumberRange(summary.averagePrice, 0, 1000, 'averagePrice');
    });

    test('应该能够识别低库存产品', async () => {
      const lowStockItems = await testAdapter.getLowStockInventoryDetails(50); // 库存少于50的产品
      
      expect(Array.isArray(lowStockItems)).toBe(true);
      expect(lowStockItems.length).toBeGreaterThan(0);
      
      lowStockItems.forEach(item => {
        expect(item.afn_fulfillable_quantity).toBeLessThan(50);
        TestAssertions.assertDataIntegrity(item, [
          'asin', 'marketplace', 'product_name', 'afn_fulfillable_quantity'
        ]);
      });
    });

    test('应该能够识别断货产品', async () => {
      const outOfStockItems = await testAdapter.getOutOfStockItems();
      
      expect(Array.isArray(outOfStockItems)).toBe(true);
      expect(outOfStockItems.length).toBe(2); // 我们插入了2个断货产品
      
      outOfStockItems.forEach(item => {
        expect(item.afn_fulfillable_quantity).toBe(0);
        expect(item.afn_warehouse_quantity).toBe(0);
      });
    });

    test('应该能够按市场分组库存明细', async () => {
      const groupedData = await testAdapter.getInventoryByMarketplace();
      
      expect(Array.isArray(groupedData)).toBe(true);
      expect(groupedData.length).toBeGreaterThan(0);
      
      groupedData.forEach(group => {
        TestAssertions.assertDataIntegrity(group, [
          'marketplace', 'productCount', 'totalAfnInventory', 'totalMfnInventory'
        ]);
        expect(group.productCount).toBeGreaterThan(0);
      });
    });

    test('应该能够计算库存健康度指标', async () => {
      const healthMetrics = await testAdapter.getInventoryHealthMetrics();
      
      TestAssertions.assertDataIntegrity(healthMetrics, [
        'totalProducts', 'lowStockCount', 'outOfStockCount', 'healthyStockCount'
      ]);
      
      // 验证数量关系
      const totalCalculated = healthMetrics.lowStockCount + healthMetrics.outOfStockCount + healthMetrics.healthyStockCount;
      expect(totalCalculated).toBe(healthMetrics.totalProducts);
    });
  });

  describe('库存数量计算测试', () => {
    test('应该正确计算AFN总库存量', async () => {
      const testData = [{
        asin: 'B07CALC001',
        marketplace: 'US',
        product_name: '库存计算测试产品',
        condition: 'New',
        your_price: 25.99,
        mfn_listing_exists: false,
        mfn_fulfillable_quantity: 0,
        afn_listing_exists: true,
        afn_warehouse_quantity: 200,
        afn_fulfillable_quantity: 180,
        afn_unsellable_quantity: 10,
        afn_reserved_quantity: 20,
        afn_total_quantity: 210, // warehouse + unsellable = 200 + 10
        per_unit_volume: 0.5,
        afn_inbound_working_quantity: 50,
        afn_inbound_shipped_quantity: 30,
        afn_inbound_receiving_quantity: 20,
        created_at: new Date(),
        updated_at: new Date(),
        data_date: new Date().toISOString().split('T')[0],
      }];
      
      await TestDataGenerator.insertTestData('inventory_details', testData);
      
      const result = await adDataDAO.getInventoryDetails({});
      const record = result.data[0];
      
      // 验证库存计算正确性
      const expectedTotal = record.afn_warehouse_quantity + record.afn_unsellable_quantity;
      expect(record.afn_total_quantity).toBe(expectedTotal);
      
      // 验证可售库存小于等于仓库库存
      expect(record.afn_fulfillable_quantity).toBeLessThanOrEqual(record.afn_warehouse_quantity);
    });

    test('应该正确处理在途库存', async () => {
      const testData = [{
        asin: 'B07INBOUND01',
        marketplace: 'US',
        product_name: '在途库存测试产品',
        condition: 'New',
        your_price: 30.99,
        mfn_listing_exists: false,
        mfn_fulfillable_quantity: 0,
        afn_listing_exists: true,
        afn_warehouse_quantity: 100,
        afn_fulfillable_quantity: 90,
        afn_unsellable_quantity: 5,
        afn_reserved_quantity: 15,
        afn_total_quantity: 105,
        per_unit_volume: 0.8,
        afn_inbound_working_quantity: 100, // 计划中
        afn_inbound_shipped_quantity: 80,  // 已发货
        afn_inbound_receiving_quantity: 60, // 接收中
        created_at: new Date(),
        updated_at: new Date(),
        data_date: new Date().toISOString().split('T')[0],
      }];
      
      await TestDataGenerator.insertTestData('inventory_details', testData);
      
      const result = await adDataDAO.getInventoryDetails({});
      const record = result.data[0];
      
      // 验证在途库存数量关系
      expect(record.afn_inbound_receiving_quantity).toBeLessThanOrEqual(record.afn_inbound_shipped_quantity);
      expect(record.afn_inbound_shipped_quantity).toBeLessThanOrEqual(record.afn_inbound_working_quantity);
      
      // 验证总在途库存计算
      const totalInbound = record.afn_inbound_working_quantity + record.afn_inbound_shipped_quantity + record.afn_inbound_receiving_quantity;
      expect(totalInbound).toBeGreaterThan(0);
    });

    test('应该正确处理预留库存', async () => {
      const testData = [{
        asin: 'B07RESERVE01',
        marketplace: 'US',
        product_name: '预留库存测试产品',
        condition: 'New',
        your_price: 20.99,
        mfn_listing_exists: false,
        mfn_fulfillable_quantity: 0,
        afn_listing_exists: true,
        afn_warehouse_quantity: 300,
        afn_fulfillable_quantity: 250, // 仓库库存 - 预留库存 = 300 - 50
        afn_unsellable_quantity: 20,
        afn_reserved_quantity: 50,
        afn_total_quantity: 320,
        per_unit_volume: 1.2,
        afn_inbound_working_quantity: 0,
        afn_inbound_shipped_quantity: 0,
        afn_inbound_receiving_quantity: 0,
        created_at: new Date(),
        updated_at: new Date(),
        data_date: new Date().toISOString().split('T')[0],
      }];
      
      await TestDataGenerator.insertTestData('inventory_details', testData);
      
      const result = await adDataDAO.getInventoryDetails({});
      const record = result.data[0];
      
      // 验证预留库存逻辑
      expect(record.afn_reserved_quantity).toBe(50);
      expect(record.afn_fulfillable_quantity).toBe(record.afn_warehouse_quantity - record.afn_reserved_quantity);
      expect(record.afn_fulfillable_quantity).toBe(250);
    });
  });

  describe('库存明细数据完整性测试', () => {
    test('应该验证库存明细必要字段', async () => {
      const testData = TestDataGenerator.generateInventoryDetailsData(1);
      await TestDataGenerator.insertTestData('inventory_details', testData);
      
      const result = await adDataDAO.getInventoryDetails({});
      const record = result.data[0];
      
      const requiredFields = [
        'asin', 'marketplace', 'product_name', 'condition',
        'afn_warehouse_quantity', 'afn_fulfillable_quantity', 'afn_total_quantity'
      ];
      
      TestAssertions.assertDataIntegrity(record, requiredFields);
    });

    test('应该验证库存数量逻辑正确性', async () => {
      const testData = TestDataGenerator.generateInventoryDetailsData(5);
      await TestDataGenerator.insertTestData('inventory_details', testData);
      
      const result = await adDataDAO.getInventoryDetails({});
      
      result.data.forEach(record => {
        // 可售库存不应超过仓库库存
        expect(record.afn_fulfillable_quantity).toBeLessThanOrEqual(record.afn_warehouse_quantity);
        
        // 总库存应该包含仓库库存
        expect(record.afn_total_quantity).toBeGreaterThanOrEqual(record.afn_warehouse_quantity);
        
        // 价格应该大于0
        if (record.your_price) {
          expect(record.your_price).toBeGreaterThan(0);
        }
        
        // 体积应该大于等于0
        if (record.per_unit_volume) {
          expect(record.per_unit_volume).toBeGreaterThanOrEqual(0);
        }
      });
    });

    test('应该验证布尔字段类型正确', async () => {
      const testData = TestDataGenerator.generateInventoryDetailsData(1);
      await TestDataGenerator.insertTestData('inventory_details', testData);
      
      const result = await adDataDAO.getInventoryDetails({});
      const record = result.data[0];
      
      // 验证布尔字段
      expect(typeof record.mfn_listing_exists).toBe('boolean');
      expect(typeof record.afn_listing_exists).toBe('boolean');
    });
  });

  describe('库存明细性能测试', () => {
    test('大量库存明细数据插入性能测试', async () => {
      const largeDataSet = TestDataGenerator.generateInventoryDetailsData(1500);
      
      const startTime = Date.now();
      await TestDataGenerator.insertTestData('inventory_details', largeDataSet);
      const endTime = Date.now();
      
      const insertTime = endTime - startTime;
      console.log(`插入1500条库存明细数据耗时: ${insertTime}ms`);
      
      await TestAssertions.assertRecordCount('inventory_details', 1500);
      expect(insertTime).toBeLessThan(12000); // 12秒内完成
    });

    test('库存明细数据复杂查询性能测试', async () => {
      // 准备大量测试数据
      const largeDataSet = TestDataGenerator.generateInventoryDetailsData(2000);
      await TestDataGenerator.insertTestData('inventory_details', largeDataSet);
      
      // 测试复杂查询性能
      const startTime = Date.now();
      const result = await adDataDAO.getInventoryDetails(
        { marketplace: 'US', hasAfnInventory: true },
        { page: 1, limit: 50, sortBy: 'afn_total_quantity', sortOrder: 'desc' }
      );
      const endTime = Date.now();
      
      const queryTime = endTime - startTime;
      console.log(`库存明细复杂查询耗时: ${queryTime}ms`);
      
      expect(result.data.length).toBeLessThanOrEqual(50);
      expect(queryTime).toBeLessThan(2500); // 2.5秒内完成
    });
  });

  describe('边界条件测试', () => {
    test('应该能够处理零库存情况', async () => {
      const testData = [{
        asin: 'B07ZERO001',
        marketplace: 'US',
        product_name: '零库存测试产品',
        condition: 'New',
        your_price: 15.99,
        mfn_listing_exists: false,
        mfn_fulfillable_quantity: 0,
        afn_listing_exists: true,
        afn_warehouse_quantity: 0,
        afn_fulfillable_quantity: 0,
        afn_unsellable_quantity: 0,
        afn_reserved_quantity: 0,
        afn_total_quantity: 0,
        per_unit_volume: 0.3,
        afn_inbound_working_quantity: 0,
        afn_inbound_shipped_quantity: 0,
        afn_inbound_receiving_quantity: 0,
        created_at: new Date(),
        updated_at: new Date(),
        data_date: new Date().toISOString().split('T')[0],
      }];
      
      await TestDataGenerator.insertTestData('inventory_details', testData);
      
      const result = await adDataDAO.getInventoryDetails({ asin: 'B07ZERO001' });
      expect(result.data.length).toBe(1);
      
      const record = result.data[0];
      expect(record.afn_warehouse_quantity).toBe(0);
      expect(record.afn_fulfillable_quantity).toBe(0);
      expect(record.afn_total_quantity).toBe(0);
    });

    test('应该能够处理极大库存数值', async () => {
      const testData = [{
        asin: 'B07LARGE001',
        marketplace: 'US',
        product_name: '大库存测试产品',
        condition: 'New',
        your_price: 99.99,
        mfn_listing_exists: false,
        mfn_fulfillable_quantity: 0,
        afn_listing_exists: true,
        afn_warehouse_quantity: 999999,
        afn_fulfillable_quantity: 999000,
        afn_unsellable_quantity: 500,
        afn_reserved_quantity: 999,
        afn_total_quantity: 1000499,
        per_unit_volume: 5.0,
        afn_inbound_working_quantity: 50000,
        afn_inbound_shipped_quantity: 30000,
        afn_inbound_receiving_quantity: 10000,
        created_at: new Date(),
        updated_at: new Date(),
        data_date: new Date().toISOString().split('T')[0],
      }];
      
      await TestDataGenerator.insertTestData('inventory_details', testData);
      
      const result = await adDataDAO.getInventoryDetails({ asin: 'B07LARGE001' });
      expect(result.data.length).toBe(1);
      
      const record = result.data[0];
      expect(record.afn_warehouse_quantity).toBe(999999);
      expect(record.afn_total_quantity).toBe(1000499);
    });
  });
});