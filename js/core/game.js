// js/core/game.js
import { BALANCES } from '../../config.js';
import { state } from './state.js';
import { saveGame } from '../api/firebase.js';
import { FX, confetti } from '../ui/effects.js';
import { updateUI, getPickaxeDamage, getCritChance } from '../ui/uiManager.js';
import { addQuestProgress } from '../features/quest.js';

export function getAutoDamageDPS() { 
    if (!state.autoMinerUnlocked || state.autoMinerDmgLevel === 0) return 0; 
    return BALANCES.getAutoMinerDamage(state.autoMinerDmgLevel) / (BALANCES.getAutoMinerInterval(state.autoMinerSpeedLevel) / 1000); 
}

export function gainExp(amount) {
    state.playerExp += amount;
    let leveledUp = false;
    let totalRewards = { stone: 0, iron: 0, gold: 0, diamond: 0, fragment: 0, boxes: {}, items: {} };

    while (state.playerExp >= BALANCES.getRequiredExp(state.playerLevel)) {
        state.playerExp -= BALANCES.getRequiredExp(state.playerLevel);
        state.playerLevel++;
        leveledUp = true;
        
        if (state.playerLevel >= 20) { totalRewards.diamond += state.playerLevel * 5; }
        else if (state.playerLevel >= 10) { totalRewards.gold += state.playerLevel * 30; }
        else if (state.playerLevel >= 5) { totalRewards.iron += state.playerLevel * 100; }
        else { totalRewards.stone += state.playerLevel * 500; }

        totalRewards.fragment += state.playerLevel * 5;

        if (state.playerLevel % 5 === 0) totalRewards.boxes['D'] = (totalRewards.boxes['D'] || 0) + 1;
        if (state.playerLevel % 10 === 0) {
            totalRewards.boxes['C'] = (totalRewards.boxes['C'] || 0) + 1;
            totalRewards.items['exp_small'] = (totalRewards.items['exp_small'] || 0) + 1;
        }
    }

    if (leveledUp) {
        state.resources.stone += totalRewards.stone;
        state.resources.iron += totalRewards.iron;
        state.resources.gold += totalRewards.gold;
        state.resources.diamond += totalRewards.diamond;
        state.pickaxeFragments += totalRewards.fragment;
        
        for(let b in totalRewards.boxes) state.inventory.boxes[b] += totalRewards.boxes[b];
        for(let i in totalRewards.items) state.inventory.items[i] += totalRewards.items[i];
        
        showLevelUpModal(state.playerLevel, totalRewards);
        saveGame();
    }
}

export function showLevelUpModal(level, rewards) {
    document.getElementById('lvl-result').textContent = level;
    let listHTML = '';
    
    if (rewards.stone > 0) listHTML += `<div class="reward-item"><span style="color:#95a5a6">🪨 돌</span> <span>+${rewards.stone.toLocaleString()}</span></div>`;
    if (rewards.iron > 0) listHTML += `<div class="reward-item"><span style="color:#bdc3c7">⛓️ 철</span> <span>+${rewards.iron.toLocaleString()}</span></div>`;
    if (rewards.gold > 0) listHTML += `<div class="reward-item"><span style="color:#f1c40f">🥇 금</span> <span>+${rewards.gold.toLocaleString()}</span></div>`;
    if (rewards.diamond > 0) listHTML += `<div class="reward-item"><span style="color:var(--diamond)">💎 다이아몬드</span> <span>+${rewards.diamond.toLocaleString()}</span></div>`;
    if (rewards.fragment > 0) listHTML += `<div class="reward-item"><span style="color:var(--gold)">🔩 강화 조각</span> <span>+${rewards.fragment.toLocaleString()}</span></div>`;
    
    for(let b in rewards.boxes) listHTML += `<div class="reward-item"><span>${BALANCES.BOXES[b].icon} ${BALANCES.BOXES[b].name}</span> <span>+${rewards.boxes[b]}</span></div>`;
    for(let i in rewards.items) listHTML += `<div class="reward-item"><span>${BALANCES.ITEMS[i].icon} ${BALANCES.ITEMS[i].name}</span> <span>+${rewards.items[i]}</span></div>`;
    
    document.getElementById('lvl-reward-list').innerHTML = listHTML;
    document.getElementById('levelup-modal').classList.remove('hidden');
    confetti();
}

export function processAutoExchange() {
    if (state.resources.stone >= 1000) { state.resources.stone -= 1000; state.resources.iron++; }
    if (state.resources.iron >= 100) { state.resources.iron -= 100; state.resources.gold++; }
    if (state.resources.gold >= 50) { state.resources.gold -= 50; state.resources.diamond++; }
}

