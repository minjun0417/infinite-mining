// js/features/shop.js
import { BALANCES } from '../../config.js';
import { state } from '../core/state.js';
import { saveGame } from '../api/firebase.js';
import { FX, confetti } from '../ui/effects.js';
import { updateUI, renderInventory, updateBoxShopUI, renderOfflineUI } from '../ui/uiManager.js'; // 👈 이렇게 한 줄로 합쳐져야 합니다!
import { gainExp } from '../core/game.js';
import { addQuestProgress } from './quest.js';

export function openBox(grade, count) {
    addQuestProgress('box', count);
    if(state.inventory.boxes[grade] < count) return;
    
    state.inventory.boxes[grade] -= count;
    saveGame(); 
    renderInventory();
    
    const box = BALANCES.BOXES[grade];
    let totalCash = 0; 
    let highestTier = 'B';
    let tierCounts = { 'SSS': 0, 'S': 0, 'A': 0, 'B': 0 };
    
    for(let i = 0; i < count; i++) { 
        const roll = Math.random() * 100;
        let rangeMin, rangeMax;

        if (roll < 1) { 
            rangeMin = box.maxCash; rangeMax = box.maxCash;
            highestTier = 'SSS';
            tierCounts['SSS']++;
        } else if (roll < 10) { 
            rangeMin = Math.floor(box.minCash + (box.maxCash - box.minCash) * 0.7); rangeMax = box.maxCash - 1;
            if (highestTier !== 'SSS') highestTier = 'S';
            tierCounts['S']++;
        } else if (roll < 40) { 
            rangeMin = Math.floor(box.minCash + (box.maxCash - box.minCash) * 0.3); rangeMax = Math.floor(box.minCash + (box.maxCash - box.minCash) * 0.7) - 1;
            if (highestTier === 'B') highestTier = 'A';
            tierCounts['A']++;
        } else { 
            rangeMin = box.minCash; rangeMax = Math.floor(box.minCash + (box.maxCash - box.minCash) * 0.3) - 1;
            tierCounts['B']++;
        }
        
        if (rangeMax < rangeMin) rangeMax = rangeMin;
        totalCash += Math.floor(Math.random() * (rangeMax - rangeMin + 1)) + rangeMin;
    }
    
    playRouletteAnimation(box, count, totalCash, highestTier, tierCounts);
}

