<script setup lang="ts">
import { ref, computed } from "vue";

interface Account {
  id: string;
  name: string;
  status: "online" | "offline" | "busy";
}

interface WorkflowNode {
  id: string;
  name: string;
  status: "completed" | "current" | "pending";
  scripts: number;
  expanded?: boolean;
}

const props = defineProps<{
  accounts: Account[];
  currentAccount: Account;
  collapsed: boolean;
}>();

const emit = defineEmits<{
  (e: "toggle"): void;
  (e: "select-account", account: Account): void;
}>();

// Workflow nodes with reactive expansion
const nodes = ref<WorkflowNode[]>([
  { id: "1", name: "打招呼", status: "completed", scripts: 3, expanded: false },
  { id: "2", name: "介绍产品", status: "current", scripts: 5, expanded: true },
  { id: "3", name: "处理异议", status: "pending", scripts: 4, expanded: false },
  { id: "4", name: "成交", status: "pending", scripts: 2, expanded: false },
]);

// Computed styles with GPU optimization
const sidebarStyle = computed(() => ({
  width: props.collapsed ? "60px" : "300px",
  // GPU acceleration hint
  transform: "translateZ(0)",
}));

// Toggle node expansion with animation
const toggleNode = (nodeId: string) => {
  const node = nodes.value.find((n) => n.id === nodeId);
  if (node) {
    node.expanded = !node.expanded;
  }
};

// Stagger animation delay calculator
const getStaggerDelay = (index: number) => ({
  animationDelay: `${index * 50}ms`,
});
</script>

<template>
  <aside class="sidebar" :style="sidebarStyle">
    <!-- Header with GPU optimization -->
    <div class="sidebar-header gpu-accelerated">
      <Transition name="fade-scale" mode="out-in">
        <div v-if="!collapsed" class="logo" key="logo">
          <span class="logo-icon">⚡</span>
          <span class="logo-text gradient-text">Teleflow</span>
        </div>
      </Transition>
      <button
        class="toggle-btn press-effect"
        @click="emit('toggle')"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        <Transition name="fade" mode="out-in">
          <span v-if="collapsed" key="expand">→</span>
          <span v-else key="collapse">←</span>
        </Transition>
      </button>
    </div>

    <Transition name="slide-fade">
      <div v-if="!collapsed" class="sidebar-content">
        <!-- Account Selector -->
        <div class="account-selector animate-fade-in">
          <select
            class="account-select"
            @change="(e) => emit('select-account', accounts.find(a => a.id === (e.target as HTMLSelectElement).value)!)"
          >
            <option
              v-for="acc in accounts"
              :key="acc.id"
              :value="acc.id"
              :selected="acc.id === currentAccount.id"
            >
              {{ acc.name }}
            </option>
          </select>
          <span class="status-dot" :class="currentAccount.status"></span>
        </div>

        <!-- Status Bar -->
        <div class="status-bar glass">
          <span class="status-label">当前流程</span>
          <span class="status-value gradient-text">客户开发</span>
        </div>

        <!-- Node List with smooth scrolling -->
        <div class="node-list smooth-scroll">
          <TransitionGroup name="list" tag="div">
            <div
              v-for="(node, index) in nodes"
              :key="node.id"
              class="node-item hover-lift"
              :class="{
                current: node.status === 'current',
                completed: node.status === 'completed',
                expanded: node.expanded,
              }"
              :style="getStaggerDelay(index)"
              @click="toggleNode(node.id)"
            >
              <div class="node-status-icon">
                <Transition name="fade-scale" mode="out-in">
                  <span
                    v-if="node.status === 'completed'"
                    key="check"
                    class="icon-check"
                    >✓</span
                  >
                  <span
                    v-else-if="node.status === 'current'"
                    key="current"
                    class="icon-current"
                    >●</span
                  >
                  <span v-else key="pending" class="icon-pending">○</span>
                </Transition>
              </div>
              <div class="node-info">
                <span class="node-name">{{ node.name }}</span>
                <span class="node-scripts">{{ node.scripts }} 话术</span>
              </div>
              <div class="node-expand" :class="{ rotated: node.expanded }">
                ▼
              </div>
            </div>
          </TransitionGroup>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <button class="btn btn-primary action-btn">
            <span class="btn-icon">▶</span>
            <span class="btn-text">下一步</span>
          </button>
        </div>
      </div>
    </Transition>
  </aside>
