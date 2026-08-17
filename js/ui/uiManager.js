// js/ui/uiManager.js
import { BALANCES } from '../../config.js';
import { state } from '../core/state.js';
import { SVG_GEN, FX } from './effects.js';
import { saveGame } from '../api/firebase.js';
import { activeViewingUid } from '../features/chat.js';
import { currentUser } from '../api/firebase.js';

export function getPickaxeDamage() { 
    return Math.max(1, Math.floor(BALANCES.PICKAXES[state.pickaxeTier - 1].baseDamage * Math.pow(1.2, state.pickaxeLevel - state.pickaxeTier))); 
}
export function getCritChance() { 
    return BALANCES.PICKAXES[state.pickaxeTier - 1].crit; 
}

export function updateUI() {
    const mine = BALANCES.MINES[state.currentMineIndex];
    document.getElementById('display-name').textContent = state.playerName; 
    document.getElementById('player-level').textContent = `Lv.${state.playerLevel}`;
    
    // 💡 내 프로필을 보고 있을 때만 프로필 창 동기화
    if (!activeViewingUid || (currentUser && activeViewingUid === currentUser.uid)) {
        const profLevel = document.getElementById('prof-level');
        if (profLevel) profLevel.textContent = state.playerLevel;
        
        const reqExp = BALANCES.getRequiredExp(state.playerLevel);
        const profExp = document.getElementById('prof-current-exp');
        const profMaxExp = document.getElementById('prof-max-exp');
        const profExpFill = document.getElementById('prof-exp-fill');
        if (profExp) profExp.textContent = Math.floor(state.playerExp).toLocaleString();
        if (profMaxExp) profMaxExp.textContent = reqExp.toLocaleString();
        if (profExpFill) {
            let percent = ((state.playerExp / reqExp) * 100).toFixed(1);
            if (percent > 100) percent = 100;
            profExpFill.style.width = `${percent}%`;
        }
    }
    
    const reqExp = BALANCES.getRequiredExp(state.playerLevel);
    document.getElementById('current-exp').textContent = Math.floor(state.playerExp).toLocaleString(); 
    document.getElementById('max-exp').textContent = reqExp.toLocaleString(); 
    let currentPercent = ((state.playerExp / reqExp) * 100).toFixed(1);
    if (currentPercent > 100) currentPercent = 100;
    
    document.getElementById('exp-percent').textContent = `(${currentPercent}%)`;
    document.getElementById('exp-bar-fill').style.width = `${currentPercent}%`;
    
    document.getElementById('stone-count').textContent = state.resources.stone.toLocaleString(); 
    document.getElementById('iron-count').textContent = state.resources.iron.toLocaleString(); 
    document.getElementById('gold-count').textContent = state.resources.gold.toLocaleString(); 
    document.getElementById('diamond-count').textContent = state.resources.diamond.toLocaleString(); 
    document.getElementById('fragment-count').textContent = state.pickaxeFragments.toLocaleString(); 
    document.getElementById('cash-count').textContent = state.resources.cash.toLocaleString() + '원';
    
    document.getElementById('stage-level').textContent = `STAGE ${state.currentMineIndex + 1}`; 
    document.getElementById('mine-depth').textContent = `지하 ${mine.depth}m · ${mine.name}`; 
    document.getElementById('hp-bar-fill').style.width = `${(state.currentHp / mine.maxHp) * 100}%`; 
    document.getElementById('current-hp').textContent = Math.max(0, Math.floor(state.currentHp)).toLocaleString(); 
    document.getElementById('max-hp').textContent = mine.maxHp.toLocaleString();
    
    document.getElementById('click-dmg').textContent = getPickaxeDamage().toLocaleString();
    if (state.autoMinerUnlocked) {
        document.getElementById('auto-dmg').innerHTML = `${BALANCES.getAutoMinerDamage(state.autoMinerDmgLevel)} <small style="font-size:0.6rem; color:var(--text-muted);">/ ${(BALANCES.getAutoMinerInterval(state.autoMinerSpeedLevel)/1000).toFixed(1)}초</small>`;
    } else {
        document.getElementById('auto-dmg').textContent = '비활성';
    }
    
    document.getElementById('rock-svg-wrapper').innerHTML = SVG_GEN.getRockSVG(state.currentMineIndex, state.currentHp / mine.maxHp);
    
    const pickWrapper = document.getElementById('pickaxe-svg-wrapper');
    if (pickWrapper) pickWrapper.innerHTML = '';

    const pick = BALANCES.PICKAXES[state.pickaxeTier - 1];
    const pickImg = pick.image || `images/pickaxe_${state.pickaxeTier}.png`;

    if (!document.getElementById('forge-modal').classList.contains('hidden')) {
        document.getElementById('forge-pickaxe-svg').innerHTML = `<img src="${pickImg}" alt="${pick.name}" style="width:120px; height:120px; object-fit:contain; filter: drop-shadow(0 0 15px var(--primary));" onerror="this.src='images/ms.png'">`;
        document.getElementById('forge-pickaxe-tier').textContent = `TIER ${state.pickaxeTier}`; 
        document.getElementById('forge-pickaxe-name').textContent = pick.name; 
        document.getElementById('forge-pickaxe-level').textContent = state.pickaxeLevel;
        
        let tierGuideEl = document.getElementById('forge-tier-guide');
        const isMaxTier = (state.pickaxeTier >= BALANCES.PICKAXES.length);
        const targetLevel = state.pickaxeTier * 10 + 1;
        const remainingToTierUp = (state.pickaxeTier * 10) - state.pickaxeLevel + 1;
        const willTierUp = (state.pickaxeLevel === state.pickaxeTier * 10);

        if (tierGuideEl) {
            if (isMaxTier) {
                tierGuideEl.innerHTML = `<span style="color:#f1c40f;">👑 최고 티어 달성</span>`;
            } else if (willTierUp) {
                const nextPickName = BALANCES.PICKAXES[state.pickaxeTier].name;
                tierGuideEl.innerHTML = `<span style="color:var(--success); animation: blink 1s infinite;">🔥 다음 강화 성공 시 [${nextPickName}] 승급!</span>`;
            } else {
                const nextPickName = BALANCES.PICKAXES[state.pickaxeTier].name;
                tierGuideEl.innerHTML = `<span>다음 승급: Lv.${targetLevel} [${nextPickName}] <b style="color:#fff;">(${remainingToTierUp}강 남음)</b></span>`;
            }
        }
        
        const successRateEl = document.getElementById('forge-success-rate');
        if (successRateEl) {
            const chancePct = Math.round(BALANCES.getUpgradeSuccessChance(state.pickaxeLevel) * 100);
            successRateEl.textContent = `${chancePct}%`;
            successRateEl.style.color = chancePct === 100 ? 'var(--success)' : (chancePct >= 50 ? 'var(--gold)' : 'var(--danger)');
        }

        document.getElementById('forge-damage').textContent = getPickaxeDamage().toLocaleString();
        document.getElementById('forge-crit').textContent = `${Math.round(getCritChance() * 100)}%`;
        
        const nextLevel = state.pickaxeLevel + 1;
        const nextTier = willTierUp ? Math.min(state.pickaxeTier + 1, BALANCES.PICKAXES.length) : state.pickaxeTier;
        const nextPick = BALANCES.PICKAXES[nextTier - 1];
        const nextDamage = Math.max(1, Math.floor(nextPick.baseDamage * Math.pow(1.2, nextLevel - nextTier)));
        
        document.getElementById('forge-damage-next').textContent = willTierUp ? `➔ ${nextDamage.toLocaleString()} (🔥 TIER UP!)` : `➔ ${nextDamage.toLocaleString()}`;
        if (willTierUp) document.getElementById('forge-crit-next').textContent = `➔ ${Math.round(nextPick.crit * 100)}%`;
        else document.getElementById('forge-crit-next').textContent = '';

        const cost = Math.ceil(pick.fragmentCost * Math.pow(1.15, state.pickaxeLevel - state.pickaxeTier));
        document.getElementById('forge-fragment-current').textContent = state.pickaxeFragments.toLocaleString(); 
        document.getElementById('forge-fragment-needed').textContent = cost.toLocaleString(); 
        document.getElementById('forge-fragment-bar').style.width = `${Math.min(100, (state.pickaxeFragments / cost) * 100)}%`;
        
        const uBtn = document.getElementById('forge-upgrade-btn'); 
        uBtn.disabled = state.pickaxeFragments < cost; 
        uBtn.textContent = state.pickaxeFragments < cost ? `조각 부족` : (willTierUp ? `🔥 티어 승급 강화` : `곡괭이 강화`);

        if (state.autoMinerUnlocked) {
            document.getElementById('autominer-locked').classList.add('hidden'); 
            document.getElementById('autominer-unlocked').classList.remove('hidden');
            
            document.getElementById('am-speed-level-text').textContent = `Lv.${state.autoMinerSpeedLevel}`;
            let currentSpeed = (BALANCES.getAutoMinerInterval(state.autoMinerSpeedLevel) / 1000).toFixed(1);
            let nextSpeed = (BALANCES.getAutoMinerInterval(state.autoMinerSpeedLevel + 1) / 1000).toFixed(1);
            
            document.getElementById('am-speed').textContent = currentSpeed + '초';
            if (currentSpeed === nextSpeed) {
                document.getElementById('am-speed-next').textContent = `(최대 속도)`;
            } else {
                document.getElementById('am-speed-next').textContent = `➔ ${nextSpeed}초`;
            }

            const speedCost = BALANCES.getAutoMinerSpeedCost(state.autoMinerSpeedLevel); 
            let speedCostStr = []; let canAffordSpeed = true;
            if (speedCost.stone) { speedCostStr.push(`🪨${speedCost.stone}`); if (state.resources.stone < speedCost.stone) canAffordSpeed = false; }
            if (speedCost.iron) { speedCostStr.push(`⛓️${speedCost.iron}`); if (state.resources.iron < speedCost.iron) canAffordSpeed = false; }
            if (speedCost.gold) { speedCostStr.push(`🥇${speedCost.gold}`); if (state.resources.gold < speedCost.gold) canAffordSpeed = false; }
            document.getElementById('am-speed-cost-text').textContent = speedCostStr.join(' '); 
            document.getElementById('am-speed-upgrade-btn').disabled = !canAffordSpeed;

            document.getElementById('am-dmg-level-text').textContent = `Lv.${state.autoMinerDmgLevel}`;
            document.getElementById('am-dmg').textContent = BALANCES.getAutoMinerDamage(state.autoMinerDmgLevel).toLocaleString();
            
            let nextDmg = BALANCES.getAutoMinerDamage(state.autoMinerDmgLevel + 1);
            document.getElementById('am-dmg-next').textContent = `➔ ${nextDmg.toLocaleString()}`;

            const dmgCost = BALANCES.getAutoMinerDmgCost(state.autoMinerDmgLevel); 
            let dmgCostStr = []; let canAffordDmg = true;
            if (dmgCost.stone) { dmgCostStr.push(`🪨${dmgCost.stone}`); if (state.resources.stone < dmgCost.stone) canAffordDmg = false; }
            if (dmgCost.iron) { dmgCostStr.push(`⛓️${dmgCost.iron}`); if (state.resources.iron < dmgCost.iron) canAffordDmg = false; }
            if (dmgCost.gold) { dmgCostStr.push(`🥇${dmgCost.gold}`); if (state.resources.gold < dmgCost.gold) canAffordDmg = false; }
            document.getElementById('am-dmg-cost-text').textContent = dmgCostStr.join(' '); 
            document.getElementById('am-dmg-upgrade-btn').disabled = !canAffordDmg;

        } else { 
            document.getElementById('autominer-locked').classList.remove('hidden'); 
            document.getElementById('autominer-unlocked').classList.add('hidden'); 
            document.getElementById('am-stone-progress').textContent = state.totalStonesMined || 0; 
        }
    }

    const questBtn = document.getElementById('quest-float-btn');
    if (state.unlockedStages.includes(3)) {
        questBtn.classList.remove('hidden');
    } else {
        questBtn.classList.add('hidden');
    }    
}

