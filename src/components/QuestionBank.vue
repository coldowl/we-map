<template>
  <div class="question-bank">
    <h3>{{ t('questionBank.title') }}</h3>
    <div class="info">
      <span>{{ t('questionBank.count', { count: questionCount }) }}</span>
      <button @click="refreshCount" class="refresh-btn">{{ t('questionBank.refresh') }}</button>
    </div>

    <div class="fetch-section">
      <h4>{{ t('questionBank.fetchAuto') }}</h4>
      <p class="fetch-desc">{{ t('questionBank.fetchAutoDesc') }}</p>
      <div class="fetch-controls">
        <label>{{ t('questionBank.fetchCount') }}</label>
        <input type="number" v-model.number="fetchCount" min="10" max="2000" step="10" :disabled="fetching" />
        <button @click="handleFetch" :disabled="fetching || fetchCount < 10">
          {{ fetching ? t('questionBank.fetching') : t('questionBank.fetchAuto') }}
        </button>
      </div>
      <div v-if="fetching" class="fetch-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <span class="progress-text">{{ t('questionBank.fetchProgress', { current: fetchCurrent, total: fetchCount, region: fetchRegion }) }}</span>
      </div>
      <p v-if="fetchMessage" :class="fetchError ? 'error' : 'success'">{{ fetchMessage }}</p>
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
import { getQuestionCount, importFromJson, importFromCsv, fetchQuestionsFromApi } from '../services/questionBank'

const { t } = useI18n()

const questionCount = ref(0)
const importMode = ref<'json' | 'csv'>('json')
const importContent = ref('')
const importing = ref(false)
const importMessage = ref('')
const importError = ref(false)

const fetchCount = ref(100)
const fetching = ref(false)
const fetchCurrent = ref(0)
const fetchRegion = ref('')
const fetchMessage = ref('')
const fetchError = ref(false)

const progressPercent = ref(0)

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

async function handleFetch() {
  fetching.value = true
  fetchMessage.value = ''
  fetchError.value = false
  fetchCurrent.value = 0
  fetchRegion.value = ''
  progressPercent.value = 0

  try {
    const count = await fetchQuestionsFromApi(fetchCount.value, (current, total, region) => {
      fetchCurrent.value = current
      fetchRegion.value = region
      progressPercent.value = Math.min(100, Math.round((current / total) * 100))
    })
    fetchMessage.value = t('questionBank.fetchSuccess', { count })
    await refreshCount()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'NO_TOKEN') {
      fetchMessage.value = t('questionBank.fetchNeedToken')
    } else {
      fetchMessage.value = t('questionBank.fetchFailed', { error: msg })
    }
    fetchError.value = true
  } finally {
    fetching.value = false
  }
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

.fetch-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.fetch-section h4 {
  margin: 0 0 4px;
}

.fetch-desc {
  color: #888;
  font-size: 0.8rem;
  margin: 0 0 12px;
}

.fetch-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fetch-controls label {
  font-size: 0.85rem;
  white-space: nowrap;
}

.fetch-controls input[type='number'] {
  width: 80px;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.fetch-controls button {
  padding: 8px 16px;
  border: 1px solid #3498db;
  border-radius: 4px;
  background: #3498db;
  color: #fff;
  cursor: pointer;
  font-size: 0.9rem;
  white-space: nowrap;
}

.fetch-controls button:hover:not(:disabled) {
  background: #2980b9;
}

.fetch-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.fetch-progress {
  margin-top: 12px;
}

.progress-bar {
  height: 6px;
  background: #eee;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #3498db;
  border-radius: 3px;
  transition: width 0.3s;
}

.progress-text {
  display: block;
  margin-top: 4px;
  font-size: 0.8rem;
  color: #666;
}
</style>