</template>

<style scoped>
/* Sidebar - GPU accelerated container */
.sidebar {
  height: 100vh;
  background: rgba(15, 52, 96, 0.95);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  /* GPU optimization */
  transform: translateZ(0);
  backface-visibility: hidden;
  /* Smooth width transition */
  transition: width var(--duration-normal) var(--ease-out-expo);
  /* Layout containment for performance */
  contain: layout style;
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
  min-height: 60px;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.logo-icon {
  font-size: 24px;
  animation: statusPulse 2s ease-in-out infinite;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
}

.toggle-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transform: translateZ(0);
  transition: background var(--duration-fast) var(--ease-out-quart),
    transform var(--duration-fast) var(--spring);
}

.toggle-btn:hover {
  background: var(--accent-primary);
  box-shadow: var(--shadow-glow);
}

.account-selector {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
}

.account-select {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: border-color var(--duration-fast) var(--ease-out-quart),
    box-shadow var(--duration-fast) var(--ease-out-quart);
}

.account-select:hover {
  border-color: var(--accent-primary);
}

.account-select:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.2);
}

.status-bar {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  margin: 0 var(--spacing-sm);
  border-radius: var(--radius-md);
  font-size: 13px;
}

.status-label {
  color: var(--text-secondary);
}

.status-value {
  font-weight: 600;
}

.node-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-sm);
  /* Smooth scroll with momentum */
  overscroll-behavior: contain;
}

.node-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-xs);
  border-radius: var(--radius-md);
  cursor: pointer;
  /* GPU acceleration for smooth hover */
  transform: translateZ(0);
  /* Optimized transitions - only transform and opacity */
  transition: transform var(--duration-fast) var(--spring),
    background var(--duration-fast) var(--ease-out-quart),
    box-shadow var(--duration-fast) var(--ease-out-quart);
  /* Initial animation */
  animation: fadeIn var(--duration-normal) var(--ease-out-expo) both;
}

.node-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.node-item.current {
  background: rgba(233, 69, 96, 0.15);
  border-left: 3px solid var(--accent-primary);
  box-shadow: inset 0 0 20px rgba(233, 69, 96, 0.1);
}

.node-item.completed {
  opacity: 0.75;
}

.node-item.completed:hover {
  opacity: 1;
}

.node-status-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--text-secondary);
}

.node-item.current .node-status-icon {
  color: var(--accent-primary);
}

.node-item.completed .node-status-icon {
  color: var(--success);
}

.icon-current {
  animation: statusPulse 1.5s ease-in-out infinite;
}

.node-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* Enable text truncation */
}

.node-name {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-scripts {
  font-size: 12px;
  color: var(--text-secondary);
}

.node-expand {
  color: var(--text-muted);
  font-size: 10px;
  transform: translateZ(0);
  transition: transform var(--duration-fast) var(--ease-out-expo);
}

.node-expand.rotated {
  transform: rotate(180deg) translateZ(0);
}

.quick-actions {
  padding: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.action-btn {
  width: 100%;
  padding: var(--spacing-md);
  font-size: 15px;
  font-weight: 600;
}

.btn-icon {
  margin-right: var(--spacing-xs);
}

/* Vue Transition Animations - GPU optimized */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--duration-fast) var(--ease-out-quart);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity var(--duration-fast) var(--ease-out-quart),
    transform var(--duration-fast) var(--ease-out-quart);
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.9) translateZ(0);
}

.slide-fade-enter-active {
  transition: all var(--duration-normal) var(--ease-out-expo);
}

.slide-fade-leave-active {
  transition: all var(--duration-fast) var(--ease-out-quart);
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(-10px) translateZ(0);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-10px) translateZ(0);
}

/* List transition for nodes */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all var(--duration-normal) var(--ease-out-expo);
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-20px) translateZ(0);
}

.list-leave-active {
  position: absolute;
}
</style>
