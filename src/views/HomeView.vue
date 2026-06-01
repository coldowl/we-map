<template>
  <div class="home">
    <div class="bg-grid"></div>

    <!-- 装饰元素 -->
    <div class="deco deco-coords deco-tl">60°N 25°E</div>
    <div class="deco deco-coords deco-tr">40°N 116°E</div>
    <div class="deco deco-coords deco-bl">34°S 151°E</div>
    <div class="deco deco-coords deco-br">41°N 74°W</div>
    <div class="deco deco-dot deco-dot-1"></div>
    <div class="deco deco-dot deco-dot-2"></div>
    <div class="deco deco-dot deco-dot-3"></div>

    <div class="main-menu">
      <!-- Logo + 标题 -->
      <div class="title-section">
        <svg class="logo" viewBox="0 0 200 200" width="92" height="92">
          <!-- 底色 -->
          <circle cx="100" cy="100" r="96" fill="#2c3e50"/>
          <!-- 外圈 -->
          <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.6" stroke-dasharray="3 6"/>
          <circle cx="100" cy="100" r="72" fill="none" stroke="rgba(52,152,219,0.5)" stroke-width="1.5"/>
          <!-- 刻度 -->
          <g stroke="rgba(52,152,219,0.35)" stroke-width="0.6">
            <line x1="100" y1="28" x2="100" y2="36"/><line x1="100" y1="164" x2="100" y2="172"/>
            <line x1="28" y1="100" x2="36" y2="100"/><line x1="164" y1="100" x2="172" y2="100"/>
            <line x1="51" y1="51" x2="56.5" y2="56.5"/><line x1="143.5" y1="143.5" x2="149" y2="149"/>
            <line x1="149" y1="51" x2="143.5" y2="56.5"/><line x1="56.5" y1="143.5" x2="51" y2="149"/>
          </g>
          <!-- 内圈 -->
          <circle cx="100" cy="100" r="56" fill="none" stroke="rgba(52,152,219,0.25)" stroke-width="0.5"/>
          <!-- 指针 (北-红) -->
          <polygon points="100,34 108,100 100,105 92,100" fill="#e74c3c" opacity="0.9"/>
          <!-- 指针 (南-白) -->
          <polygon points="100,166 92,100 100,95 108,100" fill="rgba(52,152,219,0.15)" stroke="rgba(52,152,219,0.35)" stroke-width="0.5"/>
          <!-- 中心 -->
          <circle cx="100" cy="100" r="6" fill="rgba(52,152,219,0.5)" stroke="rgba(52,152,219,0.5)" stroke-width="1"/>
          <circle cx="100" cy="100" r="2.5" fill="#e67e22"/>
          <!-- 方位标 -->
          <text x="100" y="22" text-anchor="middle" fill="#e74c3c" font-size="12" font-weight="bold" font-family="Inter, sans-serif">N</text>
          <text x="100" y="188" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="10" font-family="Inter, sans-serif">S</text>
          <text x="18" y="104" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="10" font-family="Inter, sans-serif">W</text>
          <text x="182" y="104" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="10" font-family="Inter, sans-serif">E</text>
        </svg>
        <h1 class="title">We-Map</h1>
        <p class="subtitle">{{ t('app.subtitle') }}</p>
      </div>

      <!-- 游戏模式卡片 -->
      <div class="game-modes">
        <div class="mode-card" @click="startGame('standard')">
          <div class="mode-accent accent-blue"></div>
          <div class="mode-body">
            <div class="mode-icon">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/>
              </svg>
            </div>
            <h3>{{ t('menu.standard') }}</h3>
            <p>{{ t('menu.standardDesc', { count: roundsCount }) }}</p>
            <button
              class="mode-btn"
              :disabled="!dbReady || questionCount < roundsCount"
              @click.stop="startGame('standard')"
            >
              {{ !dbReady ? '...' : questionCount < roundsCount ? t('menu.needQuestions', { count: roundsCount, current: questionCount }) : t('menu.startGame') }}
            </button>
          </div>
        </div>

        <div class="mode-card" @click="startGame('survival')">
          <div class="mode-accent accent-orange"></div>
          <div class="mode-body">
            <div class="mode-icon">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z"/>
              </svg>
            </div>
            <h3>{{ t('menu.survival') }}</h3>
            <p>{{ t('menu.survivalDesc', { threshold: survivalThreshold }) }}</p>
            <button
              class="mode-btn"
              :disabled="!dbReady || questionCount < roundsCount"
              @click.stop="startGame('survival')"
            >
              {{ !dbReady ? '...' : questionCount < roundsCount ? t('menu.needQuestions', { count: roundsCount, current: questionCount }) : t('menu.startGame') }}
            </button>
          </div>
        </div>
      </div>

      <!-- 底部导航 -->
      <div class="nav-links">
        <router-link to="/stats" class="nav-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
          </svg>
          {{ t('menu.stats') }}
        </router-link>
        <router-link to="/settings" class="nav-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          {{ t('menu.settings') }}
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useGameStore } from '../stores/game'
import { getRandomQuestions, getQuestionCount } from '../services/questionBank'
import { getSettings } from '../services/settings'

