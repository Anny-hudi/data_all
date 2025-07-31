/**
 * 端到端集成测试
 * 测试从赛狐数据库同步到MySQL，再到API服务，最后到前端的完整数据流程
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { testClient, testAdapter, TestDataGenerator, TestAssertions } from '../setup';
import { NextRequest } from 'next/server';

// 模拟API路由处理器
import { GET as dashboardHandler } from '../../src/app/api/ad-data/dashboard/route';
import { GET as inventoryHandler } from '../../src/app/api/ad-data/inventory-points/route';
import { GET as metricsHandler } from '../../src/app/api/ad-data/metrics/route';
import { GET as trendsHandler } from '../../src/app/api/ad-data/trends/route';

describe('端到端集成测试', () => {
  
  beforeAll(async () => {
    // 清理所有测试数据
    await testClient.query('DELETE FROM fba_inventory WHERE data_date >= CURDATE() - INTERVAL 1 DAY');
    await testClient.query('DELETE FROM inventory_details WHERE data_date >= CURDATE() - INTERVAL 1 DAY');
    await testClient.query('DELETE FROM product_analytics WHERE data_date >= CURDATE() - INTERVAL 1 DAY');
  });

  afterAll(async () => {
    // 测试完成后清理数据
    await testClient.query('DELETE FROM fba_inventory WHERE data_date >= CURDATE() - INTERVAL 1 DAY');
    await testClient.query('DELETE FROM inventory_details WHERE data_date >= CURDATE() - INTERVAL 1 DAY');
    await testClient.query('DELETE FROM product_analytics WHERE data_date >= CURDATE() - INTERVAL 1 DAY');
  });

  describe('完整数据同步流程测试', () => {
    
    test('应该能够完成FBA库存数据的端到端流程', async () => {
      // 步骤1: 模拟赛狐数据库同步 - 插入FBA库存数据
      const fbaData = TestDataGenerator.generateFbaInventoryData(10).map(item => ({
        ...item,
        asin: `B07E2E${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        marketplace: ['US', 'UK', 'DE'][Math.floor(Math.random() * 3)],
        sales_person: ['张三', '李四', '王五'][Math.floor(Math.random() * 3)],
      }));
      
      console.log('步骤1: 同步FBA库存数据到MySQL...');
      await TestDataGenerator.insertTestData('fba_inventory', fbaData);
      
      // 验证数据插入成功
      await TestAssertions.assertRecordCount('fba_inventory', 10);
      
      // 步骤2: 通过适配器查询数据
      console.log('步骤2: 通过数据适配器查询FBA库存...');
      const summary = await testAdapter.getFbaInventorySummary();
      
      TestAssertions.assertDataIntegrity(summary, [
        'totalProducts', 'totalInventory', 'marketplaces', 'averagePrice'
      ]);
      expect(summary.totalProducts).toBeGreaterThan(0);
      
      // 步骤3: 通过API接口获取数据
      console.log('步骤3: 通过API接口获取FBA库存数据...');
      const mockRequest = new NextRequest('http://localhost:3000/api/ad-data/inventory-points');
      const apiResponse = await inventoryHandler(mockRequest);
      const apiData = await apiResponse.json();
      
      expect(apiResponse.status).toBe(200);
      expect(apiData.success).toBe(true);
      expect(apiData.data.data.length).toBeGreaterThan(0);
      
      console.log('✅ FBA库存数据端到端流程测试通过');
    });

    test('应该能够完成广告分析数据的端到端流程', async () => {
      // 步骤1: 模拟赛狐数据库同步 - 插入广告分析数据
      const adData = TestDataGenerator.generateProductAnalyticsData(15).map(item => ({
        ...item,
        asin: `B07E2E${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        campaign_name: ['Spring Campaign', 'Summer Sale', 'Back to School'][Math.floor(Math.random() * 3)],
      }));
      
      console.log('步骤1: 同步广告分析数据到MySQL...');
      await TestDataGenerator.insertTestData('product_analytics', adData);
      
      // 验证数据插入成功
      await TestAssertions.assertRecordCount('product_analytics', 15);
      
      // 步骤2: 通过适配器查询汇总数据
      console.log('步骤2: 通过数据适配器查询广告汇总...');
      const adSummary = await testAdapter.getAdDataSummary();
      
      TestAssertions.assertDataIntegrity(adSummary, [
        'totalCampaigns', 'totalSpend', 'totalSales', 'averageRoas', 'averageAcos'
      ]);
      expect(adSummary.totalSpend).toBeGreaterThan(0);
      
      // 步骤3: 通过API接口获取指标数据
      console.log('步骤3: 通过API接口获取广告指标...');
      const mockRequest = new NextRequest('http://localhost:3000/api/ad-data/metrics');
      const apiResponse = await metricsHandler(mockRequest);
      const apiData = await apiResponse.json();
      
      expect(apiResponse.status).toBe(200);
      expect(apiData.success).toBe(true);
      expect(apiData.data.summary).toBeDefined();
      expect(apiData.data.summary.totalSpend).toBeGreaterThan(0);
      
      console.log('✅ 广告分析数据端到端流程测试通过');
    });

    test('应该能够完成库存明细数据的端到端流程', async () => {
      // 步骤1: 模拟赛狐数据库同步 - 插入库存明细数据
      const inventoryData = TestDataGenerator.generateInventoryDetailsData(12).map(item => ({
        ...item,
        asin: `B07E2E${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        marketplace: ['US', 'UK', 'DE', 'FR'][Math.floor(Math.random() * 4)],
      }));
      
      console.log('步骤1: 同步库存明细数据到MySQL...');
      await TestDataGenerator.insertTestData('inventory_details', inventoryData);
      
      // 验证数据插入成功
      await TestAssertions.assertRecordCount('inventory_details', 12);
      
      // 步骤2: 通过适配器查询库存健康度
      console.log('步骤2: 通过数据适配器查询库存健康度...');
      const healthMetrics = await testAdapter.getInventoryHealthMetrics();
      
      TestAssertions.assertDataIntegrity(healthMetrics, [
        'totalProducts', 'lowStockCount', 'outOfStockCount', 'healthyStockCount'
      ]);
      expect(healthMetrics.totalProducts).toBeGreaterThan(0);
      
      // 步骤3: 验证数据一致性
      console.log('步骤3: 验证库存数据一致性...');
      const totalCalculated = healthMetrics.lowStockCount + healthMetrics.outOfStockCount + healthMetrics.healthyStockCount;
      expect(totalCalculated).toBe(healthMetrics.totalProducts);
      
      console.log('✅ 库存明细数据端到端流程测试通过');
    });
  });

  describe('数据整合与一致性测试', () => {
    
    test('应该能够整合多个数据源创建统一的库存点视图', async () => {
      // 准备关联数据：相同ASIN的FBA库存、库存明细和广告数据
      const testAsin = 'B07UNIFIED01';
      const testMarketplace = 'US';
      
      // 插入FBA库存数据
      const fbaData = [{
        ...TestDataGenerator.generateFbaInventoryData(1)[0],
        asin: testAsin,
        marketplace: testMarketplace,
        product_name: '统一测试产品',
        quantity_available: 500,
        fulfillable_quantity: 480,
        sales_person: '张三',
      }];
      
      // 插入库存明细数据
      const inventoryDetailData = [{
        ...TestDataGenerator.generateInventoryDetailsData(1)[0],
        asin: testAsin,
        marketplace: testMarketplace,
        product_name: '统一测试产品',
        afn_warehouse_quantity: 500,
        afn_fulfillable_quantity: 480,
      }];
      
      // 插入广告分析数据
      const adData = [{
        ...TestDataGenerator.generateProductAnalyticsData(1)[0],
        asin: testAsin,
        product_name: '统一测试产品',
        spend: 100,
        sales: 400,
        roas: 4.0,
        acos: 25,
      }];
      
      console.log('插入关联测试数据...');
      await TestDataGenerator.insertTestData('fba_inventory', fbaData);
      await TestDataGenerator.insertTestData('inventory_details', inventoryDetailData);
      await TestDataGenerator.insertTestData('product_analytics', adData);
      
      // 通过适配器获取整合后的库存点数据
      console.log('获取整合后的库存点数据...');
      const inventoryPoints = await testAdapter.getInventoryPoints({
        asin: testAsin,
        marketplace: testMarketplace,
      });
      
      expect(inventoryPoints.data.length).toBe(1);
      const unifiedPoint = inventoryPoints.data[0];
      
      // 验证数据整合正确性
      expect(unifiedPoint.asin).toBe(testAsin);
      expect(unifiedPoint.marketplace).toBe(testMarketplace);
      expect(unifiedPoint.productName).toBe('统一测试产品');
      
      // 验证库存数据一致性
      expect(unifiedPoint.inventory.total).toBe(500);
      expect(unifiedPoint.inventory.fbaAvailable).toBe(480);
      
      // 验证广告数据整合
      expect(unifiedPoint.advertising.spend).toBe(100);
      expect(unifiedPoint.advertising.sales).toBe(400);
      expect(unifiedPoint.advertising.roas).toBe(4.0);
      expect(unifiedPoint.advertising.acoas).toBe(25);
      
      console.log('✅ 数据整合一致性测试通过');
    });

    test('应该能够处理数据不完整的情况', async () => {
      // 创建只有部分数据源的产品
      const partialAsin = 'B07PARTIAL01';
      const partialMarketplace = 'UK';
      
      // 只插入FBA库存数据，不插入广告数据
      const partialFbaData = [{
        ...TestDataGenerator.generateFbaInventoryData(1)[0],
        asin: partialAsin,
        marketplace: partialMarketplace,
        product_name: '部分数据测试产品',
        quantity_available: 200,
        fulfillable_quantity: 180,
      }];
      
      console.log('插入部分数据...');
      await TestDataGenerator.insertTestData('fba_inventory', partialFbaData);
      
      // 获取库存点数据
      const inventoryPoints = await testAdapter.getInventoryPoints({
        asin: partialAsin,
      });
      
      expect(inventoryPoints.data.length).toBe(1);
      const partialPoint = inventoryPoints.data[0];
      
      // 验证数据完整性处理
      expect(partialPoint.asin).toBe(partialAsin);
      expect(partialPoint.inventory.total).toBe(200);
      
      // 验证缺失广告数据的默认值处理
      expect(partialPoint.advertising.spend).toBe(0);
      expect(partialPoint.advertising.sales).toBe(0);
      expect(partialPoint.advertising.roas).toBe(0);
      
      console.log('✅ 部分数据处理测试通过');
    });
  });

  describe('API接口完整性测试', () => {
    
    beforeAll(async () => {
      // 为API测试准备完整的测试数据集
      console.log('准备API测试数据集...');
      
      // 插入多样化的测试数据
      const fbaTestData = TestDataGenerator.generateFbaInventoryData(20).map((item, index) => ({
        ...item,
        asin: `B07API${String(index).padStart(3, '0')}`,
        marketplace: ['US', 'UK', 'DE', 'FR', 'ES'][index % 5],
        sales_person: ['张三', '李四', '王五', '赵六'][index % 4],
      }));
      
      const inventoryTestData = TestDataGenerator.generateInventoryDetailsData(20).map((item, index) => ({
        ...item,
        asin: `B07API${String(index).padStart(3, '0')}`,
        marketplace: ['US', 'UK', 'DE', 'FR', 'ES'][index % 5],
      }));
      
      const adTestData = TestDataGenerator.generateProductAnalyticsData(20).map((item, index) => ({
        ...item,
        asin: `B07API${String(index).padStart(3, '0')}`,
        campaign_name: ['Campaign Alpha', 'Campaign Beta', 'Campaign Gamma'][index % 3],
      }));
      
      await TestDataGenerator.insertTestData('fba_inventory', fbaTestData);
      await TestDataGenerator.insertTestData('inventory_details', inventoryTestData);
      await TestDataGenerator.insertTestData('product_analytics', adTestData);
      
      console.log('API测试数据准备完成');
    });

    test('dashboard API应该返回完整的仪表板数据', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/ad-data/dashboard');
      
      console.log('测试Dashboard API...');
      const response = await dashboardHandler(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // 验证仪表板数据结构
      TestAssertions.assertDataIntegrity(data.data, [
        'summary', 'trends', 'distribution', 'inventoryPoints'
      ]);
      
      // 验证汇总数据
      TestAssertions.assertDataIntegrity(data.data.summary, [
        'totalProducts', 'totalInventoryPoints', 'totalInventory', 'totalDailySales', 'averageMetrics'
      ]);
      
      // 验证平均指标
      TestAssertions.assertDataIntegrity(data.data.summary.averageMetrics, [
        'impressions', 'clicks', 'spend', 'sales', 'ctr', 'cvr', 'cpc', 'roas', 'acoas'
      ]);
      
      console.log('✅ Dashboard API测试通过');
    });

    test('inventory-points API应该支持筛选和分页', async () => {
      // 测试基本查询
      const basicRequest = new NextRequest('http://localhost:3000/api/ad-data/inventory-points?limit=10');
      const basicResponse = await inventoryHandler(basicRequest);
      const basicData = await basicResponse.json();
      
      expect(basicResponse.status).toBe(200);
      expect(basicData.success).toBe(true);
      expect(basicData.data.data.length).toBeLessThanOrEqual(10);
      expect(basicData.data.total).toBeGreaterThan(0);
      
      // 测试ASIN筛选
      const asinRequest = new NextRequest('http://localhost:3000/api/ad-data/inventory-points?asin=B07API001');
      const asinResponse = await inventoryHandler(asinRequest);
      const asinData = await asinResponse.json();
      
      expect(asinResponse.status).toBe(200);
      expect(asinData.success).toBe(true);
      if (asinData.data.data.length > 0) {
        expect(asinData.data.data[0].asin).toBe('B07API001');
      }
      
      // 测试市场筛选
      const marketRequest = new NextRequest('http://localhost:3000/api/ad-data/inventory-points?marketplace=US');
      const marketResponse = await inventoryHandler(marketRequest);
      const marketData = await marketResponse.json();
      
      expect(marketResponse.status).toBe(200);
      expect(marketData.success).toBe(true);
      if (marketData.data.data.length > 0) {
        marketData.data.data.forEach((item: any) => {
          expect(item.marketplace).toBe('US');
        });
      }
      
      console.log('✅ Inventory Points API筛选测试通过');
    });

    test('metrics API应该返回正确的指标汇总', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/ad-data/metrics');
      
      console.log('测试Metrics API...');
      const response = await metricsHandler(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // 验证指标数据结构
      TestAssertions.assertDataIntegrity(data.data, ['summary', 'breakdown']);
      
      // 验证汇总指标
      TestAssertions.assertDataIntegrity(data.data.summary, [
        'totalSpend', 'totalSales', 'totalImpressions', 'totalClicks',
        'averageCtr', 'averageCvr', 'averageRoas', 'averageAcos'
      ]);
      
      // 验证指标数值合理性
      expect(data.data.summary.totalSpend).toBeGreaterThanOrEqual(0);
      expect(data.data.summary.totalSales).toBeGreaterThanOrEqual(0);
      expect(data.data.summary.averageCtr).toBeGreaterThanOrEqual(0);
      expect(data.data.summary.averageCtr).toBeLessThanOrEqual(100);
      
      console.log('✅ Metrics API测试通过');
    });

    test('trends API应该返回时间序列数据', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/ad-data/trends?days=7');
      
      console.log('测试Trends API...');
      const response = await trendsHandler(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // 验证趋势数据是数组
      expect(Array.isArray(data.data)).toBe(true);
      
      // 验证趋势数据结构
      if (data.data.length > 0) {
        data.data.forEach((dayData: any) => {
          TestAssertions.assertDataIntegrity(dayData, ['date', 'metrics']);
          expect(dayData.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          
          TestAssertions.assertDataIntegrity(dayData.metrics, [
            'impressions', 'clicks', 'spend', 'sales', 'ctr', 'cvr', 'cpc', 'roas', 'acoas'
          ]);
        });
      }
      
      console.log('✅ Trends API测试通过');
    });
  });

  describe('性能与负载测试', () => {
    
    test('应该能够处理大量数据的端到端流程', async () => {
      console.log('开始大数据量端到端性能测试...');
      
      // 清理现有数据
      await testClient.query('DELETE FROM fba_inventory WHERE asin LIKE "B07PERF%"');
      await testClient.query('DELETE FROM inventory_details WHERE asin LIKE "B07PERF%"');
      await testClient.query('DELETE FROM product_analytics WHERE asin LIKE "B07PERF%"');
      
      const startTime = Date.now();
      
      // 插入大量测试数据
      const largeFbaData = TestDataGenerator.generateFbaInventoryData(1000).map((item, index) => ({
        ...item,
        asin: `B07PERF${String(index).padStart(4, '0')}`,
        marketplace: ['US', 'UK', 'DE', 'FR', 'ES', 'IT', 'JP'][index % 7],
      }));
      
      const largeInventoryData = TestDataGenerator.generateInventoryDetailsData(1000).map((item, index) => ({
        ...item,
        asin: `B07PERF${String(index).padStart(4, '0')}`,
        marketplace: ['US', 'UK', 'DE', 'FR', 'ES', 'IT', 'JP'][index % 7],
      }));
      
      const largeAdData = TestDataGenerator.generateProductAnalyticsData(1000).map((item, index) => ({
        ...item,
        asin: `B07PERF${String(index).padStart(4, '0')}`,
      }));
      
      // 并发插入数据
      await Promise.all([
        TestDataGenerator.insertTestData('fba_inventory', largeFbaData),
        TestDataGenerator.insertTestData('inventory_details', largeInventoryData),
        TestDataGenerator.insertTestData('product_analytics', largeAdData),
      ]);
      
      const insertEndTime = Date.now();
      console.log(`大数据量插入耗时: ${insertEndTime - startTime}ms`);
      
      // 测试API响应性能
      const apiStartTime = Date.now();
      const mockRequest = new NextRequest('http://localhost:3000/api/ad-data/dashboard');
      const response = await dashboardHandler(mockRequest);
      const data = await response.json();
      const apiEndTime = Date.now();
      
      console.log(`大数据量API查询耗时: ${apiEndTime - apiStartTime}ms`);
      
      // 验证响应正确性
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.summary.totalProducts).toBeGreaterThan(900);
      
      // 性能断言
      expect(insertEndTime - startTime).toBeLessThan(30000); // 30秒内完成插入
      expect(apiEndTime - apiStartTime).toBeLessThan(5000);  // 5秒内完成API查询
      
      console.log('✅ 大数据量端到端性能测试通过');
    });

    test('应该能够处理并发API请求', async () => {
      console.log('开始并发API请求测试...');
      
      const concurrentRequests = 10;
      const startTime = Date.now();
      
      // 创建多个并发API请求
      const requests = Array.from({ length: concurrentRequests }, () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/ad-data/metrics');
        return metricsHandler(mockRequest);
      });
      
      // 并发执行所有请求
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      
      console.log(`${concurrentRequests}个并发请求总耗时: ${endTime - startTime}ms`);
      console.log(`平均每个请求耗时: ${(endTime - startTime) / concurrentRequests}ms`);
      
      // 验证所有请求都成功
      responses.forEach(async (response, index) => {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.summary).toBeDefined();
      });
      
      // 性能断言
      expect(endTime - startTime).toBeLessThan(10000); // 10秒内完成所有并发请求
      
      console.log('✅ 并发API请求测试通过');
    });
  });

  describe('错误处理与异常情况测试', () => {
    
    test('应该能够处理数据库连接异常', async () => {
      // 模拟数据库连接问题
      console.log('测试数据库异常处理...');
      
      // 创建一个会失败的查询
      try {
        await testClient.query('SELECT * FROM non_existent_table');
        // 如果没有抛出异常，测试失败
        expect(true).toBe(false);
      } catch (error) {
        // 验证错误被正确捕获
        expect(error).toBeDefined();
        console.log('✅ 数据库异常正确捕获');
      }
    });

    test('应该能够处理无效的API参数', async () => {
      // 测试无效的筛选参数
      const invalidRequest = new NextRequest('http://localhost:3000/api/ad-data/inventory-points?limit=invalid');
      const response = await inventoryHandler(invalidRequest);
      
      // API应该返回错误或使用默认值
      expect([200, 400]).toContain(response.status);
      
      if (response.status === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        // 应该使用默认的limit值
      }
      
      console.log('✅ 无效API参数处理测试通过');
    });

    test('应该能够处理空数据集情况', async () => {
      // 清理所有测试数据
      await testClient.query('DELETE FROM fba_inventory WHERE asin LIKE "B07EMPTY%"');
      await testClient.query('DELETE FROM inventory_details WHERE asin LIKE "B07EMPTY%"');
      await testClient.query('DELETE FROM product_analytics WHERE asin LIKE "B07EMPTY%"');
      
      // 查询不存在的数据
      const emptyRequest = new NextRequest('http://localhost:3000/api/ad-data/inventory-points?asin=B07EMPTY001');
      const response = await inventoryHandler(emptyRequest);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.data.length).toBe(0);
      expect(data.data.total).toBe(0);
      
      console.log('✅ 空数据集处理测试通过');
    });
  });
});