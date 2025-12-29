<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

// Types matching PoSend's database structure
interface ScriptCategory {
  id: number;
  parentSign: string | null;
  sign: string;
  label: string;
  position: number;
  isGroup: boolean;
}

interface ScriptContentItem {
  type: number; // 1=text, 2=image
  value: string;
  name: string;
}

interface ScriptItem {
  id: number;
  parentSign: string;
  sign: string;
  label: string;
  content: ScriptContentItem[];
  position: number;
  scriptType: number;
}

// State
const categories = ref<ScriptCategory[]>([
  {
    id: 1,
    parentSign: null,
    sign: "TSM-001",
    label: "客户开发",
    position: 1,
    isGroup: false,
  },
  {
    id: 2,
    parentSign: null,
    sign: "TSM-002",
    label: "产品介绍",
    position: 2,
    isGroup: false,
  },
  {
    id: 3,
    parentSign: null,
    sign: "TSM-003",
    label: "异议处理",
    position: 3,
    isGroup: false,
  },
]);

const selectedCategory = ref<ScriptCategory | null>(categories.value[0]);

const scripts = ref<ScriptItem[]>([
  {
    id: 1,
    parentSign: "TSM-001",
    sign: "TSM-101",
    label: "打招呼",
    content: [{ type: 1, value: "您好！很高兴认识您 😊", name: "" }],
    position: 1,
    scriptType: 0,
  },
  {
    id: 2,
    parentSign: "TSM-001",
    sign: "TSM-102",
    label: "自我介绍",
    content: [
      { type: 1, value: "我是XX公司的客户经理，专门为您服务！", name: "" },
    ],
    position: 2,
    scriptType: 0,
  },
  {
    id: 3,
    parentSign: "TSM-002",
    sign: "TSM-201",
    label: "产品优势",
    content: [
      {
        type: 1,
        value: "我们的产品有以下三大优势：\n1. 高效\n2. 安全\n3. 便捷",
        name: "",
      },
    ],
    position: 1,
    scriptType: 0,
  },
]);

const editingScript = ref<ScriptItem | null>(null);
const editText = ref("");
const isEditMode = ref(false);

// Computed
const filteredScripts = computed(() => {
  if (!selectedCategory.value) return [];
  return scripts.value.filter(
    (s) => s.parentSign === selectedCategory.value?.sign
  );
});

// Methods
const selectCategory = (category: ScriptCategory) => {
  selectedCategory.value = category;
};

const selectScript = (script: ScriptItem) => {
  editingScript.value = script;
  editText.value = script.content[0]?.value || "";
  isEditMode.value = false;
};

const startEdit = () => {
  isEditMode.value = true;
};

const saveScript = () => {
  if (editingScript.value) {
    editingScript.value.content[0].value = editText.value;
    isEditMode.value = false;
  }
};

const cancelEdit = () => {
  if (editingScript.value) {
    editText.value = editingScript.value.content[0]?.value || "";
  }
  isEditMode.value = false;
};

const copyScript = () => {
  if (editingScript.value) {
    navigator.clipboard.writeText(editingScript.value.content[0]?.value || "");
    // TODO: Show toast
  }
};

const sendScript = () => {
  if (editingScript.value) {
    // TODO: Trigger CDP send via IPC
    console.log("📤 Sending script:", editingScript.value.label);
  }
};

const addCategory = () => {
  const newCat: ScriptCategory = {
    id: Date.now(),
    parentSign: null,
    sign: `TSM-${Date.now()}`,
    label: "新分类",
    position: categories.value.length + 1,
    isGroup: false,
  };
  categories.value.push(newCat);
  selectedCategory.value = newCat;
};

const addScript = () => {
  if (!selectedCategory.value) return;
  const newScript: ScriptItem = {
    id: Date.now(),
    parentSign: selectedCategory.value.sign,
    sign: `TSM-${Date.now()}`,
    label: "新话术",
    content: [{ type: 1, value: "", name: "" }],
    position: filteredScripts.value.length + 1,
    scriptType: 0,
  };
  scripts.value.push(newScript);
  selectScript(newScript);
  isEditMode.value = true;
};

onMounted(() => {
  if (filteredScripts.value.length > 0) {
    selectScript(filteredScripts.value[0]);
  }
});
</script>

