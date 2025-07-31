-- ===================================================================
-- 产品分析表字段清理脚本
-- 用途：删除非必要的NULL值字段，只保留您设计中启用的字段
-- 版本：Cleanup v1.0
-- 日期：2025-07-28
-- ===================================================================

USE saihu_erp_sync;

-- 开始事务
START TRANSACTION;

-- ===================================================================
-- 第一部分：分析当前表结构，确定要删除的字段
-- ===================================================================

-- 基于您的设计文件，以下是您注释掉（不需要）的字段：
-- shop_id, dev_id, operator_id, tag_id, brand_id, category_id
-- online_status, asin_type, stock_status, ad_cost (您注释掉了)
-- category_name (您注释掉了), profit_amount (您注释掉了)
-- dev_ids, operator_ids, marketplace_ids, label_ids, brand_ids, ad_types (您注释掉了)
-- open_date, is_low_cost_store (您注释掉了)

-- ===================================================================
-- 第二部分：删除您设计中注释掉的（不需要的）字段
-- ===================================================================

-- 删除组织结构相关字段（您注释掉了这些）
ALTER TABLE product_analytics DROP COLUMN IF EXISTS shop_id;
ALTER TABLE product_analytics DROP COLUMN IF EXISTS dev_id;
ALTER TABLE product_analytics DROP COLUMN IF EXISTS operator_id;
ALTER TABLE product_analytics DROP COLUMN IF EXISTS tag_id;
ALTER TABLE product_analytics DROP COLUMN IF EXISTS brand_id;
ALTER TABLE product_analytics DROP COLUMN IF EXISTS category_id;

-- 删除产品状态字段（您注释掉了这些）
ALTER TABLE product_analytics DROP COLUMN IF EXISTS online_status;
ALTER TABLE product_analytics DROP COLUMN IF EXISTS asin_type;
ALTER TABLE product_analytics DROP COLUMN IF EXISTS stock_status;

-- 删除您注释掉的广告成本字段
ALTER TABLE product_analytics DROP COLUMN IF EXISTS ad_cost;

-- 删除您注释掉的商品分类名称字段
ALTER TABLE product_analytics DROP COLUMN IF EXISTS category_name;

-- 删除您注释掉的利润相关字段
ALTER TABLE product_analytics DROP COLUMN IF EXISTS profit_amount;

-- 删除您注释掉的JSON字段
ALTER TABLE product_analytics DROP COLUMN IF EXISTS dev_ids;
ALTER TABLE product_analytics DROP COLUMN IF EXISTS operator_ids;
ALTER TABLE product_analytics DROP COLUMN IF EXISTS marketplace_ids;
ALTER TABLE product_analytics DROP COLUMN IF EXISTS label_ids;
ALTER TABLE product_analytics DROP COLUMN IF EXISTS brand_ids;
ALTER TABLE product_analytics DROP COLUMN IF EXISTS ad_types;

-- 删除您注释掉的时间和状态字段
ALTER TABLE product_analytics DROP COLUMN IF EXISTS open_date;
ALTER TABLE product_analytics DROP COLUMN IF EXISTS is_low_cost_store;

-- ===================================================================
-- 第三部分：确保保留字段有合适的默认值（您启用的字段）
-- ===================================================================

-- 确保您启用的字段有正确的默认值
-- 基础字段
ALTER TABLE product_analytics 
MODIFY COLUMN asin VARCHAR(20) NOT NULL COMMENT 'ASIN码',
MODIFY COLUMN sku VARCHAR(50) DEFAULT '' COMMENT 'SKU编码',
MODIFY COLUMN parent_asin VARCHAR(20) DEFAULT '' COMMENT '父ASIN',
MODIFY COLUMN spu VARCHAR(50) DEFAULT '' COMMENT 'SPU',
MODIFY COLUMN msku VARCHAR(50) DEFAULT '' COMMENT 'MSKU',
MODIFY COLUMN data_date DATE NOT NULL COMMENT '数据日期',
MODIFY COLUMN sales_amount DECIMAL(12,2) DEFAULT 0.00 COMMENT '销售金额',
MODIFY COLUMN sales_quantity INT(11) DEFAULT 0 COMMENT '销售数量',
MODIFY COLUMN impressions INT(11) DEFAULT 0 COMMENT '曝光量',
MODIFY COLUMN clicks INT(11) DEFAULT 0 COMMENT '点击量',
MODIFY COLUMN conversion_rate DECIMAL(6,4) DEFAULT 0.0000 COMMENT '转化率',
MODIFY COLUMN acos DECIMAL(6,4) DEFAULT 0.0000 COMMENT 'ACOS广告成本占比',
MODIFY COLUMN marketplace_id VARCHAR(20) DEFAULT '' COMMENT '市场ID',
MODIFY COLUMN dev_name VARCHAR(50) DEFAULT '' COMMENT '开发者名称',
MODIFY COLUMN operator_name VARCHAR(50) DEFAULT '' COMMENT '操作员名称';

-- 您启用的货币字段
ALTER TABLE product_analytics 
MODIFY COLUMN currency VARCHAR(10) DEFAULT 'USD' COMMENT '货币类型';

