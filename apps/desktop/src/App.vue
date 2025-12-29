<script setup lang="ts">
import { ref, onMounted } from "vue";
import Sidebar from "./components/Sidebar.vue";
import ScriptManager from "./components/ScriptManager.vue";

type AccountStatus = "online" | "offline" | "busy";
type ViewType = "home" | "scripts";

interface SystemStatus {
  name: string;
  value: string;
  ok: boolean;
}

// State
const accounts = ref<{ id: string; name: string; status: AccountStatus }[]>([
  { id: "1", name: "@user1", status: "online" },
  { id: "2", name: "@user2", status: "offline" },
]);
const currentAccount = ref(accounts.value[0]);
const sidebarCollapsed = ref(false);
const isLoading = ref(true);
const currentView = ref<ViewType>("home");

// System status
const systemStatus = ref<SystemStatus[]>([
  { name: "Actor System", value: "Online", ok: true },
  { name: "Persistence", value: "SQLite", ok: true },
  { name: "Perception", value: "Ready", ok: true },
  { name: "Intelligence", value: "Active", ok: true },
]);

// Methods
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
};

const switchView = (view: ViewType) => {
  currentView.value = view;
};

// Simulate loading
onMounted(() => {
  console.log("🚀 Teleflow Desktop initialized");
  setTimeout(() => {
    isLoading.value = false;
  }, 300);
});
</script>

<template>
  <div class="app-container">
    <Sidebar
      :accounts="accounts"
      :current-account="currentAccount"
      :collapsed="sidebarCollapsed"
      @toggle="toggleSidebar"
      @select-account="(acc) => (currentAccount = acc)"
    />

    <main class="main-content">
      <!-- Navigation Tabs -->
      <div class="nav-tabs animate-fade-in">
        <button
          class="nav-tab"
          :class="{ active: currentView === 'home' }"
          @click="switchView('home')"
        >
          🏠 首页
        </button>
        <button
          class="nav-tab"
          :class="{ active: currentView === 'scripts' }"
          @click="switchView('scripts')"
        >
          📝 话术管理
        </button>
      </div>

      <Transition name="fade-scale" mode="out-in">
        <!-- Loading State -->
        <div v-if="isLoading" key="loading" class="loading-container">
          <div class="loading-spinner animate-spin">⚡</div>
          <p class="loading-text">Initializing...</p>
        </div>

        <!-- Home View -->
        <div v-else-if="currentView === 'home'" key="home" class="view-content">
          <div class="welcome-card card gpu-accelerated">
            <div class="welcome-icon animate-fade-in">🚀</div>
            <h1 class="welcome-title gradient-text animate-fade-in stagger-1">
              Teleflow 2025
            </h1>
            <p class="welcome-subtitle animate-fade-in stagger-2">
              The Imperial Automation Engine
            </p>

            <div class="status-grid">
              <div
                v-for="(status, index) in systemStatus"
                :key="status.name"
                class="status-item glass hover-lift animate-fade-in"
                :style="{ animationDelay: `${(index + 3) * 50}ms` }"
              >
                <span class="status-label">{{ status.name }}</span>
                <span
                  class="status-value"
                  :class="{ success: status.ok, error: !status.ok }"
                >
                  <span class="status-icon">{{ status.ok ? "✓" : "✗" }}</span>
                  {{ status.value }}
                </span>
              </div>
            </div>

            <div class="performance-badge glass animate-fade-in stagger-5">
              <span class="badge-icon">⚡</span>
              <span class="badge-text">All systems optimized for 60fps</span>
            </div>
          </div>
        </div>

        <!-- Scripts View -->
        <div
          v-else-if="currentView === 'scripts'"
          key="scripts"
          class="view-content scripts-view"
        >
          <ScriptManager />
        </div>
      </Transition>
    </main>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  contain: strict;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md);
  background: radial-gradient(
    ellipse at center,
    rgba(83, 52, 131, 0.1) 0%,
    transparent 70%
  );
}

.nav-tabs {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.nav-tab {
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out-quart);
}

.nav-tab:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.nav-tab.active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: white;
}

.view-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.view-content:not(.scripts-view) {
  align-items: center;
  justify-content: center;
}

.scripts-view {
  padding: 0;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.loading-spinner {
  font-size: 48px;
}

.loading-text {
  color: var(--text-secondary);
  font-size: 14px;
}

.welcome-card {
  text-align: center;
  max-width: 520px;
  padding: var(--spacing-xl) calc(var(--spacing-xl) * 1.5);
  border-radius: var(--radius-xl);
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.welcome-icon {
  font-size: 72px;
  margin-bottom: var(--spacing-md);
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) translateZ(0);
  }
  50% {
    transform: translateY(-8px) translateZ(0);
  }
}

.welcome-title {
  font-size: 36px;
  font-weight: 800;
  margin-bottom: var(--spacing-sm);
  letter-spacing: -0.02em;
}

.welcome-subtitle {
  color: var(--text-secondary);
  margin-bottom: var(--spacing-lg);
  font-size: 16px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
  text-align: left;
  margin-bottom: var(--spacing-lg);
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  transform: translateZ(0);
}

.status-label {
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
}

.status-value {
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.status-icon {
  font-size: 12px;
}

.status-value.success {
  color: var(--success);
}

.status-value.error {
  color: var(--error);
}

.performance-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-full);
  font-size: 12px;
  color: var(--text-secondary);
}

.badge-icon {
  color: var(--accent-primary);
}

/* Vue Transition Animations */
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity var(--duration-normal) var(--ease-out-expo),
    transform var(--duration-normal) var(--ease-out-expo);
}

.fade-scale-enter-from {
  opacity: 0;
  transform: scale(0.95) translateZ(0);
}

.fade-scale-leave-to {
  opacity: 0;
  transform: scale(1.02) translateZ(0);
}
</style>