export function renderInventory() {
    const boxList = document.getElementById('inv-box-list');
    boxList.innerHTML = '';
    ['A', 'B', 'C', 'D'].forEach(grade => {
        const count = state.inventory.boxes[grade] || 0;
        if(count > 0) {
            const b = BALANCES.BOXES[grade];
            boxList.innerHTML += `<div class="inv-card"><div class="inv-icon">${b.icon}</div><div class="inv-title">${b.name}</div><div class="inv-count">보유: ${count}개</div><div class="btn-group"><button class="industrial-btn" onclick="window.openBox('${grade}', 1)">1개 열기</button><button class="industrial-btn" style="background:var(--primary)" onclick="window.openBox('${grade}', ${count})">모두 열기</button></div></div>`;
        }
    });
    if(boxList.innerHTML === '') boxList.innerHTML = '<p class="note" style="grid-column: 1/3; margin-top:20px;">보유 중인 상자가 없습니다.</p>';

    const itemList = document.getElementById('inv-item-list');
    itemList.innerHTML = '';
    for(let itemId in state.inventory.items) {
        const count = state.inventory.items[itemId];
        if(count > 0) {
            const item = BALANCES.ITEMS[itemId];
            itemList.innerHTML += `<div class="inv-card"><div class="inv-icon">${item.icon}</div><div class="inv-title">${item.name}</div><div class="inv-desc">${item.desc}</div><div class="inv-count">보유: ${count}개</div><button class="industrial-btn full-width" style="background:var(--success)" onclick="window.useItem('${itemId}')">사용하기</button></div>`;
        }
    }
    if(itemList.innerHTML === '') itemList.innerHTML = '<p class="note" style="grid-column: 1/3; margin-top:20px;">보유 중인 아이템이 없습니다.</p>';
}