<template>
  <div class="script-manager">
    <!-- Left Panel: Categories -->
    <div class="categories-panel glass">
      <div class="panel-header">
        <h3 class="gradient-text">📁 话术分类</h3>
        <button class="btn-icon" @click="addCategory" title="添加分类">
          +
        </button>
      </div>
      <div class="categories-list smooth-scroll">
        <div
          v-for="cat in categories"
          :key="cat.sign"
          class="category-item hover-lift"
          :class="{ active: selectedCategory?.sign === cat.sign }"
          @click="selectCategory(cat)"
        >
          <span class="category-icon">📂</span>
          <span class="category-label">{{ cat.label }}</span>
          <span class="category-count">{{
            scripts.filter((s) => s.parentSign === cat.sign).length
          }}</span>
        </div>
      </div>
    </div>

    <!-- Middle Panel: Script List -->
    <div class="scripts-panel glass">
      <div class="panel-header">
        <h3 class="gradient-text">📝 话术列表</h3>
        <button class="btn-icon" @click="addScript" title="添加话术">+</button>
      </div>
      <div class="scripts-list smooth-scroll">
        <TransitionGroup name="list" tag="div">
          <div
            v-for="script in filteredScripts"
            :key="script.sign"
            class="script-item hover-lift"
            :class="{ active: editingScript?.sign === script.sign }"
            @click="selectScript(script)"
            @dblclick="sendScript"
          >
            <div class="script-icon">💬</div>
            <div class="script-info">
              <span class="script-label">{{ script.label }}</span>
              <span class="script-preview"
                >{{ script.content[0]?.value.substring(0, 30) }}...</span
              >
            </div>
          </div>
        </TransitionGroup>
        <div v-if="filteredScripts.length === 0" class="empty-state">
          <span class="empty-icon">📭</span>
          <span class="empty-text">暂无话术，点击 + 添加</span>
        </div>
      </div>
    </div>

    <!-- Right Panel: Editor -->
    <div class="editor-panel glass">
      <div class="panel-header">
        <h3 class="gradient-text">✏️ 编辑器</h3>
        <div class="editor-actions" v-if="editingScript">
          <button
            class="btn btn-secondary btn-sm"
            @click="copyScript"
            title="复制"
          >
            📋
          </button>
          <button
            class="btn btn-primary btn-sm"
            @click="sendScript"
            title="发送"
          >
            📤
          </button>
        </div>
      </div>

      <div class="editor-content" v-if="editingScript">
        <div class="editor-label">
          <input
            v-model="editingScript.label"
            class="label-input"
            placeholder="话术名称"
          />
        </div>

        <div class="editor-textarea-wrapper">
          <textarea
            v-model="editText"
            class="editor-textarea"
            :readonly="!isEditMode"
            placeholder="输入话术内容..."
          ></textarea>
        </div>

        <div class="editor-footer">
          <template v-if="isEditMode">
            <button class="btn btn-secondary" @click="cancelEdit">取消</button>
            <button class="btn btn-primary" @click="saveScript">保存</button>
          </template>
          <template v-else>
            <button class="btn btn-primary" @click="startEdit">编辑</button>
          </template>
        </div>
      </div>

      <div v-else class="empty-state">
        <span class="empty-icon">👈</span>
        <span class="empty-text">选择一个话术进行编辑</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.script-manager {
  display: flex;
  gap: var(--spacing-md);
  height: 100%;
  padding: var(--spacing-md);
}

.categories-panel {
  width: 200px;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.scripts-panel {
  width: 280px;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.editor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
}

.panel-header h3 {
  font-size: 14px;
  font-weight: 600;
}

.btn-icon {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--duration-fast) var(--ease-out-quart);
}

.btn-icon:hover {
  background: var(--accent-primary);
  transform: scale(1.1);
}

.categories-list,
.scripts-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-sm);
}

.category-item,
.script-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  margin-bottom: var(--spacing-xs);
  transition: all var(--duration-fast) var(--ease-out-quart);
}

.category-item:hover,
.script-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.category-item.active,
.script-item.active {
  background: rgba(233, 69, 96, 0.2);
  border-left: 3px solid var(--accent-primary);
}

.category-icon,
.script-icon {
  font-size: 16px;
}

.category-label,
.script-label {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
}

.category-count {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: var(--radius-full);
}

.script-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.script-preview {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.editor-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.btn-sm {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: 12px;
}

.editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md);
}

.editor-label {
  margin-bottom: var(--spacing-md);
}

.label-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
}

.label-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.editor-textarea-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.editor-textarea {
  flex: 1;
  width: 100%;
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  font-family: inherit;
}

.editor-textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.editor-textarea:read-only {
  background: var(--bg-tertiary);
  cursor: default;
}

.editor-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  gap: var(--spacing-sm);
}

.empty-icon {
  font-size: 32px;
  opacity: 0.5;
}

.empty-text {
  font-size: 13px;
}

/* List transitions */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all var(--duration-normal) var(--ease-out-expo);
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.list-leave-active {
  position: absolute;
}
</style>
