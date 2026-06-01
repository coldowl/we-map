<template>
  <div class="stats-view">
    <div class="stats-content">
      <router-link to="/" class="back-link">{{ t('game.back') }}</router-link>
      <h2>{{ t('stats.title') }}</h2>

      <div class="stat-cards">
        <div class="stat-card">
          <span class="label">{{ t('stats.totalGames') }}</span>
          <span class="value">{{ stats.totalGames }}</span>
        </div>
        <div class="stat-card">
          <span class="label">{{ t('stats.bestScore') }}</span>
          <span class="value highlight">{{ stats.bestScore }}</span>
        </div>
        <div class="stat-card">
          <span class="label">{{ t('stats.bestRoundScore') }}</span>
          <span class="value highlight">{{ stats.bestRoundScore }}</span>
        </div>
        <div class="stat-card">
          <span class="label">{{ t('stats.avgScore') }}</span>
          <span class="value">{{ stats.avgScore }}</span>
        </div>
        <div class="stat-card">
          <span class="label">{{ t('stats.totalRounds') }}</span>
          <span class="value">{{ stats.totalRounds }}</span>
        </div>
        <div class="stat-card">
          <span class="label">{{ t('stats.avgDistance') }}</span>
          <span class="value">{{ stats.avgDistance }} km</span>
        </div>
      </div>

      <div class="history-header">
        <h3>{{ t('stats.history') }}</h3>
        <button v-if="history.length > 0" class="clear-btn" @click="handleClear">{{ t('stats.clearHistory') }}</button>
      </div>
      <div v-if="history.length === 0" class="empty">{{ t('stats.noHistory') }}</div>
      <table v-else class="history-table">
        <thead>
          <tr>
            <th>#</th>
            <th>{{ t('stats.mode') }}</th>
            <th>{{ t('game.totalScore') }}</th>
            <th>{{ t('game.round') }}</th>
            <th>{{ t('stats.time') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="game in history" :key="game.id">
            <td>{{ game.id }}</td>
            <td>{{ game.game_mode === 'survival' ? t('menu.survival') : t('menu.standard') }}</td>
            <td class="score">{{ game.total_score }}</td>
            <td>{{ game.rounds_played }}</td>
            <td>{{ formatDate(game.played_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getPlayerStats, getGameHistory, clearAllHistory, type PlayerStats, type GameHistoryEntry } from '../services/gameHistory'

const { t } = useI18n()

const stats = ref<PlayerStats>({
  totalGames: 0,
  bestScore: 0,
  avgScore: 0,
  totalRounds: 0,
  avgDistance: 0,
  bestRoundScore: 0,
})

const history = ref<GameHistoryEntry[]>([])

onMounted(async () => {
  try {
    stats.value = await getPlayerStats()
    history.value = await getGameHistory()
  } catch (err) {
    console.error('Failed to load stats:', err)
  }
})

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString()
  } catch {
    return dateStr
  }
}

async function handleClear() {
  if (!confirm(t('stats.clearConfirm'))) return
  try {
    await clearAllHistory()
    stats.value = { totalGames: 0, bestScore: 0, avgScore: 0, totalRounds: 0, avgDistance: 0, bestRoundScore: 0 }
    history.value = []
  } catch (err) {
    console.error('Failed to clear history:', err)
  }
}
</script>

<style scoped>
.stats-view {
  height: 100vh;
  background: var(--bg-page);
}

.stats-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

h2 {
  margin: 0 0 20px;
  color: var(--text-primary);
}

h3 {
  margin: 24px 0 12px;
  color: var(--text-primary);
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.history-header h3 {
  margin: 0;
}

.clear-btn {
  background: none;
  border: 1px solid var(--danger);
  color: var(--danger);
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.clear-btn:hover {
  background: var(--danger);
  color: #fff;
}

.stat-cards {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.stat-card {
  background: var(--bg-elevated);
  padding: 16px 24px;
  border-radius: 8px;
  text-align: center;
  min-width: 120px;
}

.stat-card .label {
  display: block;
  font-size: 0.8rem;
  color: var(--text-tertiary);
  margin-bottom: 4px;
}

.stat-card .value {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--text-primary);
}

.stat-card .highlight {
  color: var(--accent);
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
}

.history-table th,
.history-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-primary);
}

.history-table th {
  background: var(--bg-elevated);
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.history-table .score {
  font-weight: bold;
  color: var(--accent);
}

.empty {
  color: var(--text-tertiary);
  padding: 24px 0;
}

.back-link {
  display: inline-block;
  margin-bottom: 12px;
  color: var(--text-primary);
  background: rgba(128, 128, 128, 0.1);
  padding: 8px 16px;
  border-radius: 4px;
  text-decoration: none;
}

.back-link:hover {
  background: rgba(128, 128, 128, 0.18);
}
</style>
