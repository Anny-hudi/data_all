# 赛狐ERP API接口文档

## 1. 产品分析数据（NEW）

### 接口说明
- **接口地址**：`/api/productAnalyze/new/pageList.json`
- **请求方式**：POST
- **接口描述**：获取产品分析数据（NEW）

### 请求参数
| 参数名 | 位置 | 类型 | 必填 | 说明 |
| ------ | ---- | ---- | ---- | ---- |
| access_token | query | string | 是 | 通过获取token接口获得的token |
| client_id | query | string | 是 | client_id, 申请API权限获得 |
| timestamp | query | string | 是 | 13位毫秒时间戳，与当前时间差异不超过正负15分钟 |
| nonce | query | string | 是 | 随机整数值，保证每个请求唯一 |
| sign | query | string | 是 | 请求签名，详见签名生成规则 |
| Content-Type | header | string | 否 | 固定为 application/json |
| body | body | object | 是 | 见下方 ProductAnalyzeOpenQo |

#### body参数（ProductAnalyzeOpenQo）
- marketplaceIdList: 站点ID列表（array[string]）
- shopIdList: 店铺ID列表（array[string]）
- devIdList: 业务员ID列表（array[string]）
- operatorIdList: 开发员ID列表（array[string]）
- tagId: 规则ID（string）
- currency: 币种（string）
- startDate: 开始时间, 格式yyyy-MM-dd（string）
- endDate: 结束时间, 格式yyyy-MM-dd（string）
- searchType: 搜索类型, 可选值:asin; msku; parentAsin; spu; sku（string）
- searchMode: 搜索类型 精:exact 模:blur（string）
- asinType: 数据聚合维度,默认1 (1:asin; 2:parentAsin; 3:msku; 4:sku; 5:spu)（string）
- mergeAsin: 按ASIN汇总,默认false (true:是; false:否)（string）
- fullCid: 商品分类全路径（string）
- labelQuery: 产品标签查询类型, 默认0 (0:任一;1:所有)（string）
- labelIdList: 产品标签ID列表（array[string]）
- brandIdList: 品牌ID列表（array[string]）
- onlineStatusList: 产品状态(active:可售;inActive:不可售;delete:已删除)（array[string]）
- isNewOrMovingOrInStock: 统计范围,默认0（string）
- compareType: 是否显示环比 默认是0（string）
- preStartDate: 自定义周期开始时间, compareType:3 时生效, 格式yyyy-MM-dd（string）
- preEndDate: 自定义周期结束时间, compareType:3时生效, 格式yyyy-MM-dd（string）
- adTypeList: 广告类型,默认全选(可选值:sp,sd,sb,sbv,sbs)（array[string]）
- pageNo: 第几页（string）
- pageSize: 每页大小（string）
- orderBy: 排序字段, 默认按照销量降序排（string）
- desc: 是否降序，默认true (true:降序，false:升序)（string）
- searchContentList: 搜索内容列表（array[string]）
- lowCostStore: 是否筛选低价商城（string）
- openDateStart: 产品创建(上架)开始时间, 格式yyyy-MM-dd（string）
- openDateEnd: 产品创建(上架)结束时间, 格式yyyy-MM-dd（string）

### 返回参数
- code: int，0为成功
- msg: string，错误信息
- data: Page对象，包含分页信息和产品分析数据

#### Page对象结构
- pageNo: int
- pageSize: int
- rows: array[ProductAnalyzeCompareOpenDto]
- totalPage: int
- totalSize: int

#### ProductAnalyzeCompareOpenDto主要字段
- asinList: ASIN列表
- skuList: SKU列表
- mskuList: MSKU列表
- parentAsinList: 父ASIN列表
- spu: SPU
- devNameList: 业务员列表
- operatorNameList: 开发员列表
- ...（字段极多，详见原始schema）

> 详细字段请参考原始schema，或根据实际开发需求补充。

---

## 2. FBA库存

### 接口说明
- **接口地址**：`/api/inventoryManage/fba/pageList.json`
- **请求方式**：POST
- **接口描述**：查询FBA库存明细

### 请求参数
| 参数名 | 位置 | 类型 | 必填 | 说明 |
| ------ | ---- | ---- | ---- | ---- |
| access_token | query | string | 是 | 通过获取token接口获得的token |
| client_id | query | string | 是 | client_id, 申请API权限获得 |
| timestamp | query | string | 是 | 13位毫秒时间戳，与当前时间差异不超过正负15分钟 |
| nonce | query | string | 是 | 随机整数值，保证每个请求唯一 |
| sign | query | string | 是 | 请求签名，详见签名生成规则 |
| Content-Type | header | string | 否 | 固定为 application/json |
| body | body | object | 是 | 见下方 FbaUserInventorySearchOpenParam |

