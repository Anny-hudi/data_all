/**
 * 测试环境变量设置
 * 在测试运行前配置必要的环境变量
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';

// 数据库配置
process.env.TEST_DB_HOST = process.env.TEST_DB_HOST || 'localhost';
process.env.TEST_DB_PORT = process.env.TEST_DB_PORT || '3306';
process.env.TEST_DB_USER = process.env.TEST_DB_USER || 'root';
process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD || '';
process.env.TEST_DB_NAME = process.env.TEST_DB_NAME || 'sync_saihu_erp_test';

// 广告数据同步配置
process.env.AD_DATA_LOG_LEVEL = 'error'; // 测试时减少日志输出
process.env.AD_DATA_ENABLE_DEBUG = 'false';
process.env.AD_DATA_CACHE_TTL = '300'; // 5分钟缓存
process.env.AD_DATA_MAX_BATCH_SIZE = '1000';

// API配置
process.env.API_RATE_LIMIT_MAX = '1000'; // 测试时提高速率限制
process.env.API_RATE_LIMIT_WINDOW = '60000'; // 1分钟窗口

// 禁用真实的外部服务调用
process.env.DISABLE_EXTERNAL_SERVICES = 'true';

// 测试数据配置
process.env.TEST_DATA_CLEANUP_ENABLED = 'true';
process.env.TEST_PERFORMANCE_MONITORING = 'true';

console.log('测试环境变量已配置');
console.log(`测试数据库: ${process.env.TEST_DB_HOST}:${process.env.TEST_DB_PORT}/${process.env.TEST_DB_NAME}`);
console.log(`日志级别: ${process.env.AD_DATA_LOG_LEVEL}`);