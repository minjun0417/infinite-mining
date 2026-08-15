// js/features/quest.js
import { BALANCES } from '../../config.js';
import { state } from '../core/state.js'; // state.js에서 saveGame도 관리하면 좋지만, 현재는 firebase.js에 있으니 아래 줄로 수정!
import { FX } from '../ui/effects.js';
import { updateUI } from '../ui/uiManager.js';
import { saveGame } from '../api/firebase.js';

export function checkAndResetDailyQuests() {
    const today = new Date().toLocaleDateString();
    
    // 날짜가 다르거나 아예 퀘스트 데이터가 없으면 초기화
    if (state.lastQuestDate !== today || !state.dailyQuests) {
        state.lastQuestDate = today;
        state.dailyQuests = {};
    }
    
    // config.js에 있는 퀘스트가 세이브 데이터에 없다면 안전하게 추가해줌 (에러 방지 핵심!)
    BALANCES.DAILY_QUESTS.forEach(q => {
        if (!state.dailyQuests[q.id]) {
            state.dailyQuests[q.id] = { current: 0, isCleared: false, isRewarded: false };
        }
    });
    
    saveGame();
}

export function addQuestProgress(questId, amount) {
    
    checkAndResetDailyQuests();
    
    const qState = state.dailyQuests[questId];
    if (!qState || qState.isCleared) return;

    qState.current += amount;
    const qData = BALANCES.DAILY_QUESTS.find(q => q.id === questId);
    
    if (qState.current >= qData.target) {
        qState.current = qData.target;
        qState.isCleared = true;
        FX.createFloatingText(window.innerWidth / 2, window.innerHeight / 4, `📜 퀘스트 완료!`, 'lucky');
    }
    
    saveGame();

    // 👇 추가된 핵심 코드: 퀘스트 창이 열려있다면 화면의 숫자도 실시간으로 다시 그려줌!
    const questModal = document.getElementById('quest-modal');
    if (questModal && !questModal.classList.contains('hidden')) {
        openQuestModal(); 
    }
}

export function openQuestModal() {
    checkAndResetDailyQuests();
    const listEl = document.getElementById('quest-list');
    listEl.innerHTML = '';

    BALANCES.DAILY_QUESTS.forEach(q => {
        const qState = state.dailyQuests[q.id];
        const canReward = qState.isCleared && !qState.isRewarded;
        
        listEl.innerHTML += `
            <div class="stage-card" style="border-color: ${qState.isRewarded ? 'rgba(255,255,255,0.1)' : 'var(--primary)'}; opacity: ${qState.isRewarded ? '0.5' : '1'};">
                <div class="stage-name-info">
                    <h4 style="margin-bottom: 5px;">${q.name}</h4>
                    <p>${q.desc}</p>
                    <p style="color: var(--primary); font-weight: bold; margin-top: 5px;">보상: ${q.rewardText}</p>
                    <p style="color: var(--text-muted); font-size: 0.75rem; margin-top: 5px;">진행도: ${qState.current.toLocaleString()} / ${q.target.toLocaleString()}</p>
                </div>
                <button class="industrial-btn" style="width: auto; padding: 8px 15px; font-size: 0.8rem; ${canReward ? 'background: var(--success); box-shadow: 0 4px 0 #1e8449;' : ''}" 
                        onclick="window.claimQuestReward('${q.id}')" 
                        ${!canReward ? 'disabled' : ''}>
                    ${qState.isRewarded ? '완료됨' : (qState.isCleared ? '보상 받기' : '진행 중')}
                </button>
            </div>
        `;
    });
    
    document.getElementById('quest-modal').classList.remove('hidden');
}

export function claimQuestReward(questId) {
    const qState = state.dailyQuests[questId];
    if (!qState || !qState.isCleared || qState.isRewarded) return;

    const qData = BALANCES.DAILY_QUESTS.find(q => q.id === questId);
    
    if (qData.reward.type === 'diamond') state.resources.diamond += qData.reward.amount;
    else if (qData.reward.type === 'fragment') state.pickaxeFragments += qData.reward.amount;
    else if (qData.reward.type === 'item') state.inventory.items[qData.reward.id] = (state.inventory.items[qData.reward.id] || 0) + qData.reward.amount;

    qState.isRewarded = true;
    FX.createFloatingText(window.innerWidth / 2, window.innerHeight / 2, `보상 획득!`, 'lucky');
    
    saveGame();
    updateUI();
    openQuestModal(); 
}