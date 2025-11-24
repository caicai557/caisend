import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ipcListActiveInstances } from '@/lib/ipc'
import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { Activity, Clock, CheckCircle, AlertCircle } from 'lucide-react'

export const Route = createFileRoute('/workflows/')({
    component: WorkflowList,
})

function WorkflowList() {
    const { data: instances, isLoading, refetch } = useQuery({
        queryKey: ['active-instances'],
        queryFn: ipcListActiveInstances,
        refetchInterval: 3000 // Poll every 3s as fallback
    })

    // Real-time updates via Tauri Events
    useEffect(() => {
        const unlisten = listen('workflow-state-changed', () => {
            refetch()
        })

        return () => {
            unlisten.then(f => f())
        }
    }, [refetch])

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Running':
                return <Activity className="w-5 h-5 text-blue-500 animate-pulse" />
            case 'WaitingForResponse':
                return <Clock className="w-5 h-5 text-yellow-500" />
            case 'Completed':
                return <CheckCircle className="w-5 h-5 text-green-500" />
            default:
                return <AlertCircle className="w-5 h-5 text-gray-500" />
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Running':
                return 'bg-blue-50 border-blue-200'
            case 'WaitingForResponse':
                return 'bg-yellow-50 border-yellow-200'
            case 'Completed':
                return 'bg-green-50 border-green-200'
            default:
                return 'bg-gray-50 border-gray-200'
        }
    }

    return (
        <div className="p-6 space-y-6 min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage and monitor your conversational workflows</p>
                </div>
                <Link
                    to="/workflows/editor"
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                >
                    + Create New Workflow
                </Link>
            </div>

            <div className="grid gap-6">
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="border-b border-gray-200 p-4 bg-gray-50 rounded-t-xl">
                        <h2 className="font-semibold text-lg flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-600" />
                            Active Instances
                            {instances && <span className="text-sm font-normal text-gray-500">({instances.length})</span>}
                        </h2>
                    </div>
                    <div className="p-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Activity className="w-6 h-6 animate-spin text-blue-600" />
                                <span className="ml-2 text-gray-600">Loading workflows...</span>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {instances?.map(inst => (
                                    <div
                                        key={inst.id}
                                        className={`flex justify-between items-center p-4 border rounded-lg transition-all hover:shadow-md ${getStatusColor(inst.status)}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            {getStatusIcon(inst.status)}
                                            <div>
                                                <div className="font-medium text-gray-900">Contact: {inst.contact_id.slice(0, 8)}...</div>
                                                <div className="text-xs text-gray-600 mt-1">
                                                    Workflow ID: {inst.definition_id.slice(0, 8)}...
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-semibold text-gray-800">{inst.status}</div>
                                            <div className="text-xs text-gray-600 mt-1">
                                                {inst.current_node_id ? `Node: ${inst.current_node_id}` : 'Completed'}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                Updated: {new Date(inst.updated_at).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!instances || instances.length === 0) && (
                                    <div className="text-center py-12">
                                        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 font-medium">No active workflow instances</p>
                                        <p className="text-sm text-gray-400 mt-1">Create a workflow and trigger it to see it here</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