export function handleMining(isAuto = false, x = null, y = null) {
    let damage = isAuto ? BALANCES.getAutoMinerDamage(state.autoMinerDmgLevel) : getPickaxeDamage();
    let isCrit = false; let isLucky = false;
    
    if (!isAuto) {
        if (Math.random() < BALANCES.LUCKY_STRIKE_CHANCE) { damage *= BALANCES.LUCKY_STRIKE_MULT; isLucky = true; }
        else if (Math.random() < getCritChance()) { damage *= BALANCES.CRIT_MULTIPLIER; isCrit = true; }
        addQuestProgress('touch', 1);
    }
    
    let actualDamage = Math.min(damage, state.currentHp);
    state.currentHp -= actualDamage;
    gainExp(actualDamage);
    
    if (x && y) {
        FX.createFloatingText(x, y, isLucky ? `🍀 LUCKY! -${Math.floor(actualDamage)}` : `-${Math.floor(actualDamage)}`, isLucky ? 'lucky' : (isCrit ? 'critical' : 'standard'));
        if (!isAuto) { 
            const oreColor = BALANCES.MINES[state.currentMineIndex].ore;
            FX.createSparks(x, y, oreColor); 
            FX.shakeScreen(isLucky ? 20 : (isCrit ? 10 : 5)); 
            const p = document.getElementById('pickaxe-container'); 
            p.style.transform = 'translate(-50%, -50%) rotate(-45deg)'; 
            setTimeout(() => p.style.transform = 'translate(-50%, -50%) rotate(20deg)', 50); 
        }
    } else if (isAuto) {
        const rect = document.getElementById('rock-container').getBoundingClientRect();
        FX.createFloatingText(rect.left + rect.width / 2 + (Math.random() - 0.5) * 50, rect.top + rect.height / 2 + (Math.random() - 0.5) * 50, `-${Math.floor(actualDamage)}`, 'auto');
    }
    FX.flashRock();

    if (state.currentHp <= 0) {
        const mine = BALANCES.MINES[state.currentMineIndex];
        state.resources[mine.reward] += mine.amount;

        addQuestProgress(`quest_${mine.reward}`, mine.amount);

        if (mine.reward === 'stone') {
            state.totalStonesMined += mine.amount;
            if (!state.autoMinerUnlocked && state.totalStonesMined >= 20) { 
                state.autoMinerUnlocked = true; state.autoMinerSpeedLevel = 1; state.autoMinerDmgLevel = 1; 
                FX.createFloatingText(window.innerWidth/2, window.innerHeight/2, "자동 채굴기 가동!", 'lucky'); 
            }
        }
        if (Math.random() < mine.fragChance) state.pickaxeFragments++;
        state.currentHp = mine.maxHp;
        if (state.autoExchange) processAutoExchange();

        const icons = { stone: '🪨', iron: '⛓️', gold: '🥇', diamond: '💎' };
        const rect = document.getElementById('rock-container').getBoundingClientRect();
        // 바위 바로 위에서 +1 🪨 형태로 텍스트가 뜨고 천천히 사라집니다.
        FX.createFloatingText(rect.left + rect.width / 2, rect.top + 30, `+${mine.amount} ${icons[mine.reward]}`, 'resource');
    }
    updateUI();
}

// js/core/game.js 내부의 handleOfflineArrival 덮어쓰기
export function handleOfflineArrival() {
    const now = Date.now(); 
    const elapsed = Math.floor((now - state.lastSavedAt) / 1000); 
    
    if (elapsed < 60) { state.lastSavedAt = now; return; }
    
    // 유저가 충전해둔 시간과 실제 지난 시간 중 작은 것을 선택!
    const actualSeconds = Math.min(elapsed, state.offlineTimeRemaining || 0); 
    
    const dps = getAutoDamageDPS(); 
    if (actualSeconds <= 0 || dps <= 0) {
        state.lastSavedAt = now;
        saveGame();
        return; 
    }

    const mine = BALANCES.MINES[state.currentMineIndex]; 
    const efficiency = BALANCES.PICKAXES[state.pickaxeTier - 1].efficiency;
    const intervalSec = BALANCES.getAutoMinerInterval(state.autoMinerSpeedLevel) / 1000;
    const offlineHits = Math.floor(actualSeconds / intervalSec);
    const totalDamage = actualSeconds * dps * efficiency; 
    const breaks = Math.floor(totalDamage / mine.maxHp);
    
    if (breaks > 0 || offlineHits > 0) {
        const rewardAmount = breaks * mine.amount; 
        const frags = Math.floor(breaks * mine.fragChance);
        
        state.resources[mine.reward] += rewardAmount; 
        state.pickaxeFragments += frags;
        if (rewardAmount > 0) addQuestProgress(`quest_${mine.reward}`, rewardAmount); // 퀘스트 반영
        
        gainExp(Math.min(totalDamage, breaks * mine.maxHp + (offlineHits * (mine.maxHp * 0.1)))); 
        if (state.autoExchange) processAutoExchange();
        
        // 사용한 시간 차감
        state.offlineTimeRemaining -= actualSeconds;
        
        document.getElementById('reward-time').textContent = new Date(actualSeconds * 1000).toISOString().substr(11, 8);
        document.getElementById('reward-items').innerHTML = `<div class="res-item"><span>📦</span><b>${mine.name} ${breaks}회</b></div><div class="res-item" style="color:var(--success);"><span>✨</span><b>오프라인 EXP</b></div><div class="res-item"><span>💎</span><b>${rewardAmount.toLocaleString()}획득</b></div><div class="res-item fragment"><span>🔩</span><b>${frags}개 획득</b></div>`;
        document.getElementById('reward-modal').classList.remove('hidden');
    }
    
    state.lastSavedAt = now; 
    saveGame(); 
    updateUI();
}