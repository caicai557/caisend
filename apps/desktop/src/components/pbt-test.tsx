import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function PbtTest() {
  const [logs, setLogs] = useState<string[]>([]);
  const [defId, setDefId] = useState<string>('');
  const [instanceId, setInstanceId] = useState<string>('');

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const testCreateDefinition = async () => {
    try {
      addLog('创建 PBT 定义...');
      const id = await invoke<string>('create_simple_test_definition');
      setDefId(id);
      addLog(`✅ 定义创建成功！ID: ${id}`);
    } catch (error) {
      addLog(`❌ 创建定义失败: ${error}`);
    }
  };

  const testCreateInstance = async () => {
    if (!defId) {
      addLog('❌ 请先创建定义');
      return;
    }
    try {
      addLog('创建 PBT 实例...');
      const id = await invoke<string>('create_pbt_instance', {
        definitionId: defId,
        accountId: 'test-1'
      });
      setInstanceId(id);
      addLog(`✅ 实例创建成功！ID: ${id}`);
    } catch (error) {
      addLog(`❌ 创建实例失败: ${error}`);
    }
  };

  const testGetStatus = async () => {
    if (!instanceId) {
      addLog('❌ 请先创建实例');
      return;
    }
    try {
      addLog('获取实例状态...');
      const status = await invoke('get_pbt_instance_status', {
        instanceId
      });
      addLog(`📊 实例状态: ${JSON.stringify(status, null, 2)}`);
    } catch (error) {
      addLog(`❌ 获取状态失败: ${error}`);
    }
  };

  const testTriggerTick = async () => {
    try {
      addLog('触发 PBT Tick...');
      const result = await invoke('trigger_pbt_tick', {
        accountId: 'test-1'
      });
      addLog(`⚡ Tick 结果: ${result}`);
    } catch (error) {
      addLog(`❌ Tick 失败: ${error}`);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">PBT 功能测试</h2>
      
      <div className="space-x-2">
        <button
          onClick={testCreateDefinition}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          1. 创建定义
        </button>
        <button
          onClick={testCreateInstance}
          disabled={!defId}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          2. 创建实例
        </button>
        <button
          onClick={testGetStatus}
          disabled={!instanceId}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          3. 查看状态
        </button>
        <button
          onClick={testTriggerTick}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          4. 触发 Tick
        </button>
      </div>

      <div className="mt-4">
        <h3 className="font-bold mb-2">测试日志:</h3>
        <div className="bg-gray-100 p-4 rounded h-96 overflow-y-auto font-mono text-sm">
          {logs.map((log, i) => (
            <div key={i} className="mb-1">{log}</div>
          ))}
        </div>
      </div>

      {defId && (
        <div className="text-sm text-gray-600">
          <div>定义 ID: {defId}</div>
          {instanceId && <div>实例 ID: {instanceId}</div>}
        </div>
      )}
    </div>
  );
}
