/**
 * 广告分析数据同步测试
 * 测试产品广告数据的完整同步流程和业务逻辑正确性
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { testClient, testAdapter, TestDataGenerator, TestAssertions } from '../setup';
import { AdDataDAO } from '../../src/lib/database/ad-data-dao';

describe('广告分析数据同步测试', () => {
  let adDataDAO: AdDataDAO;

  beforeEach(async () => {
    adDataDAO = new AdDataDAO(testClient);
    
    // 清理测试数据
    await testClient.query('DELETE FROM product_analytics WHERE data_date >= CURDATE()');
  });

  describe('广告数据写入测试', () => {
    test('应该能够批量插入广告分析数据', async () => {
      const testData = TestDataGenerator.generateProductAnalyticsData(8);
      
      const result = await TestDataGenerator.insertTestData('product_analytics', testData);
      
      expect(result.affectedRows).toBe(8);
      await TestAssertions.assertRecordCount('product_analytics', 8);
    });

    test('应该能够处理广告数据更新', async () => {
      const testData = TestDataGenerator.generateProductAnalyticsData(3);
      await TestDataGenerator.insertTestData('product_analytics', testData);
      
      // 更新数据（增加花费和销售额）
      const updatedData = testData.map(item => ({
        ...item,
        spend: item.spend + 50,
        sales: item.sales + 200,
        updated_at: new Date(),
      }));
      
      const result = await TestDataGenerator.insertTestData('product_analytics', updatedData);
      
      expect(result.affectedRows).toBeGreaterThan(0);
      await TestAssertions.assertRecordCount('product_analytics', 3);
      
      // 验证数据更新
      const updatedRecord = await adDataDAO.getProductAnalytics({
        asin: testData[0].asin,
      });
      
      expect(updatedRecord.data[0].spend).toBe(testData[0].spend + 50);
      expect(updatedRecord.data[0].sales).toBe(testData[0].sales + 200);
    });

    test('应该正确计算广告指标', async () => {
      // 生成具有特定指标的测试数据
      const testData = [{
        campaign_name: 'Test Campaign',
        ad_group_name: 'Test Ad Group',
        asin: 'B07TEST001',
        product_name: '测试广告产品',
        impressions: 10000,
        clicks: 200,  // CTR = 2%
        spend: 300,   // CPC = $1.5
        sales: 900,   // ROAS = 3.0, ACOS = 33.33%
        orders: 15,   // CVR = 7.5%
        ctr: 2.0,
        cpc: 1.5,
        acos: 33.33,
        roas: 3.0,
        conversion_rate: 7.5,
        cost_per_order: 20,
        created_at: new Date(),
        updated_at: new Date(),
        data_date: new Date().toISOString().split('T')[0],
      }];
      
      await TestDataGenerator.insertTestData('product_analytics', testData);
      
      const result = await adDataDAO.getProductAnalytics({});
      const record = result.data[0];
      
      // 验证广告指标计算正确性
      expect(Math.abs(record.ctr - 2.0)).toBeLessThan(0.1);
      expect(Math.abs(record.cpc - 1.5)).toBeLessThan(0.1);
      expect(Math.abs(record.roas - 3.0)).toBeLessThan(0.1);
      expect(Math.abs(record.acos - 33.33)).toBeLessThan(1);
      expect(Math.abs(record.conversion_rate - 7.5)).toBeLessThan(0.1);
    });
  });

  describe('广告数据查询测试', () => {
    beforeEach(async () => {
      // 准备多样化广告测试数据
      const campaignAData = TestDataGenerator.generateProductAnalyticsData(5).map(item => ({
        ...item,
        campaign_name: 'Campaign A',
        asin: 'B07XXXXX01',
      }));
      
      const campaignBData = TestDataGenerator.generateProductAnalyticsData(5).map(item => ({
        ...item,
        campaign_name: 'Campaign B',
        asin: 'B08XXXXX02',
      }));
      
      await TestDataGenerator.insertTestData('product_analytics', [...campaignAData, ...campaignBData]);
    });

    test('应该能够根据ASIN查询广告数据', async () => {
      const targetAsin = 'B07XXXXX01';
      
      const result = await adDataDAO.getProductAnalytics({ asin: targetAsin });
      
      expect(result.data.length).toBe(5);
      result.data.forEach(record => {
        expect(record.asin).toBe(targetAsin);
        TestAssertions.assertDataIntegrity(record, [
          'asin', 'campaign_name', 'impressions', 'clicks', 'spend', 'sales'
        ]);
      });
    });

    test('应该能够根据广告活动查询数据', async () => {
      const targetCampaign = 'Campaign A';
      
      const result = await adDataDAO.getProductAnalytics({ 
        campaignName: targetCampaign 
      });
      
      expect(result.data.length).toBe(5);
      result.data.forEach(record => {
        expect(record.campaign_name).toBe(targetCampaign);
      });
    });

    test('应该能够按花费金额排序查询', async () => {
      const result = await adDataDAO.getProductAnalytics(
        {},
        { sortBy: 'spend', sortOrder: 'desc' }
      );
      
      expect(result.data.length).toBe(10);
      
      // 验证排序正确性
      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i].spend).toBeLessThanOrEqual(result.data[i - 1].spend);
      }
    });

    test('应该能够按ROAS排序查询', async () => {
      const result = await adDataDAO.getProductAnalytics(
        {},
        { sortBy: 'roas', sortOrder: 'desc' }
      );
      
      expect(result.data.length).toBe(10);
      
      // 验证ROAS排序
      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i].roas).toBeLessThanOrEqual(result.data[i - 1].roas);
      }
    });
  });

  describe('广告数据适配器测试', () => {
    beforeEach(async () => {
      // 准备广告效果测试数据
      const highPerformanceData = TestDataGenerator.generateProductAnalyticsData(3).map(item => ({
        ...item,
        asin: 'B07HIGH001',
        roas: 4.5,
        acos: 20,
        ctr: 3.0,
      }));
      
      const lowPerformanceData = TestDataGenerator.generateProductAnalyticsData(3).map(item => ({
        ...item,
        asin: 'B07LOW001', 
        roas: 1.2,
        acos: 80,
        ctr: 0.5,
      }));
      
      await TestDataGenerator.insertTestData('product_analytics', [...highPerformanceData, ...lowPerformanceData]);
    });

    test('应该能够获取广告数据汇总', async () => {
      const summary = await testAdapter.getAdDataSummary();
      
      TestAssertions.assertDataIntegrity(summary, [
        'totalCampaigns', 'totalSpend', 'totalSales', 'averageRoas', 'averageAcos'
      ]);
      
      TestAssertions.assertNumberRange(summary.totalSpend, 0, 1000000, 'totalSpend');
      TestAssertions.assertNumberRange(summary.totalSales, 0, 1000000, 'totalSales');
      TestAssertions.assertNumberRange(summary.averageRoas, 0, 100, 'averageRoas');
      TestAssertions.assertNumberRange(summary.averageAcos, 0, 1000, 'averageAcos');
    });

    test('应该能够识别高效广告产品', async () => {
      const highPerformers = await testAdapter.getHighPerformingProducts({
        minRoas: 3.0,
        maxAcos: 30,
      });
      
      expect(Array.isArray(highPerformers)).toBe(true);
      expect(highPerformers.length).toBeGreaterThan(0);
      
      highPerformers.forEach(product => {
        expect(product.roas).toBeGreaterThanOrEqual(3.0);
        expect(product.acos).toBeLessThanOrEqual(30);
        TestAssertions.assertDataIntegrity(product, [
          'asin', 'product_name', 'roas', 'acos', 'spend', 'sales'
        ]);
      });
    });

    test('应该能够识别低效广告产品', async () => {
      const lowPerformers = await testAdapter.getLowPerformingProducts({
        maxRoas: 2.0,
        minAcos: 50,
      });
      
      expect(Array.isArray(lowPerformers)).toBe(true);
      expect(lowPerformers.length).toBeGreaterThan(0);
      
      lowPerformers.forEach(product => {
        expect(product.roas).toBeLessThanOrEqual(2.0);
        expect(product.acos).toBeGreaterThanOrEqual(50);
      });
    });

    test('应该能够生成广告效果趋势数据', async () => {
      // 插入不同日期的数据以测试趋势
      const dates = [
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7天前
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3天前
        new Date(), // 今天
      ];
      
      for (const date of dates) {
        const dailyData = TestDataGenerator.generateProductAnalyticsData(2).map(item => ({
          ...item,
          data_date: date.toISOString().split('T')[0],
        }));
        await TestDataGenerator.insertTestData('product_analytics', dailyData);
      }
      
      const trendData = await testAdapter.getAdPerformanceTrend(7); // 7天趋势
      
      expect(Array.isArray(trendData)).toBe(true);
      expect(trendData.length).toBeGreaterThan(0);
      
      trendData.forEach(dayData => {
        TestAssertions.assertDataIntegrity(dayData, [
          'date', 'totalSpend', 'totalSales', 'averageRoas', 'averageAcos'
        ]);
        expect(dayData.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  describe('广告指标计算测试', () => {
    test('应该正确计算CTR（点击率）', async () => {
      const testData = [{
        campaign_name: 'CTR Test',
        ad_group_name: 'Test Group',
        asin: 'B07CTR001',
        product_name: 'CTR测试产品',
        impressions: 1000,
        clicks: 25,
        ctr: 2.5, // 25/1000 * 100 = 2.5%
        spend: 50,
        sales: 150,
        acos: 33.33,
        roas: 3.0,
        orders: 5,
        conversion_rate: 20,
        cost_per_order: 10,
        cpc: 2.0,
        created_at: new Date(),
        updated_at: new Date(),
        data_date: new Date().toISOString().split('T')[0],
      }];
      
      await TestDataGenerator.insertTestData('product_analytics', testData);
      
      const result = await adDataDAO.getProductAnalytics({});
      const record = result.data[0];
      
      // 验证CTR计算
      const expectedCtr = (record.clicks / record.impressions) * 100;
      expect(Math.abs(record.ctr - expectedCtr)).toBeLessThan(0.01);
    });

    test('应该正确计算ROAS（广告投资回报率）', async () => {
      const testData = [{
        campaign_name: 'ROAS Test',
        ad_group_name: 'Test Group',
        asin: 'B07ROAS001',
        product_name: 'ROAS测试产品',
        impressions: 2000,
        clicks: 100,
        ctr: 5.0,
        spend: 200,
        sales: 800, // ROAS = 800/200 = 4.0
        acos: 25,   // ACOS = 200/800 * 100 = 25%
        roas: 4.0,
        orders: 20,
        conversion_rate: 20,
        cost_per_order: 10,
        cpc: 2.0,
        created_at: new Date(),
        updated_at: new Date(),
        data_date: new Date().toISOString().split('T')[0],
      }];
      
      await TestDataGenerator.insertTestData('product_analytics', testData);
      
      const result = await adDataDAO.getProductAnalytics({});
      const record = result.data[0];
      
      // 验证ROAS计算
      const expectedRoas = record.sales / record.spend;
      expect(Math.abs(record.roas - expectedRoas)).toBeLessThan(0.01);
      
      // 验证ACOS计算
      const expectedAcos = (record.spend / record.sales) * 100;
      expect(Math.abs(record.acos - expectedAcos)).toBeLessThan(0.01);
    });

    test('应该正确处理零除数情况', async () => {
      const testData = [{
        campaign_name: 'Zero Division Test',
        ad_group_name: 'Test Group',
        asin: 'B07ZERO001',
        product_name: '零除数测试产品',
        impressions: 1000,
        clicks: 0, // 零点击
        ctr: 0,
        spend: 0,  // 零花费
        sales: 0,  // 零销售
        acos: 0,
        roas: 0,
        orders: 0,
        conversion_rate: 0,
        cost_per_order: 0,
        cpc: 0,
        created_at: new Date(),
        updated_at: new Date(),
        data_date: new Date().toISOString().split('T')[0],
      }];
      
      await TestDataGenerator.insertTestData('product_analytics', testData);
      
      const result = await adDataDAO.getProductAnalytics({});
      const record = result.data[0];
      
      // 验证零值处理
      expect(record.ctr).toBe(0);
      expect(record.roas).toBe(0);
      expect(record.acos).toBe(0);
      expect(record.cpc).toBe(0);
    });
  });

  describe('广告数据完整性测试', () => {
    test('应该验证广告数据必要字段', async () => {
      const testData = TestDataGenerator.generateProductAnalyticsData(1);
      await TestDataGenerator.insertTestData('product_analytics', testData);
      
      const result = await adDataDAO.getProductAnalytics({});
      const record = result.data[0];
      
      const requiredFields = [
        'campaign_name', 'asin', 'product_name', 'impressions',
        'clicks', 'spend', 'sales', 'ctr', 'acos', 'roas'
      ];
      
      TestAssertions.assertDataIntegrity(record, requiredFields);
    });

    test('应该验证广告指标数值合理性', async () => {
      const testData = TestDataGenerator.generateProductAnalyticsData(5);
      await TestDataGenerator.insertTestData('product_analytics', testData);
      
      const result = await adDataDAO.getProductAnalytics({});
      
      result.data.forEach(record => {
        // CTR应该在0-100%之间
        TestAssertions.assertNumberRange(record.ctr, 0, 100, 'ctr');
        
        // ROAS应该是正数或零
        expect(record.roas).toBeGreaterThanOrEqual(0);
        
        // ACOS应该是正数或零
        expect(record.acos).toBeGreaterThanOrEqual(0);
        
        // 花费和销售额应该是正数或零
        expect(record.spend).toBeGreaterThanOrEqual(0);
        expect(record.sales).toBeGreaterThanOrEqual(0);
        
        // 点击数不应该超过曝光数
        expect(record.clicks).toBeLessThanOrEqual(record.impressions);
      });
    });
  });

  describe('广告数据性能测试', () => {
    test('大量广告数据插入性能测试', async () => {
      const largeDataSet = TestDataGenerator.generateProductAnalyticsData(2000);
      
      const startTime = Date.now();
      await TestDataGenerator.insertTestData('product_analytics', largeDataSet);
      const endTime = Date.now();
      
      const insertTime = endTime - startTime;
      console.log(`插入2000条广告数据耗时: ${insertTime}ms`);
      
      await TestAssertions.assertRecordCount('product_analytics', 2000);
      expect(insertTime).toBeLessThan(15000); // 15秒内完成
    });

    test('广告数据聚合查询性能测试', async () => {
      // 准备大量测试数据
      const largeDataSet = TestDataGenerator.generateProductAnalyticsData(3000);
      await TestDataGenerator.insertTestData('product_analytics', largeDataSet);
      
      // 测试汇总查询性能
      const startTime = Date.now();
      const summary = await testAdapter.getAdDataSummary();
      const endTime = Date.now();
      
      const queryTime = endTime - startTime;
      console.log(`广告数据汇总查询耗时: ${queryTime}ms`);
      
      expect(summary).toBeDefined();
      expect(queryTime).toBeLessThan(3000); // 3秒内完成
    });
  });
});