// 💡 [대량/전체 일괄 환전소 UI]
export function updateBoxShopUI() {
    const dBtn = document.getElementById('shop-btn-D');
    if(dBtn) dBtn.disabled = state.resources.diamond < BALANCES.BOXES['D'].cost.diamond;
    
    ['C', 'B', 'A'].forEach(grade => {
        const box = BALANCES.BOXES[grade];
        const btn = document.getElementById(`shop-btn-${grade}`);
        if(btn) btn.disabled = (state.inventory.boxes[box.reqBox] || 0) < box.reqCount;
    });

    const exList = document.getElementById('exchange-list');
    if (exList) {
        exList.innerHTML = '';
        BALANCES.EXCHANGE.forEach((ex, idx) => {
            const rateUp = ex.rateUp || ex.rate;
            const rateDown = ex.rateDown || ex.rate;
            const currentLow = Math.floor(state.resources[ex.low]);
            const currentHigh = Math.floor(state.resources[ex.high]);
            
            const maxUp = Math.floor(currentLow / rateUp);
            const maxDown = Math.floor(currentHigh);

            const canUp1 = currentLow >= rateUp;
            const canUp10 = currentLow >= rateUp * 10;
            const canDown1 = currentHigh >= 1;
            const canDown10 = currentHigh >= 10;
            
            exList.innerHTML += `
                <div class="stage-card" style="display:flex; flex-direction:column; gap:12px; border-color: rgba(255,255,255,0.1); padding: 15px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; width:100%; font-size:0.95rem; font-weight:bold;">
                        <span>${ex.iconL} ${ex.nameL} <b style="color:var(--primary);">(${currentLow.toLocaleString()})</b></span>
                        <span style="color:var(--text-muted);">↔</span>
                        <span>${ex.iconH} ${ex.nameH} <b style="color:var(--primary);">(${currentHigh.toLocaleString()})</b></span>
                    </div>

                    <!-- ⬆️ 상향 교환 -->
                    <div style="background: rgba(0,0,0,0.25); padding: 10px; border-radius: 10px;">
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:6px; display:flex; justify-content:space-between;">
                            <span>⬆️ 상향 교환 (${ex.iconL}${rateUp.toLocaleString()} ➔ ${ex.iconH}1)</span>
                            <span>최대: <b style="color:var(--success);">${maxUp.toLocaleString()}개 가능</b></span>
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button class="industrial-btn" style="flex:1; padding:6px; font-size:0.75rem; ${canUp1 ? 'background:var(--success);' : ''}" onclick="window.doExchange(${idx}, 'up', 1)" ${!canUp1 ? 'disabled' : ''}>1개</button>
                            <button class="industrial-btn" style="flex:1; padding:6px; font-size:0.75rem; ${canUp10 ? 'background:var(--success);' : ''}" onclick="window.doExchange(${idx}, 'up', 10)" ${!canUp10 ? 'disabled' : ''}>10개</button>
                            <button class="industrial-btn" style="flex:1.5; padding:6px; font-size:0.75rem; ${maxUp > 0 ? 'background:linear-gradient(180deg, #2ecc71, #27ae60); font-weight:900;' : ''}" onclick="window.doExchange(${idx}, 'up', 'max')" ${maxUp <= 0 ? 'disabled' : ''}>전체 (${maxUp.toLocaleString()}개)</button>
                        </div>
                    </div>

                    <!-- ⬇️ 하향 교환 -->
                    <div style="background: rgba(0,0,0,0.25); padding: 10px; border-radius: 10px;">
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:6px; display:flex; justify-content:space-between;">
                            <span>⬇️ 하향 교환 (${ex.iconH}1 ➔ ${ex.iconL}${rateDown.toLocaleString()} <small style="color:var(--danger);">(수수료 20%)</small>)</span>
                            <span>최대: <b style="color:var(--primary);">${maxDown.toLocaleString()}개 가능</b></span>
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button class="industrial-btn" style="flex:1; padding:6px; font-size:0.75rem; ${canDown1 ? 'background:var(--primary);' : ''}" onclick="window.doExchange(${idx}, 'down', 1)" ${!canDown1 ? 'disabled' : ''}>1개</button>
                            <button class="industrial-btn" style="flex:1; padding:6px; font-size:0.75rem; ${canDown10 ? 'background:var(--primary);' : ''}" onclick="window.doExchange(${idx}, 'down', 10)" ${!canDown10 ? 'disabled' : ''}>10개</button>
                            <button class="industrial-btn" style="flex:1.5; padding:6px; font-size:0.75rem; ${maxDown > 0 ? 'background:linear-gradient(180deg, #e67e22, #d35400); font-weight:900;' : ''}" onclick="window.doExchange(${idx}, 'down', 'max')" ${maxDown <= 0 ? 'disabled' : ''}>전체 (${maxDown.toLocaleString()}개)</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }
}

export function renderStageList() {
    const list = document.getElementById('stage-list');
    list.innerHTML = '';
    BALANCES.MINES.forEach((m, i) => {
        const unlocked = state.unlockedStages.includes(i);
        const active = state.currentMineIndex === i;
        
        const card = document.createElement('div');
        card.className = `stage-card ${unlocked ? '' : 'locked'} ${active ? 'active' : ''}`;
        
        let rightContent = document.createElement('div');
        rightContent.style.textAlign = 'right';
        
        if (unlocked) {
            const btn = document.createElement('button');
            btn.className = 'industrial-btn';
            btn.style.cssText = 'width: auto; padding: 10px 20px; font-size: 0.9rem;';
            btn.textContent = active ? '채굴 중' : '이동';
            btn.disabled = active;
            if (!active) {
                btn.onclick = () => {
                    state.currentMineIndex = i;
                    state.currentHp = m.maxHp;
                    document.getElementById('map-modal').classList.add('hidden');
                    updateUI();
                    saveGame();
                };
            }
            rightContent.appendChild(btn);
        } else {
            let canUnlock = true;
            let reqText = [];
            
            if (state.playerLevel < m.reqLevel) {
                canUnlock = false;
                reqText.push(`<span style="color:var(--danger)">Lv.${state.playerLevel} / ${m.reqLevel}</span>`);
            } else {
                reqText.push(`<span style="color:var(--success)">Lv.${state.playerLevel} / ${m.reqLevel} (V)</span>`);
            }
            
            if (m.unlockCost) {
                for (let res in m.unlockCost) {
                    const costAmt = m.unlockCost[res];
                    const currentAmt = Math.floor(state.resources[res] || 0);
                    const icon = res === 'stone' ? '🪨' : res === 'iron' ? '⛓️' : res === 'gold' ? '🥇' : '💎';
                    
                    if (currentAmt < costAmt) {
                        canUnlock = false;
                        reqText.push(`<span style="color:var(--danger)">${icon} ${currentAmt.toLocaleString()} / ${costAmt.toLocaleString()}</span>`);
                    } else {
                        reqText.push(`<span style="color:var(--text-main)">${icon} ${currentAmt.toLocaleString()} / ${costAmt.toLocaleString()}</span>`);
                    }
                }
            }
            
            rightContent.innerHTML = `<div style="font-size:0.75rem; margin-bottom:6px; font-weight: bold; line-height: 1.4;">${reqText.join('<br>')}</div>`;
            
            const btn = document.createElement('button');
            btn.className = 'industrial-btn';
            
            if (canUnlock) {
                card.style.borderColor = 'var(--success)';
                card.style.background = 'rgba(46, 204, 113, 0.08)';
                btn.style.cssText = 'width: auto; padding: 6px 14px; font-size:0.85rem; font-weight:900; background: linear-gradient(180deg, #2ecc71, #27ae60); box-shadow: 0 4px 0 #1e8449; color: #fff; cursor: pointer;';
                btn.textContent = '✨ 해금 가능';
                btn.disabled = false;
            } else {
                btn.style.cssText = 'width: auto; padding: 6px 14px; font-size:0.8rem; background: #34495e; color: #95a5a6; box-shadow: none; cursor: not-allowed;';
                btn.textContent = '🔒 잠김';
                btn.disabled = true;
            }
            
            btn.onclick = () => {
                if (!canUnlock) return;
                
                if (m.unlockCost) {
                    for (let res in m.unlockCost) state.resources[res] -= m.unlockCost[res];
                }
                
                state.unlockedStages.push(i);

                if (i === 3) {
                    FX.createFloatingText(window.innerWidth/2, window.innerHeight/2, "일일 퀘스트 개방! 📜", 'lucky');
                } else {
                    FX.createFloatingText(window.innerWidth/2, window.innerHeight/2, "광산 해금 완료! 🗺️", 'lucky');
                }
                saveGame();
                renderStageList(); 
                updateUI(); 
            };
            rightContent.appendChild(btn);
        }
        
        const info = document.createElement('div');
        info.className = 'stage-name-info';
        let extraText = i === 3 ? `<br><span style="color:var(--primary); font-size:0.75rem; font-weight:bold;">✨ 해금 시 일일 퀘스트 개방!</span>` : '';
        info.innerHTML = `<h4>${m.name}</h4><p>지하 ${m.depth}m · HP ${m.maxHp.toLocaleString()}</p>${extraText}`;

        card.appendChild(info);
        card.appendChild(rightContent);
        list.appendChild(card);
    });
}

export function renderOfflineUI() {
    let totalSec = state.offlineTimeRemaining || 0;
    const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    document.getElementById('offline-time-display').textContent = `${h}:${m}:${s}`;

    const list = document.getElementById('offline-ticket-list');
    list.innerHTML = '';

    BALANCES.OFFLINE_TICKETS.forEach((ticket, idx) => {
        let canAfford = true;
        let costText = [];
        const cost = ticket.cost;
        
        if(cost.stone) { 
            const has = state.resources.stone >= cost.stone;
            if(!has) canAfford = false;
            costText.push(`<span style="color:${has ? '#95a5a6' : 'var(--danger)'}">🪨${cost.stone.toLocaleString()}</span>`);
        }
        if(cost.iron) { 
            const has = state.resources.iron >= cost.iron;
            if(!has) canAfford = false;
            costText.push(`<span style="color:${has ? '#bdc3c7' : 'var(--danger)'}">⛓️${cost.iron.toLocaleString()}</span>`);
        }
        if(cost.gold) { 
            const has = state.resources.gold >= cost.gold;
            if(!has) canAfford = false;
            costText.push(`<span style="color:${has ? '#f1c40f' : 'var(--danger)'}">🥇${cost.gold.toLocaleString()}</span>`);
        }
        if(cost.diamond) { 
            const has = state.resources.diamond >= cost.diamond;
            if(!has) canAfford = false;
            costText.push(`<span style="color:${has ? 'var(--diamond)' : 'var(--danger)'}">💎${cost.diamond.toLocaleString()}</span>`);
        }

        list.innerHTML += `
            <div class="stage-card" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-color: ${canAfford ? 'var(--primary)' : 'rgba(255,255,255,0.1)'};">
                <div>
                    <h4 style="margin-bottom: 5px; color: #fff;">🎫 ${ticket.name}</h4>
                    <div style="font-size: 0.75rem; display: flex; gap: 8px;">${costText.join(' ')}</div>
                </div>
                <button class="industrial-btn" style="width: auto; padding: 8px 15px; font-size: 0.8rem; ${canAfford ? 'background: var(--success);' : 'background: rgba(255,255,255,0.1);'}" 
                        onclick="window.buyOfflineTicket(${idx})" ${!canAfford ? 'disabled' : ''}>
                    적용
                </button>
            </div>
        `;
    });
}