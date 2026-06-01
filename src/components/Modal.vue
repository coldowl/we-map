<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="onCancel">
        <div class="modal-box">
          <p class="modal-message">{{ message }}</p>
          <div class="modal-actions">
            <button v-if="showCancel" class="modal-btn cancel" @click="onCancel">{{ t('modal.cancel') }}</button>
            <button class="modal-btn confirm" @click="onConfirm">{{ t('modal.confirm') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const visible = defineModel<boolean>({ default: false })
const props = defineProps<{
  message: string
  showCancel?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function onConfirm() {
  visible.value = false
  emit('confirm')
}

function onCancel() {
  visible.value = false
  emit('cancel')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-box {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 28px 32px;
  min-width: 320px;
  max-width: 420px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
}

.modal-message {
  margin: 0 0 24px;
  font-size: 1rem;
  color: var(--text-primary);
  line-height: 1.6;
  text-align: center;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.modal-btn {
  padding: 8px 24px;
  border-radius: 8px;
  border: 1px solid var(--border);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.modal-btn.cancel {
  background: var(--bg-elevated);
  color: var(--text-secondary);
}

.modal-btn.cancel:hover {
  background: var(--border-light);
}

.modal-btn.confirm {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.modal-btn.confirm:hover {
  background: var(--accent-hover);
}

/* transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
