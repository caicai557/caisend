"""
集成测试套件 - 全面测试聊天捕获系统
包括单元测试、集成测试、压力测试和稳定性测试
"""

import asyncio
import json
import time
import random
import unittest
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import concurrent.futures
import psutil
import statistics

# 导入系统模块
from chat_capture_system import (
    ChatCaptureSystem,
    CaptureConfig,
    AccountInfo,
    ChatMessage,
    DatabaseManager
)
from enhanced_cdp_injector import EnhancedCDPClient, EnhancedScriptInjector
from multi_account_controller import (
    AutomationController,
    AccountPool,
    BrowserManager,
    LoadBalancer
)
from adaptive_capture_optimizer import (
    IntegratedOptimizationSystem,
    PerformanceMetrics,
    CaptureStrategy
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============= 测试配置 =============
@dataclass
class TestConfig:
    """测试配置"""
    # 测试参数
    test_duration: int = 300  # 测试持续时间（秒）
    concurrent_accounts: int = 3  # 并发账号数
    messages_per_second: float = 2.0  # 每秒消息数
    error_injection_rate: float = 0.05  # 错误注入率
    
    # 性能基准
    max_latency_ms: float = 200  # 最大延迟
    min_success_rate: float = 0.95  # 最小成功率
    max_cpu_usage: float = 70  # 最大CPU使用率
    max_memory_mb: float = 500  # 最大内存使用

# ============= 模拟数据生成器 =============
class DataGenerator:
    """测试数据生成器"""
    
    @staticmethod
    def generate_message() -> Dict:
        """生成模拟消息"""
        templates = [
            "你好，请问有什么可以帮助您的？",
            "产品价格是{price}元",
            "订单{order_id}已发货",
            "感谢您的咨询",
            "请稍等，正在查询中..."
        ]
        
        text = random.choice(templates).format(
            price=random.randint(100, 9999),
            order_id=random.randint(10000, 99999)
        )
        
        return {
            'message_id': f"msg_{int(time.time()*1000)}_{random.randint(1000, 9999)}",
            'text': text,
            'is_out': random.choice([True, False]),
            'timestamp': time.time() * 1000
        }
        
    @staticmethod
    def generate_chat_capture() -> Dict:
        """生成模拟捕获数据"""
        return {
            'type': 'chat_capture',
            'account_id': f"test_account_{random.randint(1, 5)}",
            'chat_key': f"chat_{random.randint(1, 10)}",
            'chat_id': f"chat_{random.randint(1, 10)}",
            'chat_title': f"Test Chat {random.randint(1, 10)}",
            'messages': [DataGenerator.generate_message() for _ in range(random.randint(5, 20))],
            'timestamp': time.time() * 1000
        }

# ============= 单元测试 =============
class UnitTests(unittest.TestCase):
    """单元测试"""
    
    def setUp(self):
        """测试前准备"""
        self.config = CaptureConfig(
            db_path=":memory:",  # 使用内存数据库
            batch_size=10,
            max_accounts=3
        )
        
    def test_database_manager(self):
        """测试数据库管理器"""
        db = DatabaseManager(":memory:")
        
        # 测试消息保存
        message = ChatMessage(
            account_id="test_acc",
            chat_key="test_chat",
            chat_id="123",
            chat_title="Test Chat",
            message_id="msg_1",
            text="Hello World",
            is_out=False,
            timestamp=time.time()
        )
        
        result = db.save_message(message)
        self.assertTrue(result)
        
        # 测试去重
        result = db.save_message(message)
        self.assertFalse(result)  # 应该被去重
        
        # 测试统计
        stats = db.get_stats("test_acc")
        self.assertEqual(stats['total'], 1)
        
        db.close()
        
    def test_account_pool(self):
        """测试账号池"""
        pool = AccountPool(max_concurrent=2)
        
        # 添加账号
        from multi_account_controller import AccountConfig
        
        for i in range(3):
            account = AccountConfig(
                account_id=f"acc_{i}",
                phone_number=f"+123456789{i}"
            )
            pool.add_account(account)
            
        # 测试获取可用账号
        account = pool.get_available_account()
        self.assertIsNotNone(account)
        
        # 测试激活账号
        result = pool.activate_account(account.account_id)
        self.assertTrue(result)
        
        # 测试并发限制
        pool.activate_account("acc_1")
        result = pool.activate_account("acc_2")  # 超过限制
        self.assertFalse(result)
        
        # 测试状态
        status = pool.get_status()
        self.assertEqual(status['active'], 2)
        
    def test_capture_strategy(self):
        """测试捕获策略"""
        strategy = CaptureStrategy(
            interval=1.0,
            batch_size=50,
            timeout=5.0
        )
        
        # 测试序列化
        data = strategy.to_dict()
        self.assertEqual(data['interval'], 1.0)
        self.assertEqual(data['batch_size'], 50)
        
    def test_script_injection(self):
        """测试脚本注入"""
        script = EnhancedScriptInjector.generate_universal_capture_script("test_account")
        
        # 验证脚本包含必要元素
        self.assertIn("ACCOUNT_ID", script)
        self.assertIn("test_account", script)
        self.assertIn("captureMessages", script)
        self.assertIn("MutationObserver", script)

# ============= 集成测试 =============
class IntegrationTests:
    """集成测试"""
    
    def __init__(self, config: TestConfig):
        self.config = config
        self.results = {
            'passed': [],
            'failed': [],
            'metrics': {}
        }
        
    async def test_end_to_end_capture(self) -> bool:
        """端到端捕获测试"""
        test_name = "end_to_end_capture"
        
        try:
            # 创建系统
            capture_config = CaptureConfig(
                db_path="test_capture.db",
                batch_size=50,
                max_accounts=3
            )
            
            system = ChatCaptureSystem(capture_config)
            
            # 设置测试账号
            accounts = [
                {'id': 'test_1', 'name': 'Test Account 1'},
                {'id': 'test_2', 'name': 'Test Account 2'}
            ]
            system.setup_accounts(accounts)
            
            # 启动系统
            await system.start()
            
            # 模拟消息捕获
            for _ in range(10):
                capture_data = DataGenerator.generate_chat_capture()
                
                # 模拟处理捕获数据
                for account_id in ['test_1', 'test_2']:
                    if account_id in system.manager.capturers:
                        capturer = system.manager.capturers[account_id]
                        await capturer._handle_capture_data(capture_data)
                        
                await asyncio.sleep(0.5)
                
            # 验证结果
            stats = system.manager.get_stats()
            
            success = stats['database_stats']['total'] > 0
            
            # 停止系统
            await system.stop()
            
            if success:
                self.results['passed'].append(test_name)
            else:
                self.results['failed'].append(test_name)
                
            return success
            
        except Exception as e:
            logger.error(f"Test {test_name} failed: {e}")
            self.results['failed'].append(test_name)
            return False
            
    async def test_multi_account_management(self) -> bool:
        """多账号管理测试"""
        test_name = "multi_account_management"
        
        try:
            # 创建控制器
            controller_config = {
                'max_concurrent': 2,
                'rotation_interval': 10
            }
            
            controller = AutomationController(controller_config)
            
            # 添加测试账号
            accounts = [
                {'id': f'acc_{i}', 'phone': f'+123456789{i}'}
                for i in range(5)
            ]
            controller.add_accounts(accounts)
            
            # 启动控制器
            await controller.start()
            
            # 等待运行
            await asyncio.sleep(5)
            
            # 验证状态
            status = controller.get_status()
            
            success = (
                status['account_pool']['total'] == 5 and
                status['account_pool']['active'] <= 2
            )
            
            # 停止控制器
            await controller.stop()
            
            if success:
                self.results['passed'].append(test_name)
            else:
                self.results['failed'].append(test_name)
                
            return success
            
        except Exception as e:
            logger.error(f"Test {test_name} failed: {e}")
            self.results['failed'].append(test_name)
            return False
            
    async def test_adaptive_optimization(self) -> bool:
        """自适应优化测试"""
        test_name = "adaptive_optimization"
        
        try:
            # 创建优化系统
            optimizer = IntegratedOptimizationSystem()
            
            # 启动系统
            await optimizer.start()
            
            # 输入测试数据
            for _ in range(20):
                stats = {
                    'capture_rate': random.uniform(0.5, 2.0),
                    'success_rate': random.uniform(0.8, 1.0),
                    'latency': random.uniform(50, 150),
                    'cpu_usage': random.uniform(30, 60),
                    'memory_usage': random.uniform(20, 50)
                }
                
                await optimizer.feed_stats(stats)
                await asyncio.sleep(0.1)
                
            # 获取优化报告
            report = optimizer.get_optimization_report()
            
            success = (
                'adaptive_analysis' in report and
                'current_strategy' in report['adaptive_analysis']
            )
            
            # 停止系统
            await optimizer.stop()
            
            if success:
                self.results['passed'].append(test_name)
            else:
                self.results['failed'].append(test_name)
                
            return success
            
        except Exception as e:
            logger.error(f"Test {test_name} failed: {e}")
            self.results['failed'].append(test_name)
            return False
            
    async def run_all(self) -> Dict:
        """运行所有集成测试"""
        logger.info("Starting integration tests...")
        
        tests = [
            self.test_end_to_end_capture(),
            self.test_multi_account_management(),
            self.test_adaptive_optimization()
        ]
        
        results = await asyncio.gather(*tests)
        
        self.results['metrics']['total'] = len(results)
        self.results['metrics']['passed'] = sum(results)
        self.results['metrics']['failed'] = len(results) - sum(results)
        self.results['metrics']['success_rate'] = sum(results) / len(results)
        
        return self.results

# ============= 压力测试 =============
class StressTest:
    """压力测试"""
    
    def __init__(self, config: TestConfig):
        self.config = config
        self.metrics = []
        self.errors = []
        
    async def simulate_load(self, duration: int, messages_per_second: float) -> None:
        """模拟负载"""
        start_time = time.time()
        message_count = 0
        
        while time.time() - start_time < duration:
            # 生成消息
            for _ in range(int(messages_per_second)):
                capture_data = DataGenerator.generate_chat_capture()
                message_count += len(capture_data['messages'])
                
            # 随机注入错误
            if random.random() < self.config.error_injection_rate:
                self.errors.append({
                    'timestamp': time.time(),
                    'error': 'Simulated error'
                })
                
            await asyncio.sleep(1)
            
        logger.info(f"Generated {message_count} messages in {duration} seconds")
        
    async def measure_performance(self, system: ChatCaptureSystem) -> None:
        """测量性能"""
        while True:
            try:
                # 获取系统指标
                stats = system.manager.get_stats()
                
                # 获取资源使用
                process = psutil.Process()
                cpu_usage = process.cpu_percent()
                memory_usage = process.memory_info().rss / 1024 / 1024  # MB
                
                # 记录指标
                self.metrics.append({
                    'timestamp': time.time(),
                    'total_messages': stats['database_stats'].get('total', 0),
                    'active_accounts': stats['active_accounts'],
                    'cpu_usage': cpu_usage,
                    'memory_mb': memory_usage
                })
                
                await asyncio.sleep(1)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Performance measurement error: {e}")
                
    async def run(self) -> Dict:
        """运行压力测试"""
        logger.info("Starting stress test...")
        
        # 创建系统
        capture_config = CaptureConfig(
            db_path="stress_test.db",
            batch_size=100,
            max_accounts=self.config.concurrent_accounts
        )
        
        system = ChatCaptureSystem(capture_config)
        
        # 设置测试账号
        accounts = [
            {'id': f'stress_{i}', 'name': f'Stress Account {i}'}
            for i in range(self.config.concurrent_accounts)
        ]
        system.setup_accounts(accounts)
        
        # 启动系统
        await system.start()
        
        # 启动性能监控
        monitor_task = asyncio.create_task(self.measure_performance(system))
        
        # 运行负载模拟
        await self.simulate_load(
            self.config.test_duration,
            self.config.messages_per_second
        )
        
        # 停止监控
        monitor_task.cancel()
        
        # 停止系统
        await system.stop()
        
        # 分析结果
        return self.analyze_results()
        
    def analyze_results(self) -> Dict:
        """分析测试结果"""
        if not self.metrics:
            return {'error': 'No metrics collected'}
            
        # 计算统计指标
        cpu_values = [m['cpu_usage'] for m in self.metrics]
        memory_values = [m['memory_mb'] for m in self.metrics]
        
        results = {
            'duration': self.config.test_duration,
            'total_messages': self.metrics[-1]['total_messages'] if self.metrics else 0,
            'error_count': len(self.errors),
            'cpu': {
                'avg': statistics.mean(cpu_values),
                'max': max(cpu_values),
                'p95': statistics.quantiles(cpu_values, n=20)[18]  # 95th percentile
            },
            'memory': {
                'avg': statistics.mean(memory_values),
                'max': max(memory_values),
                'p95': statistics.quantiles(memory_values, n=20)[18]
            },
            'performance': {
                'messages_per_second': self.metrics[-1]['total_messages'] / self.config.test_duration if self.metrics else 0,
                'success_rate': 1 - (len(self.errors) / max(1, self.metrics[-1]['total_messages']))
            }
        }
        
        # 验证性能基准
        results['validation'] = {
            'cpu_ok': results['cpu']['max'] <= self.config.max_cpu_usage,
            'memory_ok': results['memory']['max'] <= self.config.max_memory_mb,
            'success_rate_ok': results['performance']['success_rate'] >= self.config.min_success_rate
        }
        
        results['passed'] = all(results['validation'].values())
        
        return results

# ============= 稳定性测试 =============
class StabilityTest:
    """长时间稳定性测试"""
    
    def __init__(self, duration_hours: int = 24):
        self.duration_hours = duration_hours
        self.checkpoints = []
        
    async def run(self) -> Dict:
        """运行稳定性测试"""
        logger.info(f"Starting {self.duration_hours}-hour stability test...")
        
        start_time = time.time()
        duration_seconds = self.duration_hours * 3600
        
        # 创建系统
        system = ChatCaptureSystem()
        
        # 设置账号
        accounts = [
            {'id': f'stability_{i}', 'name': f'Stability Account {i}'}
            for i in range(3)
        ]
        system.setup_accounts(accounts)
        
        # 启动系统
        await system.start()
        
        # 运行测试
        checkpoint_interval = 3600  # 每小时一个检查点
        
        while time.time() - start_time < duration_seconds:
            # 模拟正常负载
            for _ in range(10):
                capture_data = DataGenerator.generate_chat_capture()
                # 处理数据...
                
            # 记录检查点
            if len(self.checkpoints) == 0 or \
               time.time() - self.checkpoints[-1]['timestamp'] > checkpoint_interval:
                
                stats = system.manager.get_stats()
                
                self.checkpoints.append({
                    'timestamp': time.time(),
                    'elapsed_hours': (time.time() - start_time) / 3600,
                    'total_messages': stats['database_stats'].get('total', 0),
                    'active_accounts': stats['active_accounts'],
                    'memory_mb': psutil.Process().memory_info().rss / 1024 / 1024
                })
                
                logger.info(f"Checkpoint: {self.checkpoints[-1]}")
                
            await asyncio.sleep(60)  # 每分钟循环一次
            
        # 停止系统
        await system.stop()
        
        # 分析结果
        return self.analyze_stability()
        
    def analyze_stability(self) -> Dict:
        """分析稳定性"""
        if len(self.checkpoints) < 2:
            return {'error': 'Insufficient checkpoints'}
            
        # 检查内存泄漏
        memory_values = [cp['memory_mb'] for cp in self.checkpoints]
        memory_growth = memory_values[-1] - memory_values[0]
        memory_growth_rate = memory_growth / len(self.checkpoints)
        
        # 检查消息处理稳定性
        message_rates = []
        for i in range(1, len(self.checkpoints)):
            time_diff = self.checkpoints[i]['timestamp'] - self.checkpoints[i-1]['timestamp']
            msg_diff = self.checkpoints[i]['total_messages'] - self.checkpoints[i-1]['total_messages']
            rate = msg_diff / time_diff if time_diff > 0 else 0
            message_rates.append(rate)
            
        return {
            'duration_hours': self.duration_hours,
            'checkpoints': len(self.checkpoints),
            'memory': {
                'initial_mb': memory_values[0],
                'final_mb': memory_values[-1],
                'growth_mb': memory_growth,
                'growth_rate_mb_per_hour': memory_growth_rate
            },
            'message_processing': {
                'total': self.checkpoints[-1]['total_messages'],
                'avg_rate': statistics.mean(message_rates) if message_rates else 0,
                'std_dev': statistics.stdev(message_rates) if len(message_rates) > 1 else 0
            },
            'stability': {
                'memory_stable': memory_growth_rate < 10,  # <10MB/hour
                'processing_stable': statistics.stdev(message_rates) < 0.5 if len(message_rates) > 1 else True
            }
        }

# ============= 测试运行器 =============
class TestRunner:
    """测试运行器"""
    
    def __init__(self):
        self.results = {
            'unit_tests': {},
            'integration_tests': {},
            'stress_test': {},
            'stability_test': {}
        }
        
    async def run_all_tests(self, skip_stability: bool = True) -> None:
        """运行所有测试"""
        logger.info("="*50)
        logger.info("Starting comprehensive test suite")
        logger.info("="*50)
        
        # 1. 单元测试
        logger.info("\n[1/4] Running unit tests...")
        suite = unittest.TestLoader().loadTestsFromTestCase(UnitTests)
        runner = unittest.TextTestRunner(verbosity=2)
        result = runner.run(suite)
        
        self.results['unit_tests'] = {
            'total': result.testsRun,
            'passed': result.testsRun - len(result.failures) - len(result.errors),
            'failed': len(result.failures),
            'errors': len(result.errors)
        }
        
        # 2. 集成测试
        logger.info("\n[2/4] Running integration tests...")
        test_config = TestConfig()
        integration = IntegrationTests(test_config)
        self.results['integration_tests'] = await integration.run_all()
        
        # 3. 压力测试
        logger.info("\n[3/4] Running stress test...")
        stress = StressTest(TestConfig(
            test_duration=60,  # 1分钟快速测试
            concurrent_accounts=3,
            messages_per_second=5.0
        ))
        self.results['stress_test'] = await stress.run()
        
        # 4. 稳定性测试（可选）
        if not skip_stability:
            logger.info("\n[4/4] Running stability test...")
            stability = StabilityTest(duration_hours=1)  # 1小时测试
            self.results['stability_test'] = await stability.run()
        else:
            logger.info("\n[4/4] Skipping stability test")
            
        # 生成报告
        self.generate_report()
        
    def generate_report(self) -> None:
        """生成测试报告"""
        logger.info("\n" + "="*50)
        logger.info("TEST REPORT")
        logger.info("="*50)
        
        # 单元测试结果
        unit = self.results['unit_tests']
        if unit:
            logger.info(f"\n单元测试:")
            logger.info(f"  总数: {unit.get('total', 0)}")
            logger.info(f"  通过: {unit.get('passed', 0)}")
            logger.info(f"  失败: {unit.get('failed', 0)}")
            logger.info(f"  错误: {unit.get('errors', 0)}")
            
        # 集成测试结果
        integration = self.results['integration_tests']
        if integration and 'metrics' in integration:
            logger.info(f"\n集成测试:")
            logger.info(f"  总数: {integration['metrics'].get('total', 0)}")
            logger.info(f"  通过: {integration['metrics'].get('passed', 0)}")
            logger.info(f"  失败: {integration['metrics'].get('failed', 0)}")
            logger.info(f"  成功率: {integration['metrics'].get('success_rate', 0):.1%}")
            
        # 压力测试结果
        stress = self.results['stress_test']
        if stress and 'performance' in stress:
            logger.info(f"\n压力测试:")
            logger.info(f"  消息处理: {stress['performance'].get('messages_per_second', 0):.1f} msg/s")
            logger.info(f"  成功率: {stress['performance'].get('success_rate', 0):.1%}")
            logger.info(f"  CPU使用: {stress['cpu'].get('avg', 0):.1f}% (avg), {stress['cpu'].get('max', 0):.1f}% (max)")
            logger.info(f"  内存使用: {stress['memory'].get('avg', 0):.1f}MB (avg), {stress['memory'].get('max', 0):.1f}MB (max)")
            
            if 'validation' in stress:
                logger.info(f"  验证结果:")
                for key, value in stress['validation'].items():
                    status = "✓" if value else "✗"
                    logger.info(f"    {status} {key}")
                    
        # 稳定性测试结果
        stability = self.results.get('stability_test', {})
        if stability and 'stability' in stability:
            logger.info(f"\n稳定性测试:")
            logger.info(f"  运行时长: {stability.get('duration_hours', 0)} 小时")
            logger.info(f"  内存增长: {stability['memory'].get('growth_mb', 0):.1f}MB")
            logger.info(f"  内存稳定: {'✓' if stability['stability'].get('memory_stable') else '✗'}")
            logger.info(f"  处理稳定: {'✓' if stability['stability'].get('processing_stable') else '✗'}")
            
        # 总体结论
        logger.info("\n" + "="*50)
        
        all_passed = True
        
        if unit and unit.get('failed', 0) + unit.get('errors', 0) > 0:
            all_passed = False
            
        if integration and integration.get('metrics', {}).get('failed', 0) > 0:
            all_passed = False
            
        if stress and not stress.get('passed', False):
            all_passed = False
            
        if all_passed:
            logger.info("✅ 所有测试通过！系统已准备好生产部署。")
        else:
            logger.info("❌ 部分测试失败，请检查并修复问题。")
            
        logger.info("="*50)
        
        # 保存报告到文件
        with open('test_report.json', 'w') as f:
            json.dump(self.results, f, indent=2, default=str)
            logger.info("\n报告已保存到 test_report.json")

# ============= 主函数 =============
async def main():
    """主测试函数"""
    runner = TestRunner()
    
    # 运行所有测试（跳过长时间的稳定性测试）
    await runner.run_all_tests(skip_stability=True)
    
    # 如果需要运行完整测试（包括稳定性测试）
    # await runner.run_all_tests(skip_stability=False)

if __name__ == "__main__":
    asyncio.run(main())