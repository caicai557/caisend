import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Save, PlayCircle, FolderOpen } from 'lucide-react';
import { WorkflowEditor } from '@/components/workflow/WorkflowEditor';
import { useWorkflowStore } from '@/stores/workflowStore';
import { compileWorkflow, decompileWorkflow } from '@/lib/workflow-compiler';
import { workflowApi } from '@/lib/tauri-api';

export const Route = createFileRoute('/workflows/editor' as any)({
    component: WorkflowEditorPage,
});

function WorkflowEditorPage() {
    const { nodes, edges } = useWorkflowStore();
    const [workflowName, setWorkflowName] = useState('新工作流');
    const [workflowDescription, setWorkflowDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isValidating, setIsValidating] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // 1. 编译为 JSON DSL
            const compiled = compileWorkflow(nodes, edges, {
                name: workflowName,
                description: workflowDescription,
            });

            // 2. 验证
            const report = await workflowApi.validate(compiled);
            if (report.errors.length > 0) {
                alert(`验证失败:\n${report.errors.join('\n')}`);
                return;
            }

            // 3. 保存
            await workflowApi.save(compiled);
            alert('工作流保存成功！');
        } catch (error: any) {
            console.error('保存失败:', error);
            alert(`保存失败: ${error.message || error}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleValidate = async () => {
        setIsValidating(true);
        try {
            const compiled = compileWorkflow(nodes, edges, {
                name: workflowName,
                description: workflowDescription,
            });

            const report = await workflowApi.validate(compiled);

            if (report.errors.length === 0 && report.warnings.length === 0) {
                alert('✅ 验证通过！工作流逻辑正确。');
            } else {
                const message = [
                    report.errors.length > 0 ? `❌ 错误 (${report.errors.length}):\n${report.errors.join('\n')}` : '',
                    report.warnings.length > 0 ? `⚠️ 警告 (${report.warnings.length}):\n${report.warnings.join('\n')}` : '',
                ].filter(Boolean).join('\n\n');
                alert(message);
            }
        } catch (error: any) {
            console.error('验证失败:', error);
            alert(`验证失败: ${error.message || error}`);
        } finally {
            setIsValidating(false);
        }
    };

    const handleLoad = async () => {
        try {
            const workflows = await workflowApi.loadAll();
            if (workflows.length === 0) {
                alert('暂无已保存的工作流');
                return;
            }

            // 简单演示：加载第一个工作流
            // 实际应用中应该显示列表让用户选择
            const firstWorkflow = workflows[0];
            if (!firstWorkflow) {
                alert('工作流数据无效');
                return;
            }

            const { nodes: loadedNodes, edges: loadedEdges } = decompileWorkflow(firstWorkflow);

            useWorkflowStore.getState().setNodes(loadedNodes);
            useWorkflowStore.getState().setEdges(loadedEdges);
            setWorkflowName(firstWorkflow.name);
            setWorkflowDescription(firstWorkflow.description);

            alert(`已加载工作流: ${firstWorkflow.name}`);
        } catch (error: any) {
            console.error('加载失败:', error);
            alert(`加载失败: ${error.message || error}`);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            {/* 顶部工具栏 */}
            <div className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-gray-800">尚书省 - 工作流编辑器</h1>
                    <input
                        type="text"
                        value={workflowName}
                        onChange={(e) => setWorkflowName(e.target.value)}
                        placeholder="工作流名称"
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleLoad}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                        <FolderOpen className="w-4 h-4" />
                        加载
                    </button>

                    <button
                        onClick={handleValidate}
                        disabled={isValidating}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50"
                    >
                        <PlayCircle className="w-4 h-4" />
                        {isValidating ? '验证中...' : '验证'}
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? '保存中...' : '保存'}
                    </button>
                </div>
            </div>

            {/* 工作流编辑器 */}
            <WorkflowEditor />
        </div>
    );
}