-- 您启用的广告指标字段
ALTER TABLE product_analytics 
MODIFY COLUMN ad_sales DECIMAL(12,2) DEFAULT 0.00 COMMENT '广告销售额',
MODIFY COLUMN cpc DECIMAL(8,4) DEFAULT 0.0000 COMMENT '每次点击成本',
MODIFY COLUMN cpa DECIMAL(8,4) DEFAULT 0.0000 COMMENT '每次转化成本',
MODIFY COLUMN ad_orders INT(11) DEFAULT 0 COMMENT '广告订单数',
MODIFY COLUMN ad_conversion_rate DECIMAL(6,4) DEFAULT 0.0000 COMMENT '广告转化率';

-- 您启用的业务指标字段
ALTER TABLE product_analytics 
MODIFY COLUMN order_count INT(11) DEFAULT 0 COMMENT '订单数量',
MODIFY COLUMN refund_count INT(11) DEFAULT 0 COMMENT '退款数量',
MODIFY COLUMN refund_rate DECIMAL(6,4) DEFAULT 0.0000 COMMENT '退款率',
MODIFY COLUMN return_count INT(11) DEFAULT 0 COMMENT '退货数量',
MODIFY COLUMN return_rate DECIMAL(6,4) DEFAULT 0.0000 COMMENT '退货率',
MODIFY COLUMN rating DECIMAL(3,2) DEFAULT 0.00 COMMENT '评分',
MODIFY COLUMN rating_count INT(11) DEFAULT 0 COMMENT '评分数量';

-- 您启用的商品信息字段
ALTER TABLE product_analytics 
MODIFY COLUMN title VARCHAR(500) DEFAULT '' COMMENT '商品标题',
MODIFY COLUMN brand_name VARCHAR(100) DEFAULT '' COMMENT '品牌名称';

-- 您启用的利润和库存字段
ALTER TABLE product_analytics 
MODIFY COLUMN profit_rate DECIMAL(6,4) DEFAULT 0.0000 COMMENT '利润率',
MODIFY COLUMN avg_profit DECIMAL(8,2) DEFAULT 0.00 COMMENT '平均利润',
MODIFY COLUMN available_days DECIMAL(8,1) DEFAULT 0.0 COMMENT '可用天数',
MODIFY COLUMN fba_inventory INT(11) DEFAULT 0 COMMENT 'FBA库存',
MODIFY COLUMN total_inventory INT(11) DEFAULT 0 COMMENT '总库存';

-- 您启用的JSON字段
ALTER TABLE product_analytics 
MODIFY COLUMN shop_ids JSON DEFAULT (JSON_ARRAY()) COMMENT '店铺ID列表';

-- ===================================================================
-- 第四部分：删除相关的无效索引
-- ===================================================================

-- 删除已删除字段的索引
DROP INDEX IF EXISTS idx_shop_date ON product_analytics;
DROP INDEX IF EXISTS idx_brand_date ON product_analytics;
DROP INDEX IF EXISTS idx_online_status ON product_analytics;
DROP INDEX IF EXISTS idx_asin_type ON product_analytics;
DROP INDEX IF EXISTS idx_analytics_summary ON product_analytics;

-- 重建有效的索引
CREATE INDEX idx_currency_date ON product_analytics(currency, data_date);
CREATE INDEX idx_asin_date_sales ON product_analytics(asin, data_date, sales_amount);
CREATE INDEX idx_marketplace_date ON product_analytics(marketplace_id, data_date);

-- ===================================================================
-- 第五部分：清理现有数据的NULL值
-- ===================================================================

-- 更新剩余字段的NULL值
UPDATE product_analytics SET
    sku = COALESCE(sku, ''),
    parent_asin = COALESCE(parent_asin, ''),
    spu = COALESCE(spu, ''),
    msku = COALESCE(msku, ''),
    sales_amount = COALESCE(sales_amount, 0.00),
    sales_quantity = COALESCE(sales_quantity, 0),
    impressions = COALESCE(impressions, 0),
    clicks = COALESCE(clicks, 0),
    conversion_rate = COALESCE(conversion_rate, 0.0000),
    acos = COALESCE(acos, 0.0000),
    marketplace_id = COALESCE(marketplace_id, ''),
    dev_name = COALESCE(dev_name, ''),
    operator_name = COALESCE(operator_name, ''),
    title = COALESCE(title, ''),
    brand_name = COALESCE(brand_name, ''),
    shop_ids = COALESCE(shop_ids, JSON_ARRAY())
WHERE id > 0;

-- ===================================================================
-- 第六部分：验证清理结果
-- ===================================================================

-- 统计剩余字段数量
SELECT 
    'product_analytics表字段清理完成' as status,
    COUNT(*) as total_columns
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'saihu_erp_sync' 
  AND TABLE_NAME = 'product_analytics';

-- 显示剩余字段
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'saihu_erp_sync' 
  AND TABLE_NAME = 'product_analytics'
ORDER BY ORDINAL_POSITION;

-- 验证数据完整性
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT asin) as unique_asins,
    SUM(CASE WHEN asin IS NULL OR asin = '' THEN 1 ELSE 0 END) as empty_asin,
    SUM(CASE WHEN data_date IS NULL THEN 1 ELSE 0 END) as null_date
FROM product_analytics;

-- 提交事务
COMMIT;

-- 显示最终的表结构
SHOW CREATE TABLE product_analytics;