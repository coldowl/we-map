<template>
  <div class="question-bank">
    <h3>{{ t('questionBank.title') }}</h3>
    <div class="info">
      <span>{{ t('questionBank.count', { count: questionCount }) }}</span>
      <button @click="refreshCount" class="refresh-btn">{{ t('questionBank.refresh') }}</button>
    </div>

    <div class="import-section">
      <h4>{{ t('questionBank.import') }}</h4>
      <div class="import-tabs">
        <button :class="{ active: importMode === 'json' }" @click="importMode = 'json'">JSON</button>
        <button :class="{ active: importMode === 'csv' }" @click="importMode = 'csv'">CSV</button>
      </div>

      <textarea
        v-model="importContent"
        :placeholder="importMode === 'json'
          ? t('questionBank.jsonPlaceholder')
          : t('questionBank.csvPlaceholder')"
        rows="8"
      ></textarea>

      <div class="import-actions">
        <button @click="handleImport" :disabled="!importContent.trim() || importing">
          {{ importing ? t('questionBank.importing') : t('questionBank.importBtn') }}
        </button>
        <label class="file-btn">
          {{ t('questionBank.selectFile') }}
          <input type="file" :accept="importMode === 'json' ? '.json' : '.csv'" @change="handleFileSelect" hidden />
        </label>
      </div>

      <p v-if="importMessage" :class="importError ? 'error' : 'success'">{{ importMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getQuestionCount, importFromJson, importFromCsv } from '../services/questionBank'

const { t } = useI18n()

const questionCount = ref(0)
const importMode = ref<'json' | 'csv'>('json')
const importContent = ref('')
const importing = ref(false)
const importMessage = ref('')
const importError = ref(false)

onMounted(refreshCount)

async function refreshCount() {
  try {
    questionCount.value = await getQuestionCount()
  } catch (err) {
    console.error('Failed to get question count:', err)
  }
}

async function handleImport() {
  importing.value = true
  importMessage.value = ''
  importError.value = false

  try {
    let count: number
    if (importMode.value === 'json') {
      count = await importFromJson(importContent.value)
    } else {
      count = await importFromCsv(importContent.value)
    }
    importMessage.value = t('questionBank.importSuccess', { count })
    importContent.value = ''
    await refreshCount()
  } catch (err) {
    importMessage.value = t('questionBank.importFailed', { error: err instanceof Error ? err.message : 'Unknown error' })
    importError.value = true
  } finally {
    importing.value = false
  }
}

function handleFileSelect(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    importContent.value = reader.result as string
  }
  reader.readAsText(file)
}
</script>

<style scoped>
.question-bank {
  padding: 16px;
  max-width: 600px;
}

h3 {
  margin: 0 0 12px;
}

.info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.refresh-btn {
  padding: 4px 12px;
  font-size: 0.8rem;
}

.import-section h4 {
  margin: 0 0 8px;
}

.import-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.import-tabs button {
  padding: 6px 16px;
  border: 1px solid #ccc;
  background: #fff;
  cursor: pointer;
  border-radius: 4px;
}

.import-tabs button.active {
  background: #3498db;
  color: #fff;
  border-color: #3498db;
}

textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.85rem;
  resize: vertical;
  box-sizing: border-box;
}

.import-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.import-actions button,
.file-btn {
  padding: 8px 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 0.9rem;
}

.import-actions button:hover,
.file-btn:hover {
  background: #f0f0f0;
}

.import-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.success {
  color: #27ae60;
  margin: 8px 0 0;
}

.error {
  color: #e74c3c;
  margin: 8px 0 0;
}
</style>