const router = useRouter()
const { t } = useI18n()
const gameStore = useGameStore()
const questionCount = ref(0)
const dbReady = ref(false)
const roundsCount = ref(5)
const survivalThreshold = ref(2000)

onMounted(async () => {
  try {
    const settings = await getSettings()
    roundsCount.value = settings.roundsCount
    survivalThreshold.value = settings.survivalThreshold
  } catch {}
  refreshCount().finally(() => { dbReady.value = true })
})

async function refreshCount() {
  try {
    questionCount.value = await getQuestionCount()
  } catch {
    questionCount.value = 0
  }
}

async function startGame(mode: 'standard' | 'survival') {
  try {
    const count = roundsCount.value
    const questions = await getRandomQuestions(count)
    if (questions.length < count) {
      alert(t('menu.notEnoughQuestions', { count }))
      return
    }
    gameStore.survivalThreshold = survivalThreshold.value
    gameStore.startNewGame(questions, mode)
    router.push('/game')
  } catch (err) {
    console.error('Failed to start game:', err)
    alert(t('menu.loadFailed'))
  }
}
</script>

<style scoped>
.home {
  position: relative;
  display: flex;
  flex: 1;
  overflow: hidden;
  background: var(--bg-page);
}

/* ── 背景网格 ── */
.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--home-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--home-grid) 1px, transparent 1px);
  background-size: 48px 48px;
  pointer-events: none;
}

/* ── 装饰元素 ── */
.deco {
  position: absolute;
  pointer-events: none;
  z-index: 0;
}

.deco-coords {
  font-family: 'Courier New', monospace;
  font-size: 0.7rem;
  color: var(--home-muted);
  letter-spacing: 1px;
}

.deco-tl { top: 24px; left: 24px; }
.deco-tr { top: 24px; right: 24px; }
.deco-bl { bottom: 24px; left: 24px; }
.deco-br { bottom: 24px; right: 24px; }

.deco-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--home-dot);
  animation: pulse-dot 3s ease-in-out infinite;
}

.deco-dot-1 { top: 20%; left: 12%; animation-delay: 0s; }
.deco-dot-2 { top: 65%; right: 10%; animation-delay: 1s; }
.deco-dot-3 { bottom: 25%; left: 25%; animation-delay: 2s; }

@keyframes pulse-dot {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.8); }
}

/* ── 主菜单 ── */
.main-menu {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 36px;
  animation: fade-up 0.8s ease-out;
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── 标题区 ── */
.title-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.logo {
  filter: drop-shadow(0 0 24px rgba(230, 126, 34, 0.12));
}


.title {
  font-size: 3.2rem;
  font-weight: 800;
  letter-spacing: 3px;
  color: var(--home-title);
  margin: 0;
  text-shadow: var(--home-title-shadow);
}

.subtitle {
  margin: 0;
  font-size: 1rem;
  color: var(--home-subtitle);
  letter-spacing: 2px;
}

/* ── 游戏模式卡片 ── */
.game-modes {
  display: flex;
  gap: 24px;
}

.mode-card {
  position: relative;
  width: 240px;
  border: 1px solid var(--home-card-border);
  border-radius: 16px;
  background: var(--home-card-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s, border-color 0.3s, box-shadow 0.3s;
}

.mode-card:hover {
  transform: translateY(-4px);
  border-color: var(--home-card-border-hover);
  box-shadow: 0 12px 40px var(--shadow-strong);
}

.mode-accent {
  height: 3px;
  width: 100%;
}

.accent-blue {
  background: linear-gradient(90deg, #3498db, #2ecc71);
}

.accent-orange {
  background: linear-gradient(90deg, #e67e22, #e74c3c);
}

.mode-body {
  padding: 28px 24px;
  text-align: center;
}

.mode-icon {
  color: var(--home-card-icon);
  margin-bottom: 12px;
}

.mode-body h3 {
  margin: 0 0 8px;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--home-card-title);
}

.mode-body p {
  margin: 0 0 20px;
  font-size: 0.82rem;
  color: var(--home-card-desc);
  line-height: 1.5;
}

.mode-btn {
  width: 100%;
  padding: 10px 0;
  font-size: 0.95rem;
  font-weight: 600;
  border: 1px solid var(--home-card-btn-border);
  border-radius: 8px;
  background: var(--home-card-btn-bg);
  color: var(--home-card-title);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.mode-btn:hover:not(:disabled) {
  background: rgba(230, 126, 34, 0.2);
  border-color: rgba(230, 126, 34, 0.5);
}

.mode-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── 底部导航 ── */
.nav-links {
  display: flex;
  gap: 12px;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  font-size: 0.9rem;
  color: var(--home-nav);
  background: var(--home-nav-bg);
  border: 1px solid var(--home-nav-border);
  border-radius: 24px;
  text-decoration: none;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}

.nav-btn:hover {
  color: var(--home-nav-hover);
  border-color: var(--home-nav-border-hover);
  background: var(--home-nav-bg-hover);
}
</style>