#### body参数（FbaUserInventorySearchOpenParam）
- pageNo: 第几页（string）
- pageSize: 每页大小（string）
- currency: 币种（string）
- hideZero: 是否隐藏总库存为0的数据, 可选值true,false（string）
- hideDeletedPrd: 是否隐藏已删除产品, 可选值true,false（string）
- needMergeShare: 是否需要合并共享仓数据（string）
- productDevIds: productDevIds（string）
- commodityDevIds: commodityDevIds（string）
- skus: skus（array[string]）
- asins: asins（array[string]）
- commodityIds: commodityIds（array[string]）
- productIds: productIds（array[string]）
- shopIdList: shopIdList（array[string]）

### 返回参数
- code: int，0为成功
- msg: string，错误信息
- data: Page对象，包含分页信息和FBA库存明细

#### Page对象结构
- pageNo: int
- pageSize: int
- rows: array[FbaInventoryManageListOpenVo]
- totalPage: int
- totalSize: int

#### FbaInventoryManageListOpenVo主要字段
- id: ID
- shopId: 店铺ID
- marketplaceId: 站点ID
- sellingPartnerId: 亚马逊卖家编号
- asin: ASIN
- sku: 卖家SKU
- fnSku: Fullfilment Network SKU
- condition: 产品状况
- commodityId: 配对商品id
- commodityName: 商品中文名称
- commoditySku: 商品sku
- avgInventoryCost: 平均库存成本
- avgTransportCost: 平均头程费用
- inventoryCosts: 库存成本
- purchaseCosts: 货值
- currency: 成本/货值货币单位
- available: 可售
- reservedTransfer: 待调仓
- reservedProcessing: 调仓中
- reservedCustomerorders: 待发货
- inboundWorking: 计划入库
- inboundShipped: 在途
- inboundReceiving: 入库中
- unfulfillable: 不可售
- invAge0to90Days: 3个月库龄
- invAge91To180Days: 3-6个月库龄
- invAge181To270Days: 6-9个月库龄
- invAge271To365Days: 9-12个月库存
- invAge365PlusDays: 12个月以上库龄
- totalInventory: 总库存
- warehouseName: 仓库名称
- snapshotDate: 库存库龄更新时间
- research: 调查中
- presale: 库存预售
- 其它字段详见schema

> 详细字段请参考原始schema，或根据实际开发需求补充。

---

## 3. 库存明细

### 接口说明
- **接口地址**：`/api/warehouseManage/warehouseItemList.json`
- **请求方式**：POST
- **接口描述**：查询库存明细

### 请求参数
| 参数名 | 位置 | 类型 | 必填 | 说明 |
| ------ | ---- | ---- | ---- | ---- |
| access_token | query | string | 是 | 通过获取token接口获得的token |
| client_id | query | string | 是 | client_id, 申请API权限获得 |
| timestamp | query | string | 是 | 13位毫秒时间戳，与当前时间差异不超过正负15分钟 |
| nonce | query | string | 是 | 随机整数值，保证每个请求唯一 |
| sign | query | string | 是 | 请求签名，详见签名生成规则 |
| Content-Type | header | string | 否 | 固定为 application/json |
| body | body | object | 是 | 见下方 WarehouseItemSearchOpenDto |

#### body参数（WarehouseItemSearchOpenDto）
- pageNo: 第几页（string）
- pageSize: 每页大小,最大支持100（string）
- warehouseId: 仓库id（string）
- commoditySkus: 商品SKU列表，最大支持100个sku（array[string]）
- fnSkuList: FNSKU列表，最大支持100个sku（array[string]）
- isHidden: 隐藏库存为0的数据选项，支持true和false（string）
- createTimeStart: 创建时间开始于,格式yyyy-MM-dd hh:mm:ss（string）
- createTimeEnd: 创建时间结束于,格式yyyy-MM-dd hh:mm:ss（string）
- modifiedTimeStart: 修改时间开始于,格式yyyy-MM-dd hh:mm:ss（string）
- modifiedTimeEnd: 修改时间结束于,格式yyyy-MM-dd hh:mm:ss（string）

### 返回参数
- code: int，0为成功
- msg: string，错误信息
- data: Page对象，包含分页信息和库存明细

#### Page对象结构
- pageNo: int
- pageSize: int
- rows: array[WarehouseItemOpenVo]
- totalPage: int
- totalSize: int

#### WarehouseItemOpenVo主要字段
- id: 主键id
- createTime: 创建时间
- updateTime: 更新时间
- warehouseId: 仓库ID
- commodityId: 商品id
- commoditySku: 商品sku
- commodityName: 商品名称
- fnSku: FNSKU
- stockAvailable: 可用数
- stockDefective: 次品数
- stockOccupy: 占用库存
- stockWait: 待到货
- stockPlan: 采购计划数
- stockAllNum: 商品总数
- perPurchase: 采购单价,移动加权平均计算
- totalPurchase: 货值per_purchase*(goods+defective)
- onWayPurchase: 在途货值
- perFee: 单位费用total_fee/(goods+defective)
- totalFee: 费用ship_fee+other_fee
- perInventoryCost: 单位入库成本inventory_cost/(goods+defective)
- inventoryCost: 入库成本total_fee+total_purchase
- shipFee: 运费
- otherFee: 其他费用
- createId: 创建人
- updateId: 修改人
- 其它字段详见schema

> 详细字段请参考原始schema，或根据实际开发需求补充。 