export function playRouletteAnimation(box, count, finalAmount, highestTier, tierCounts) {
    const modal = document.getElementById('roulette-modal');
    const numEl = document.getElementById('roulette-number');
    const numContainer = document.getElementById('roulette-number-container');
    const titleEl = document.getElementById('roulette-title');
    const descEl = document.getElementById('roulette-desc');
    const closeBtn = document.getElementById('roulette-close-btn');
    const probList = document.getElementById('roulette-prob-list');
    const fanfareContainer = document.getElementById('roulette-fanfare');

    let breakdownEl = document.getElementById('roulette-breakdown');
    if (!breakdownEl) {
        breakdownEl = document.createElement('div');
        breakdownEl.id = 'roulette-breakdown';
        breakdownEl.style.cssText = "margin-top: 15px; display: flex; justify-content: center; gap: 12px; font-size: 0.85rem; background: rgba(0,0,0,0.4); padding: 8px 15px; border-radius: 12px; flex-wrap: wrap;";
        numContainer.parentNode.appendChild(breakdownEl);
    }
    breakdownEl.style.display = 'none';

    let tierColor = '#95a5a6'; 
    let glowColor = 'rgba(149, 165, 166, 0.8)';
    let tierName = 'B급';

    if (highestTier === 'SSS') {
        tierColor = '#f1c40f'; glowColor = 'rgba(241, 196, 15, 0.8)'; tierName = 'SSS급';
    } else if (highestTier === 'S') {
        tierColor = '#9b59b6'; glowColor = 'rgba(155, 89, 182, 0.8)'; tierName = 'S급';
    } else if (highestTier === 'A') {
        tierColor = '#3498db'; glowColor = 'rgba(52, 152, 219, 0.8)'; tierName = 'A급';
    }

    const sssAmt = box.maxCash;
    const sMin = Math.floor(box.minCash + (box.maxCash - box.minCash) * 0.7);
    const aMin = Math.floor(box.minCash + (box.maxCash - box.minCash) * 0.3);
    
    probList.innerHTML = `
        <div style="display:flex; justify-content:space-between; color:#f1c40f;"><b>SSS급 (1%)</b> <span>${sssAmt.toLocaleString()}원</span></div>
        <div style="display:flex; justify-content:space-between; color:#9b59b6;"><b>S급 (9%)</b> <span>${sMin.toLocaleString()}원~</span></div>
        <div style="display:flex; justify-content:space-between; color:#3498db;"><b>A급 (30%)</b> <span>${aMin.toLocaleString()}원~</span></div>
        <div style="display:flex; justify-content:space-between; color:#95a5a6;"><b>B급 (60%)</b> <span>${box.minCash.toLocaleString()}원~</span></div>
        ${count > 1 ? `<div style="margin-top:10px; text-align:center; color:var(--text-main); font-size:0.75rem;">※ 현재 ${count}개 연속 개봉 중</div>` : ''}
    `;

    modal.classList.remove('hidden');
    closeBtn.classList.add('hidden');
    fanfareContainer.innerHTML = ''; 
    
    titleEl.textContent = `${box.icon} ${box.name} ${count}개 개봉!`;
    titleEl.style.color = '#fff'; 
    descEl.textContent = "두구두구두구...";
    numEl.style.color = '#fff';
    numContainer.style.textShadow = 'none';
    numContainer.style.transform = 'scale(1)';

    let duration = 2000; 
    let start = Date.now();
    
    let timer = setInterval(() => {
        let timePassed = Date.now() - start;
        
        if (timePassed >= duration) {
            clearInterval(timer);
            
            numEl.textContent = finalAmount.toLocaleString();
            numEl.style.color = tierColor; 
            numContainer.style.textShadow = `0 0 30px ${glowColor}`;
            descEl.innerHTML = `<span style="color:${tierColor}; font-weight:900;">최고 ${tierName} 당첨!</span> 🎉`;
            closeBtn.classList.remove('hidden');

            if (count > 1) {
                let breakdownHTML = '';
                if (tierCounts['SSS'] > 0) breakdownHTML += `<span style="color:#f1c40f; font-weight:900;">SSS ${tierCounts['SSS']}개</span>`;
                if (tierCounts['S'] > 0) breakdownHTML += `<span style="color:#9b59b6; font-weight:900;">S ${tierCounts['S']}개</span>`;
                if (tierCounts['A'] > 0) breakdownHTML += `<span style="color:#3498db; font-weight:900;">A ${tierCounts['A']}개</span>`;
                if (tierCounts['B'] > 0) breakdownHTML += `<span style="color:#95a5a6; font-weight:900;">B ${tierCounts['B']}개</span>`;
                breakdownEl.innerHTML = breakdownHTML;
                breakdownEl.style.display = 'flex';
            }

            numContainer.style.transform = 'scale(1.4)';
            setTimeout(() => numContainer.style.transform = 'scale(1)', 300);

            const colors = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];
            for(let i = 0; i < 30; i++) {
                const p = document.createElement('div');
                p.className = 'particle';
                p.style.left = '50%'; p.style.top = '50%';
                p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                p.style.zIndex = '190';
                p.style.setProperty('--tx', `${(Math.random() - 0.5) * 400}px`);
                p.style.setProperty('--ty', `${(Math.random() - 0.5) * 400}px`);
                fanfareContainer.appendChild(p);
            }

            FX.shakeScreen(15);
            if (highestTier === 'SSS' || highestTier === 'S') confetti();

            state.resources.cash += finalAmount;
            saveGame();
            updateUI();

        } else {
            let fakeAmount = Math.floor(Math.random() * (box.maxCash * count)) + (box.minCash * count);
            numEl.textContent = fakeAmount.toLocaleString();
        }
    }, 50);
}

