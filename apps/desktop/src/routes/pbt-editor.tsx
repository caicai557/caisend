import { createFileRoute } from '@tanstack/react-router';
import { PBTEditor } from '@/components/workflow/PBTEditor';

export const Route = createFileRoute('/pbt-editor' as any)({
    component: PBTEditorPage,
});

function PBTEditorPage() {
    return (
        <div className="h-screen flex flex-col bg-gray-50">
            <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="text-2xl">🌳</div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-800">PBT 可视化编辑器</h1>
                        <p className="text-xs text-gray-500">拖拽式行为树设计工具</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="px-2 py-1 bg-green-100 text-green-700 rounded">
                        ● 已保存
                    </div>
                </div>
            </header>
            <div className="flex-1 overflow-hidden">
                <PBTEditor />
            </div>
        </div>
    );
}
