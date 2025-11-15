#!/usr/bin/env tsx

/**
 * DSL Flow 可视化 & 版本治理工具
 * 
 * 功能:
 * 1. 生成 Flow 依赖图
 * 2. 版本对比和差异检测
 * 3. CI/CD 集成支持
 * 4. 历史变更记录
 * 
 * 依赖安装:
 * npm install --save-dev @types/node
 * npm install graphviz
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { execSync } from 'node:child_process'
// import type { Graphviz } from 'graphviz' // 可选依赖

interface FlowNode {
  id: string
  name: string
  type: 'trigger' | 'processor' | 'condition' | 'action'
  description?: string
  inputs: string[]
  outputs: string[]
  metadata: {
    version: string
    featureFlags: string[]
    author: string
    createdAt: string
    updatedAt: string
  }
}

interface FlowEdge {
  from: string
  to: string
  condition?: string
  label?: string
}

interface FlowGraph {
  nodes: FlowNode[]
  edges: FlowEdge[]
  metadata: {
    name: string
    version: string
    description: string
    createdAt: string
  }
}

interface FlowDiff {
  added: FlowNode[]
  removed: FlowNode[]
  modified: Array<{
    node: FlowNode
    changes: string[]
  }>
  versionChange: {
    from: string
    to: string
  }
}

class FlowGraphGenerator {
  private flowsDir: string
  private versionHistoryDir: string
  private outputDir: string

  constructor(projectRoot: string) {
    this.flowsDir = path.join(projectRoot, 'src/flows')
    this.versionHistoryDir = path.join(projectRoot, 'flows/version-history')
    this.outputDir = path.join(projectRoot, 'dist/flow-graphs')
    
    this.ensureDirectories()
  }

  private ensureDirectories(): void {
    [this.flowsDir, this.versionHistoryDir, this.outputDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    })
  }

  /**
   * 扫描并解析所有 Flow 文件
   */
  async scanFlows(): Promise<FlowGraph[]> {
    const flowFiles = this.findFlowFiles()
    const graphs: FlowGraph[] = []

    for (const file of flowFiles) {
      try {
        const graph = await this.parseFlowFile(file)
        graphs.push(graph)
      } catch (error) {
        console.warn(`解析 Flow 文件失败: ${file}`, error)
      }
    }

    return graphs
  }

  private findFlowFiles(): string[] {
    const files: string[] = []
    
    const scanDir = (dir: string) => {
      const items = fs.readdirSync(dir)
      
      for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)
        
        if (stat.isDirectory()) {
          scanDir(fullPath)
        } else if (item.endsWith('.flow.ts') || item.endsWith('.flow.json')) {
          files.push(fullPath)
        }
      }
    }

    if (fs.existsSync(this.flowsDir)) {
      scanDir(this.flowsDir)
    }

    return files
  }

  private async parseFlowFile(filePath: string): Promise<FlowGraph> {
    const content = fs.readFileSync(filePath, 'utf-8')
    
    // 根据文件类型解析
    if (filePath.endsWith('.json')) {
      return this.parseJsonFlow(content, filePath)
    } else {
      return this.parseTypeScriptFlow(content, filePath)
    }
  }

  private parseJsonFlow(content: string, filePath: string): FlowGraph {
    try {
      const data = JSON.parse(content)
      return this.validateFlowGraph(data)
    } catch (error) {
      throw new Error(`JSON Flow 解析失败: ${error.message}`)
    }
  }

  private parseTypeScriptFlow(content: string, filePath: string): FlowGraph {
    // 简化的 TypeScript Flow 解析
    // 实际项目中可以使用 TypeScript Compiler API
    const lines = content.split('\n')
    const nodes: FlowNode[] = []
    const edges: FlowEdge[] = []

    let currentSection: 'nodes' | 'edges' | 'metadata' | null = null

    for (const line of lines) {
      const trimmed = line.trim()
      
      if (trimmed.startsWith('// @nodes')) {
        currentSection = 'nodes'
        continue
      } else if (trimmed.startsWith('// @edges')) {
        currentSection = 'edges'
        continue
      } else if (trimmed.startsWith('// @metadata')) {
        currentSection = 'metadata'
        continue
      }

      if (currentSection === 'nodes' && trimmed.includes('export const')) {
        const node = this.parseNodeFromTS(trimmed)
        if (node) nodes.push(node)
      } else if (currentSection === 'edges' && trimmed.includes('connect(')) {
        const edge = this.parseEdgeFromTS(trimmed)
        if (edge) edges.push(edge)
      }
    }

    return {
      nodes,
      edges,
      metadata: {
        name: path.basename(filePath, '.flow.ts'),
        version: this.extractVersion(content),
        description: this.extractDescription(content),
        createdAt: new Date().toISOString()
      }
    }
  }

  private parseNodeFromTS(line: string): FlowNode | null {
    // 简化的节点解析
    const match = line.match(/export const (\w+).*=.*\{.*type:\s*['"](\w+)['"]/)
    if (!match) return null

    const [, id, type] = match
    
    return {
      id,
      name: id,
      type: type as FlowNode['type'],
      inputs: [],
      outputs: [],
      metadata: {
        version: '1.0.0',
        featureFlags: [],
        author: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }
  }

  private parseEdgeFromTS(line: string): FlowEdge | null {
    // 简化的边解析
    const match = line.match(/connect\(['"](\w+)['"],\s*['"](\w+)['"]/)
    if (!match) return null

    const [, from, to] = match
    
    return { from, to }
  }

  private extractVersion(content: string): string {
    const match = content.match(/@version\s+(\d+\.\d+\.\d+)/)
    return match ? match[1] : '1.0.0'
  }

  private extractDescription(content: string): string {
    const match = content.match(/@description\s+(.+)/)
    return match ? match[1] : ''
  }

  private validateFlowGraph(graph: any): FlowGraph {
    // 验证 Flow Graph 结构
    if (!graph.nodes || !Array.isArray(graph.nodes)) {
      throw new Error('Flow 必须包含 nodes 数组')
    }
    
    if (!graph.edges || !Array.isArray(graph.edges)) {
      throw new Error('Flow 必须包含 edges 数组')
    }

    return graph as FlowGraph
  }

  /**
   * 生成 Graphviz DOT 格式的图
   */
  generateDotGraph(graph: FlowGraph): string {
    let dot = 'digraph Flow {\n'
    dot += '  rankdir=LR;\n'
    dot += '  node [shape=box, style=filled];\n\n'

    // 添加节点
    for (const node of graph.nodes) {
      const color = this.getNodeColor(node.type)
      const label = `${node.name}\\n${node.type}\\nv${node.metadata.version}`
      
      dot += `  "${node.id}" [label="${label}", fillcolor="${color}"];\n`
    }

    dot += '\n'

    // 添加边
    for (const edge of graph.edges) {
      const label = edge.label ? ` [label="${edge.label}"]` : ''
      dot += `  "${edge.from}" -> "${edge.to}"${label};\n`
    }

    dot += '}'
    return dot
  }

  private getNodeColor(type: FlowNode['type']): string {
    const colors = {
      trigger: '#90EE90',
      processor: '#87CEEB',
      condition: '#FFB6C1',
      action: '#DDA0DD'
    }
    return colors[type] || '#F0F0F0'
  }

  /**
   * 生成版本对比
   */
  async generateDiff(oldGraph: FlowGraph, newGraph: FlowGraph): Promise<FlowDiff> {
    const oldNodeIds = new Set(oldGraph.nodes.map(n => n.id))
    const newNodeIds = new Set(newGraph.nodes.map(n => n.id))

    const added = newGraph.nodes.filter(n => !oldNodeIds.has(n.id))
    const removed = oldGraph.nodes.filter(n => !newNodeIds.has(n.id))
    
    const modified: Array<{ node: FlowNode; changes: string[] }> = []
    
    for (const newNode of newGraph.nodes) {
      const oldNode = oldGraph.nodes.find(n => n.id === newNode.id)
      if (oldNode && !this.nodesEqual(oldNode, newNode)) {
        const changes = this.getNodeChanges(oldNode, newNode)
        modified.push({ node: newNode, changes })
      }
    }

    return {
      added,
      removed,
      modified,
      versionChange: {
        from: oldGraph.metadata.version,
        to: newGraph.metadata.version
      }
    }
  }

  private nodesEqual(a: FlowNode, b: FlowNode): boolean {
    return JSON.stringify(a) === JSON.stringify(b)
  }

  private getNodeChanges(old: FlowNode, newNode: FlowNode): string[] {
    const changes: string[] = []
    
    if (old.type !== newNode.type) {
      changes.push(`类型: ${old.type} → ${newNode.type}`)
    }
    
    if (old.metadata.version !== newNode.metadata.version) {
      changes.push(`版本: ${old.metadata.version} → ${newNode.metadata.version}`)
    }
    
    // 添加更多变更检测...
    
    return changes
  }

  /**
   * 保存版本历史
   */
  async saveVersionHistory(graph: FlowGraph, diff?: FlowDiff): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const historyFile = path.join(
      this.versionHistoryDir,
      `${graph.metadata.name}-${timestamp}.json`
    )

    const historyEntry = {
      graph,
      diff,
      timestamp: new Date().toISOString(),
      commit: this.getCurrentCommit()
    }

    fs.writeFileSync(historyFile, JSON.stringify(historyEntry, null, 2))
  }

  private getCurrentCommit(): string {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim()
    } catch {
      return 'unknown'
    }
  }

  /**
   * 生成可视化图片
   */
  async generateVisualization(graph: FlowGraph, format: 'svg' | 'png' = 'svg'): Promise<string> {
    const dot = this.generateDotGraph(graph)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outputFile = path.join(
      this.outputDir,
      `${graph.metadata.name}-${timestamp}.${format}`
    )

    try {
      // 使用 Graphviz 生成图片
      execSync(`dot -T${format} -o "${outputFile}"`, { input: dot })
      return outputFile
    } catch (error) {
      console.error('生成可视化失败:', error)
      throw error
    }
  }

  /**
   * CI/CD 集成 - 生成 PR 注释
   */
  async generatePRComment(diff: FlowDiff): Promise<string> {
    let comment = '## 🔧 Flow 变更摘要\n\n'

    if (diff.added.length > 0) {
      comment += '### ✅ 新增节点\n'
      for (const node of diff.added) {
        comment += `- \`${node.id}\` (${node.type})\n`
      }
      comment += '\n'
    }

    if (diff.removed.length > 0) {
      comment += '### ❌ 移除节点\n'
      for (const node of diff.removed) {
        comment += `- \`${node.id}\` (${node.type})\n`
      }
      comment += '\n'
    }

    if (diff.modified.length > 0) {
      comment += '### 🔄 修改节点\n'
      for (const { node, changes } of diff.modified) {
        comment += `- \`${node.id}\`: ${changes.join(', ')}\n`
      }
      comment += '\n'
    }

    comment += `### 📊 版本变更\n`
    comment += `${diff.versionChange.from} → ${diff.versionChange.to}\n\n`

    comment += '### 📈 影响评估\n'
    comment += `- 影响节点数: ${diff.added.length + diff.removed.length + diff.modified.length}\n`
    comment += `- 破坏性变更: ${diff.removed.length > 0 ? '是' : '否'}\n`

    return comment
  }
}

// CLI 接口
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  
  const generator = new FlowGraphGenerator(process.cwd())

  switch (command) {
    case 'scan':
      const graphs = await generator.scanFlows()
      console.log(`发现 ${graphs.length} 个 Flow`)
      break

    case 'generate':
      const allGraphs = await generator.scanFlows()
      for (const graph of allGraphs) {
        const imageFile = await generator.generateVisualization(graph)
        console.log(`生成可视化: ${imageFile}`)
      }
      break

    case 'diff':
      // 实现版本对比逻辑
      console.log('版本对比功能开发中...')
      break

    case 'pr-comment':
      // 生成 PR 注释
      console.log('PR 注释生成功能开发中...')
      break

    default:
      console.log(`
用法: pnpm run flow:generate <command>

命令:
  scan        - 扫描所有 Flow 文件
  generate    - 生成可视化图片
  diff        - 版本对比
  pr-comment  - 生成 PR 注释
      `)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { FlowGraphGenerator, type FlowGraph, type FlowDiff }