export function closeRoulette() { 
    document.getElementById('roulette-modal').classList.add('hidden'); 
}

export function useItem(itemId) {
    if(state.inventory.items[itemId] <= 0) return;
    state.inventory.items[itemId]--;
    const item = BALANCES.ITEMS[itemId];
    if(item.type === 'exp') {
        gainExp(item.value);
        FX.createFloatingText(window.innerWidth / 2, window.innerHeight / 2, `+${item.value} EXP 획득! 🧪`, 'lucky');
    }
    saveGame(); 
    updateUI(); 
    renderInventory();
}

export function buyOrCombineBox(grade) {
    const box = BALANCES.BOXES[grade];
    
    if (grade === 'D') {
        if (state.resources.diamond < box.cost.diamond) {
            return FX.createFloatingText(window.innerWidth / 2, window.innerHeight / 2, "다이아가 부족합니다!", 'standard');
        }
        state.resources.diamond -= box.cost.diamond;
    } else {
        if ((state.inventory.boxes[box.reqBox] || 0) < box.reqCount) {
            return FX.createFloatingText(window.innerWidth / 2, window.innerHeight / 2, "하위 상자가 부족합니다!", 'standard');
        }
        state.inventory.boxes[box.reqBox] -= box.reqCount;
    }
    
    state.inventory.boxes[grade] = (state.inventory.boxes[grade] || 0) + 1;
    FX.createFloatingText(window.innerWidth / 2, window.innerHeight / 2, grade === 'D' ? `가방으로 지급됨!` : `조합 성공!`, 'lucky');
    
    saveGame(); 
    updateBoxShopUI(); 
    updateUI(); 
    renderInventory();
}

export function doExchange(idx, direction) {
    const ex = BALANCES.EXCHANGE[idx];
    if (direction === 'up') {
        if (state.resources[ex.low] < ex.rate) return FX.createFloatingText(window.innerWidth/2, window.innerHeight/2, "광물이 부족합니다!", 'standard');
        state.resources[ex.low] -= ex.rate;
        state.resources[ex.high] += 1;
        FX.createFloatingText(window.innerWidth/2, window.innerHeight/2, `${ex.nameH} 획득!`, 'lucky');
    } else {
        if (state.resources[ex.high] < 1) return FX.createFloatingText(window.innerWidth/2, window.innerHeight/2, "광물이 부족합니다!", 'standard');
        state.resources[ex.high] -= 1;
        state.resources[ex.low] += ex.rate;
        FX.createFloatingText(window.innerWidth/2, window.innerHeight/2, `${ex.nameL} 획득!`, 'lucky');
    }
    saveGame(); 
    updateBoxShopUI(); 
    updateUI();
}
export function buyOfflineTicket(idx) {
    const ticket = BALANCES.OFFLINE_TICKETS[idx];
    const cost = ticket.cost;
    
    if(cost.stone && state.resources.stone < cost.stone) return;
    if(cost.iron && state.resources.iron < cost.iron) return;
    if(cost.gold && state.resources.gold < cost.gold) return;
    if(cost.diamond && state.resources.diamond < cost.diamond) return;

    if(cost.stone) state.resources.stone -= cost.stone;
    if(cost.iron) state.resources.iron -= cost.iron;
    if(cost.gold) state.resources.gold -= cost.gold;
    if(cost.diamond) state.resources.diamond -= cost.diamond;

    state.offlineTimeRemaining = (state.offlineTimeRemaining || 0) + ticket.time;
    
    FX.createFloatingText(window.innerWidth/2, window.innerHeight/2, "시간 충전 완료! ⏰", 'lucky');
    saveGame();
    updateUI();
    renderOfflineUI();
}