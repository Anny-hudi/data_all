/**
 * Jest 测试配置文件
 * 为广告数据同步测试配置Jest环境
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // 提供Next.js应用的路径，这将加载next.config.js和.env文件
  dir: './',
});

// 添加任何自定义配置到jest配置对象
const customJestConfig = {
  // 添加更多设置选项
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testEnvironment: 'node',
  
  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.test.js'
  ],
  
  // 忽略的文件和目录
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/'
  ],
  
  // 覆盖率收集配置
  collectCoverageFrom: [
    'src/lib/database/**/*.ts',
    'src/lib/adapters/**/*.ts', 
    'src/lib/utils/**/*.ts',
    'src/app/api/ad-data/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  
  // 覆盖率报告格式
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // 模块名称映射（用于路径别名）
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // 超时设置
  testTimeout: 30000, // 30秒超时，适合数据库操作
  
  // 环境变量设置
  setupFiles: ['<rootDir>/tests/env.setup.js'],
  
  // 并发控制
  maxWorkers: 1, // 单线程运行，避免数据库冲突
  
  // 详细输出
  verbose: true,
  
  // 清理模拟
  clearMocks: true,
  restoreMocks: true,
  
  // TypeScript 支持
  preset: 'ts-jest',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },
  
  // 模块文件扩展名
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // 全局设置
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
};

// createJestConfig 是异步的，因此需要导出接收配置的函数
module.exports = createJestConfig(customJestConfig);