import type { Node, Edge } from 'reactflow';
import type { PBTNodeDataPBTBackendNode, PBTDefinition } from '@/types/pbt';

/**
 * Convert React Flow nodes and edges to backend PBT format
 */
export function convertToPBTDefinition(
    nodes: Node<PBTNodeData>[],
    edges: Edge[],
    name: string,
    description?: string
): PBTDefinition | null {
    if (nodes.length === 0) return null;

    // Find root node (node with no incoming edges)
    const rootNode = findRootNode(nodes, edges);
    if (!rootNode) {
        console.error('No root node found');
        return null;
    }

    // Build tree structure
    const backendNode = nodeToBackendFormat(rootNode, nodes, edges);

    return {
        id: crypto.randomUUID(),
        name,
        description,
        root_node: backendNode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
}

/**
 * Find the root node (node with no incoming edges)
 */
function findRootNode(nodes: Node<PBTNodeData>[], edges: Edge[]): Node<PBTNodeData> | null {
    const nodesWithIncoming = new Set(edges.map(e => e.target));
    const rootNodes = nodes.filter(n => !nodesWithIncoming.has(n.id));
    return rootNodes[0] || nodes[0]; // Fallback to first node if no clear root
}

/**
 * Convert a node to backend format recursively including children
 */
function nodeToBackendFormat(
    node: Node<PBTNodeData>,
    allNodes: Node<PBTNodeData>[],
    edges: Edge[]
): PBTBackendNode {
    const children = getChildren(node.id, allNodes, edges);

    const backendNode: PBTBackendNode = {
        node_type: node.data.type,
        label: node.data.label,
        config: {},
    };

    // Add type-specific config
    if (node.data.type === 'action' && node.data.actionType) {
        backendNode.config = {
            action_type: node.data.actionType,
            action_params: node.data.actionParams || {},
        };
    }

    if (node.data.type === 'condition' && node.data.expression) {
        backendNode.config = {
            expression: node.data.expression,
        };
    }

    if (node.data.type === 'decorator' && node.data.decoratorType) {
        backendNode.config = {
            decorator_type: node.data.decoratorType,
            decorator_params: node.data.decoratorParams || {},
        };
    }

    // Add children for composite nodes
    if (children.length > 0) {
        backendNode.children = children.map(child =>
            nodeToBackendFormat(child, allNodes, edges)
        );
    }

    return backendNode;
}

/**
 * Get child nodes of a given node ID
 */
function getChildren(
    nodeId: string,
    allNodes: Node<PBTNodeData>[],
    edges: Edge[]
): Node<PBTNodeData>[] {
    const childIds = edges
        .filter(e => e.source === nodeId)
        .map(e => e.target);

    return allNodes.filter(n => childIds.includes(n.id));
}

/**
 * Load PBT definition and convert to React Flow format
 */
export function convertFromPBTDefinition(
    definition: PBTDefinition
): { nodes: Node<PBTNodeData>[], edges: Edge[] } {
    const nodes: Node<PBTNodeData>[] = [];
    const edges: Edge[] = [];
    let yOffset = 0;

    function traverseNode(
        backendNode: PBTBackendNode,
        parentId?: string,
        depth = 0
    ): string {
        const nodeId = `${backendNode.node_type}-${Date.now()}-${Math.random()}`;

        // Create React Flow node
        const flowNode: Node<PBTNodeData> = {
            id: nodeId,
            type: 'pbt-node',
            position: {
                x: depth * 250,
                y: yOffset,
            },
            data: {
                label: backendNode.label,
                type: backendNode.node_type,
                description: '',
                ...extractConfigData(backendNode),
            },
        };

        nodes.push(flowNode);
        yOffset += 100;

        // Create edge from parent
        if (parentId) {
            edges.push({
                id: `e-${parentId}-${nodeId}`,
                source: parentId,
                target: nodeId,
                type: 'default',
            });
        }

        // Process children
        if (backendNode.children) {
            backendNode.children.forEach(child => {
                traverseNode(child, nodeId, depth + 1);
            });
        }

        return nodeId;
    }

    traverseNode(definition.root_node);

    return { nodes, edges };
}

/**
 * Extract config data from backend node
 */
function extractConfigData(backendNode: PBTBackendNode): Partial<PBTNodeData> {
    const configData: Partial<PBTNodeData> = {};

    if (backendNode.config) {
        if ('action_type' in backendNode.config) {
            configData.actionType = backendNode.config.action_type as string;
            configData.actionParams = backendNode.config.action_params as Record<string, any>;
        }

        if ('expression' in backendNode.config) {
            configData.expression = backendNode.config.expression as string;
        }

        if ('decorator_type' in backendNode.config) {
            configData.decoratorType = backendNode.config.decorator_type as string;
            configData.decoratorParams = backendNode.config.decorator_params as Record<string, any>;
        }
    }

    return configData;
}
