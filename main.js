/**
 * ⚙️ main.js (Firebase Google Auth & Cloud Save)
 */
let state = defaultState();
let currentUser = null;

// --- Firebase 초기화 ---
const firebaseConfig = {
  apiKey: "AIzaSyDEcSZqaK8qFHST5olgf0KNc-3XzQ_0RZ0",
  authDomain: "infinite-mining-group.firebaseapp.com",
  projectId: "infinite-mining-group",
  storageBucket: "infinite-mining-group.firebasestorage.app",
  messagingSenderId: "765777218090",
  appId: "1:765777218090:web:46676037885d43a998d153"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// --- 클라우드 세이브 및 로드 ---
function saveGame() { 
    if (!currentUser) return; 
    state.lastSavedAt = Date.now(); 
    
    // 1. Firebase 서버에 저장 (유저 고유 UID 기준)
    db.ref('users/' + currentUser.uid).set(state);
    
    // 2. 기기 로컬 백업
    localStorage.setItem(STORAGE_KEY + '_' + currentUser.uid, JSON.stringify(state)); 
}

function parseGameData(saved) {
    if (saved.autoMinerLevel !== undefined && saved.autoMinerDmgLevel === undefined) {
        saved.autoMinerDmgLevel = saved.autoMinerLevel;
        saved.autoMinerSpeedLevel = saved.autoMinerLevel;
        delete saved.autoMinerLevel;
    }
    if(!saved.inventory) saved.inventory = { boxes: { 'D': 0, 'C': 0, 'B': 0, 'A': 0 }, items: { 'exp_small': 1 } };
    state = Object.assign(defaultState(), saved);
}

// --- 로그인 상태 감지 및 자동 로그인 처리 ---
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        try {
            const snapshot = await db.ref('users/' + user.uid).once('value');
            const saved = snapshot.val();
            
            if (saved) {
                parseGameData(saved);
            } else {
                state = defaultState();
                state.playerName = user.displayName || 'Digger';
            }
            
            handleOfflineArrival();
            
            document.getElementById('login-view').classList.add('hidden'); 
            document.getElementById('game-view').classList.remove('hidden'); 
            
            saveGame(); 
            updateUI(); 
        } catch (e) {
            console.error("데이터 로드 오류:", e);
            // 에러 원인을 정확히 파악하기 위해 메시지 강화
            alert(`데이터 불러오기 실패: ${e.message}\n(인터넷 연결이나 데이터베이스 규칙을 확인해주세요.)`);
            // 에러 시 무한 로딩 방지를 위해 강제 로그아웃
            auth.signOut();
        }
    } else {
        currentUser = null;
        state = defaultState(); // 💡 핵심 추가: 로그아웃 시 메모리에 남은 이전 유저 데이터 완벽 초기화
        document.getElementById('login-view').classList.remove('hidden'); 
        document.getElementById('game-view').classList.add('hidden'); 
    }
});

// --- 시작 및 이벤트 핸들러 ---
window.onload = () => {
    // 수동 타격
    document.getElementById('rock-container').onclick = (e) => handleMining(false, e.clientX, e.clientY);
    
    // 구글 간편로그인 버튼 이벤트
    document.getElementById('google-login-btn').onclick = async () => {
        try {
            await auth.signInWithPopup(googleProvider);
        } catch (error) {
            console.error("로그인 실패:", error);
            alert(`로그인에 실패했습니다: ${error.message}`);
        }
    };

    // 로그아웃 버튼 이벤트
    document.getElementById('logout-btn').onclick = async () => {
        if (confirm("로그아웃 하시겠습니까?")) {
            saveGame();
            await auth.signOut();
        }
    };
    
    // 자동 채굴기 인터벌
    let lastAutoMineTime = Date.now();
    setInterval(() => { 
        if (!document.getElementById('game-view').classList.contains('hidden') && state.autoMinerUnlocked && state.autoMinerSpeedLevel > 0) { 
            const now = Date.now(); 
            const interval = BALANCES.getAutoMinerInterval(state.autoMinerSpeedLevel); 
            if (now - lastAutoMineTime >= interval) { 
                lastAutoMineTime = now; 
                handleMining(true); 
                saveGame(); 
            } 
        } 
    }, 100);
};

const SVG_GEN = {
    getPickaxeSVG(tier, size = 120) {
        const p = BALANCES.PICKAXES[tier - 1];
        const glow = tier >= 5 ? `filter="url(#glow-${tier})"` : '';
        return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" style="overflow: visible;"><defs><filter id="glow-${tier}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter><linearGradient id="handleGrad-${tier}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#5d4037;stop-opacity:1" /><stop offset="100%" style="stop-color:#3e2723;stop-opacity:1" /></linearGradient></defs><rect x="45" y="40" width="10" height="55" rx="5" fill="url(#handleGrad-${tier})" transform="rotate(-45 50 50)" /><path d="M20 30 Q50 20 80 30 Q50 40 20 30" fill="${p.color}" stroke="#000" stroke-width="1.5" ${glow} transform="rotate(-45 50 40)" />${tier >= 7 ? `<circle cx="50" cy="35" r="5" fill="#fff" filter="url(#glow-${tier})" />` : ''}</svg>`;
    },
    getRockSVG(mineIndex, hpRatio) {
        const mine = BALANCES.MINES[mineIndex];
        let cracks = '';
        if (hpRatio < 0.75) cracks += '<path d="M40 20 L50 40 L45 60" stroke="rgba(0,0,0,0.5)" stroke-width="2" fill="none" />';
        if (hpRatio < 0.5) cracks += '<path d="M70 30 L60 50 L80 70" stroke="rgba(0,0,0,0.5)" stroke-width="2" fill="none" />';
        if (hpRatio < 0.25) cracks += '<path d="M30 60 L50 70 L40 90" stroke="rgba(0,0,0,0.5)" stroke-width="2" fill="none" />';
        return `<svg viewBox="0 0 100 100" width="100%" height="100%"><defs><radialGradient id="rockGrad-${mineIndex}" cx="40%" cy="40%" r="60%"><stop offset="0%" style="stop-color:${mine.color};stop-opacity:1" /><stop offset="100%" style="stop-color:#000;stop-opacity:1" /></radialGradient></defs><polygon points="20,30 50,10 85,25 95,60 75,90 40,95 10,75 5,40" fill="url(#rockGrad-${mineIndex})" stroke="#000" stroke-width="1" /><circle cx="35" cy="45" r="4" fill="${mine.ore}" opacity="0.6" /><circle cx="65" cy="35" r="6" fill="${mine.ore}" opacity="0.6" /><circle cx="55" cy="70" r="3" fill="${mine.ore}" opacity="0.6" />${cracks}</svg>`;
    }
};

const FX = {
    createSparks(x, y) {
        const container = document.getElementById('particle-layer');
        for (let i = 0; i < 8; i++) {
            const p = document.createElement('div');
            p.className = 'particle'; p.style.left = `${x}px`; p.style.top = `${y}px`; p.style.backgroundColor = BALANCES.MINES[state.currentMineIndex].ore;
            p.style.setProperty('--tx', `${(Math.random() - 0.5) * 200}px`); p.style.setProperty('--ty', `${(Math.random() - 0.5) * 200}px`);
            container.appendChild(p); setTimeout(() => p.remove(), 600);
        }
    },
    createFloatingText(x, y, text, type = 'standard') {
        const el = document.createElement('div');
        el.className = `floating-text ${type}-text`; el.textContent = text; el.style.left = `${x}px`; el.style.top = `${y}px`;
        document.body.appendChild(el); setTimeout(() => el.remove(), 800);
    },
    shakeScreen(power = 5) {
        const scene = document.getElementById('mining-scene');
        scene.style.setProperty('--shake-power', `${power}px`);
        scene.classList.add('shake'); setTimeout(() => scene.classList.remove('shake'), 100);
    },
    flashRock() {
        const rock = document.getElementById('rock-svg-wrapper');
        rock.classList.add('hit-flash'); setTimeout(() => rock.classList.remove('hit-flash'), 150);
    }
};

function getPickaxeDamage() { return Math.max(1, Math.floor(BALANCES.PICKAXES[state.pickaxeTier - 1].baseDamage * Math.pow(1.2, state.pickaxeLevel - state.pickaxeTier))); }
function getAutoDamageDPS() { if (!state.autoMinerUnlocked || state.autoMinerDmgLevel === 0) return 0; return BALANCES.getAutoMinerDamage(state.autoMinerDmgLevel) / (BALANCES.getAutoMinerInterval(state.autoMinerSpeedLevel) / 1000); }
function getCritChance() { return BALANCES.PICKAXES[state.pickaxeTier - 1].crit; }

function gainExp(amount) {
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

function showLevelUpModal(level, rewards) {
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

function handleMining(isAuto = false, x = null, y = null) {
    let damage = isAuto ? BALANCES.getAutoMinerDamage(state.autoMinerDmgLevel) : getPickaxeDamage();
    let isCrit = false; let isLucky = false;
    
    if (!isAuto) {
        if (Math.random() < BALANCES.LUCKY_STRIKE_CHANCE) { damage *= BALANCES.LUCKY_STRIKE_MULT; isLucky = true; }
        else if (Math.random() < getCritChance()) { damage *= BALANCES.CRIT_MULTIPLIER; isCrit = true; }
    }
    
    let actualDamage = Math.min(damage, state.currentHp);
    state.currentHp -= actualDamage;
    gainExp(actualDamage);
    
    if (x && y) {
        FX.createFloatingText(x, y, isLucky ? `🍀 LUCKY! -${Math.floor(actualDamage)}` : `-${Math.floor(actualDamage)}`, isLucky ? 'lucky' : (isCrit ? 'critical' : 'standard'));
        if (!isAuto) { FX.createSparks(x, y); FX.shakeScreen(isLucky ? 20 : (isCrit ? 10 : 5)); const p = document.getElementById('pickaxe-container'); p.style.transform = 'translate(-50%, -50%) rotate(-45deg)'; setTimeout(() => p.style.transform = 'translate(-50%, -50%) rotate(20deg)', 50); }
    } else if (isAuto) {
        const rect = document.getElementById('rock-container').getBoundingClientRect();
        FX.createFloatingText(rect.left + rect.width / 2 + (Math.random() - 0.5) * 50, rect.top + rect.height / 2 + (Math.random() - 0.5) * 50, `-${Math.floor(actualDamage)}`, 'auto');
    }
    FX.flashRock();

    if (state.currentHp <= 0) {
        const mine = BALANCES.MINES[state.currentMineIndex];
        state.resources[mine.reward] += mine.amount;
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
        FX.createFloatingText(window.innerWidth / 2, window.innerHeight / 2, `${mine.name} 돌파!`, 'critical');
    }
    updateUI();
}

function processAutoExchange() {
    if (state.resources.stone >= 1000) { state.resources.stone -= 1000; state.resources.iron++; }
    if (state.resources.iron >= 100) { state.resources.iron -= 100; state.resources.gold++; }
    if (state.resources.gold >= 50) { state.resources.gold -= 50; state.resources.diamond++; }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    event.currentTarget.classList.add('active');
    document.getElementById(`tab-${tabId}`).classList.add('active');
}

function renderInventory() {
    const boxList = document.getElementById('inv-box-list');
    boxList.innerHTML = '';
    ['A', 'B', 'C', 'D'].forEach(grade => {
        const count = state.inventory.boxes[grade] || 0;
        if(count > 0) {
            const b = BALANCES.BOXES[grade];
            boxList.innerHTML += `<div class="inv-card"><div class="inv-icon">${b.icon}</div><div class="inv-title">${b.name}</div><div class="inv-count">보유: ${count}개</div><div class="btn-group"><button class="industrial-btn" onclick="openBox('${grade}', 1)">1개 열기</button><button class="industrial-btn" style="background:var(--primary)" onclick="openBox('${grade}', ${count})">모두 열기</button></div></div>`;
        }
    });
    if(boxList.innerHTML === '') boxList.innerHTML = '<p class="note" style="grid-column: 1/3; margin-top:20px;">보유 중인 상자가 없습니다.</p>';

    const itemList = document.getElementById('inv-item-list');
    itemList.innerHTML = '';
    for(let itemId in state.inventory.items) {
        const count = state.inventory.items[itemId];
        if(count > 0) {
            const item = BALANCES.ITEMS[itemId];
            itemList.innerHTML += `<div class="inv-card"><div class="inv-icon">${item.icon}</div><div class="inv-title">${item.name}</div><div class="inv-desc">${item.desc}</div><div class="inv-count">보유: ${count}개</div><button class="industrial-btn full-width" style="background:var(--success)" onclick="useItem('${itemId}')">사용하기</button></div>`;
        }
    }
    if(itemList.innerHTML === '') itemList.innerHTML = '<p class="note" style="grid-column: 1/3; margin-top:20px;">보유 중인 아이템이 없습니다.</p>';
}

function openBox(grade, count) {
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

function playRouletteAnimation(box, count, finalAmount, highestTier, tierCounts) {
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

function closeRoulette() { document.getElementById('roulette-modal').classList.add('hidden'); }

function useItem(itemId) {
    if(state.inventory.items[itemId] <= 0) return;
    state.inventory.items[itemId]--;
    const item = BALANCES.ITEMS[itemId];
    if(item.type === 'exp') {
        gainExp(item.value);
        FX.createFloatingText(window.innerWidth / 2, window.innerHeight / 2, `+${item.value} EXP 획득! 🧪`, 'lucky');
    }
    saveGame(); updateUI(); renderInventory();
}

function switchShopTab(tabId) {
    document.querySelectorAll('#shop-modal .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('#shop-modal .tab-content').forEach(content => content.classList.remove('active'));
    event.currentTarget.classList.add('active');
    document.getElementById(`shop-tab-${tabId}`).classList.add('active');
}

function buyOrCombineBox(grade) {
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
    
    saveGame(); updateBoxShopUI(); updateUI(); renderInventory();
}

function doExchange(idx, direction) {
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
    saveGame(); updateBoxShopUI(); updateUI();
}

function updateBoxShopUI() {
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
            const currentLow = Math.floor(state.resources[ex.low]);
            const currentHigh = Math.floor(state.resources[ex.high]);
            const canUp = currentLow >= ex.rate;
            const canDown = currentHigh >= 1;
            
            exList.innerHTML += `
                <div class="stage-card" style="display:flex; flex-direction:column; gap:10px; border-color: rgba(255,255,255,0.1);">
                    <div style="display:flex; justify-content:space-between; width:100%; font-size:0.9rem; font-weight:bold;">
                        <span>${ex.iconL} ${ex.nameL} <span style="color:var(--text-muted)">(${currentLow.toLocaleString()})</span></span>
                        <span>↔</span>
                        <span>${ex.iconH} ${ex.nameH} <span style="color:var(--text-muted)">(${currentHigh.toLocaleString()})</span></span>
                    </div>
                    <div style="display:flex; gap:10px; width:100%;">
                        <button class="industrial-btn" style="flex:1; padding:8px; font-size:0.8rem; ${canUp ? 'background:var(--success)' : ''}" onclick="doExchange(${idx}, 'up')" ${!canUp ? 'disabled' : ''}>
                            ${ex.iconL}${ex.rate.toLocaleString()} ➔ ${ex.iconH}1
                        </button>
                        <button class="industrial-btn" style="flex:1; padding:8px; font-size:0.8rem; ${canDown ? 'background:var(--primary)' : ''}" onclick="doExchange(${idx}, 'down')" ${!canDown ? 'disabled' : ''}>
                            ${ex.iconH}1 ➔ ${ex.iconL}${ex.rate.toLocaleString()}
                        </button>
                    </div>
                </div>
            `;
        });
    }
}

function updateUI() {
    const mine = BALANCES.MINES[state.currentMineIndex];
    document.getElementById('display-name').textContent = state.playerName; 
    document.getElementById('player-level').textContent = state.playerLevel;
    
    const reqExp = BALANCES.getRequiredExp(state.playerLevel);
    document.getElementById('current-exp').textContent = Math.floor(state.playerExp).toLocaleString(); 
    document.getElementById('max-exp').textContent = reqExp.toLocaleString(); 
    document.getElementById('exp-bar-fill').style.width = `${(state.playerExp / reqExp) * 100}%`;
    
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
    document.getElementById('pickaxe-svg-wrapper').innerHTML = SVG_GEN.getPickaxeSVG(state.pickaxeTier, 100);

    if (!document.getElementById('forge-modal').classList.contains('hidden')) {
        const pick = BALANCES.PICKAXES[state.pickaxeTier - 1];
        document.getElementById('forge-pickaxe-svg').innerHTML = SVG_GEN.getPickaxeSVG(state.pickaxeTier, 150); 
        document.getElementById('forge-pickaxe-tier').textContent = `TIER ${state.pickaxeTier}`; 
        document.getElementById('forge-pickaxe-name').textContent = pick.name; 
        document.getElementById('forge-pickaxe-level').textContent = state.pickaxeLevel;
        
        document.getElementById('forge-damage').textContent = getPickaxeDamage().toLocaleString();
        document.getElementById('forge-crit').textContent = `${Math.round(getCritChance() * 100)}%`;
        
        const nextLevel = state.pickaxeLevel + 1;
        const willTierUp = (state.pickaxeLevel === state.pickaxeTier * 10);
        const nextTier = willTierUp ? Math.min(state.pickaxeTier + 1, BALANCES.PICKAXES.length) : state.pickaxeTier;
        const nextPick = BALANCES.PICKAXES[nextTier - 1];
        const nextDamage = Math.max(1, Math.floor(nextPick.baseDamage * Math.pow(1.2, nextLevel - nextTier)));
        
        document.getElementById('forge-damage-next').textContent = `➔ ${nextDamage.toLocaleString()}`;
        if (willTierUp) document.getElementById('forge-crit-next').textContent = `➔ ${Math.round(nextPick.crit * 100)}%`;
        else document.getElementById('forge-crit-next').textContent = '';

        const cost = Math.ceil(pick.fragmentCost * Math.pow(1.15, state.pickaxeLevel - state.pickaxeTier));
        document.getElementById('forge-fragment-current').textContent = state.pickaxeFragments.toLocaleString(); 
        document.getElementById('forge-fragment-needed').textContent = cost.toLocaleString(); 
        document.getElementById('forge-fragment-bar').style.width = `${Math.min(100, (state.pickaxeFragments / cost) * 100)}%`;
        const uBtn = document.getElementById('forge-upgrade-btn'); 
        uBtn.disabled = state.pickaxeFragments < cost; 
        uBtn.textContent = state.pickaxeFragments < cost ? `조각 부족` : `강화하기`;

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
}

function renderStageList() {
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
            btn.style.cssText = 'width: auto; padding: 10px 20px;';
            btn.textContent = active ? '채굴 중' : '이동';
            btn.disabled = active;
            if (!active) {
                btn.onclick = () => {
                    state.currentMineIndex = i;
                    state.currentHp = m.maxHp;
                    modals.map.classList.add('hidden');
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
            
            rightContent.innerHTML = `<div style="font-size:0.75rem; margin-bottom:5px; font-weight: bold; line-height: 1.4;">${reqText.join('<br>')}</div>`;
            const btn = document.createElement('button');
            btn.className = 'industrial-btn';
            btn.style.cssText = 'width: auto; padding: 5px 15px; font-size:0.8rem; background: var(--success); box-shadow: 0 4px 0 #1e8449;';
            btn.textContent = '해금하기';
            btn.disabled = !canUnlock;
            btn.onclick = () => {
                if (!canUnlock) return;
                
                if (m.unlockCost) {
                    for (let res in m.unlockCost) state.resources[res] -= m.unlockCost[res];
                }
                
                state.unlockedStages.push(i);
                FX.createFloatingText(window.innerWidth/2, window.innerHeight/2, "광산 해금 완료! 🗺️", 'lucky');
                saveGame();
                renderStageList(); 
                updateUI(); 
            };
            rightContent.appendChild(btn);
        }
        
        const info = document.createElement('div');
        info.className = 'stage-name-info';
        info.innerHTML = `<h4>${m.name}</h4><p>지하 ${m.depth}m · HP ${m.maxHp.toLocaleString()}</p>`;
        
        card.appendChild(info);
        card.appendChild(rightContent);
        list.appendChild(card);
    });
}

const modals = { map: document.getElementById('map-modal'), forge: document.getElementById('forge-modal'), inv: document.getElementById('inv-modal'), shop: document.getElementById('shop-modal'), offline: document.getElementById('offline-mgr-modal'), reward: document.getElementById('reward-modal'), cheat: document.getElementById('cheat-modal') };
function openModal(id) { Object.values(modals).forEach(m => m?.classList.add('hidden')); modals[id].classList.remove('hidden'); if(id==='shop') updateBoxShopUI(); if(id==='inv') renderInventory(); if(id==='map') renderStageList(); updateUI(); }

document.getElementById('nav-map').onclick = () => openModal('map'); document.getElementById('nav-forge').onclick = () => openModal('forge'); 
document.getElementById('nav-inv').onclick = () => openModal('inv'); document.getElementById('nav-shop').onclick = () => openModal('shop'); document.getElementById('nav-offline').onclick = () => openModal('offline'); document.getElementById('nav-cheat').onclick = () => openModal('cheat');
document.querySelectorAll('.close-btn').forEach(btn => btn.onclick = () => btn.closest('.modal').classList.add('hidden'));

document.getElementById('forge-upgrade-btn').onclick = () => {
    const cost = Math.ceil(BALANCES.PICKAXES[state.pickaxeTier - 1].fragmentCost * Math.pow(1.15, state.pickaxeLevel - 1));
    if (state.pickaxeFragments >= cost) { 
        state.pickaxeFragments -= cost; 
        if (Math.random() < BALANCES.getUpgradeSuccessChance(state.pickaxeLevel)) { 
            state.pickaxeLevel++; 
            if (state.pickaxeLevel > state.pickaxeTier * 10 && state.pickaxeTier < BALANCES.PICKAXES.length) { 
                state.pickaxeTier++; 
                FX.createFloatingText(window.innerWidth/2, window.innerHeight/2, "🔥 TIER UP!", 'critical'); 
                confetti(); 
            } else { 
                FX.createFloatingText(window.innerWidth/2, window.innerHeight/2, "강화 성공!", 'critical'); 
            } 
        } else { 
            FX.createFloatingText(window.innerWidth/2, window.innerHeight/2, "강화 실패...", 'standard'); 
        } 
        saveGame(); updateUI(); 
    }
};

document.getElementById('am-speed-upgrade-btn').onclick = () => {
    const cost = BALANCES.getAutoMinerSpeedCost(state.autoMinerSpeedLevel); let canAfford = true;
    if (cost.stone && state.resources.stone < cost.stone) canAfford = false; if (cost.iron && state.resources.iron < cost.iron) canAfford = false; if (cost.gold && state.resources.gold < cost.gold) canAfford = false;
    if (canAfford) { if (cost.stone) state.resources.stone -= cost.stone; if (cost.iron) state.resources.iron -= cost.iron; if (cost.gold) state.resources.gold -= cost.gold; state.autoMinerSpeedLevel++; FX.createFloatingText(window.innerWidth/2, window.innerHeight/2, "채굴 속도 강화! ⚡", 'auto'); saveGame(); updateUI(); }
};

document.getElementById('am-dmg-upgrade-btn').onclick = () => {
    const cost = BALANCES.getAutoMinerDmgCost(state.autoMinerDmgLevel); let canAfford = true;
    if (cost.stone && state.resources.stone < cost.stone) canAfford = false; if (cost.iron && state.resources.iron < cost.iron) canAfford = false; if (cost.gold && state.resources.gold < cost.gold) canAfford = false;
    if (canAfford) { if (cost.stone) state.resources.stone -= cost.stone; if (cost.iron) state.resources.iron -= cost.iron; if (cost.gold) state.resources.gold -= cost.gold; state.autoMinerDmgLevel++; FX.createFloatingText(window.innerWidth/2, window.innerHeight/2, "채굴 파워 강화! 💥", 'auto'); saveGame(); updateUI(); }
};

function handleOfflineArrival() {
    const now = Date.now(); const elapsed = Math.floor((now - state.lastSavedAt) / 1000); if (elapsed < 60) return;
    const actualSeconds = Math.min(elapsed, state.offlineMaxSeconds); const dps = getAutoDamageDPS(); if (dps <= 0) return;
    const mine = BALANCES.MINES[state.currentMineIndex]; const efficiency = BALANCES.PICKAXES[state.pickaxeTier - 1].efficiency;
    const intervalSec = BALANCES.getAutoMinerInterval(state.autoMinerSpeedLevel) / 1000;
    const offlineHits = Math.floor(actualSeconds / intervalSec);
    const totalDamage = actualSeconds * dps * efficiency; const breaks = Math.floor(totalDamage / mine.maxHp);
    
    if (breaks > 0 || offlineHits > 0) {
        const rewardAmount = breaks * mine.amount; const frags = Math.floor(breaks * mine.fragChance);
        state.resources[mine.reward] += rewardAmount; state.pickaxeFragments += frags;
        gainExp(Math.min(totalDamage, breaks * mine.maxHp + (offlineHits * (mine.maxHp * 0.1)))); 
        if (state.autoExchange) processAutoExchange();
        
        document.getElementById('reward-time').textContent = new Date(actualSeconds * 1000).toISOString().substr(11, 8);
        document.getElementById('reward-items').innerHTML = `<div class="res-item"><span>📦</span><b>${mine.name} ${breaks}회</b></div><div class="res-item" style="color:var(--success);"><span>✨</span><b>오프라인 EXP</b></div><div class="res-item"><span>💎</span><b>${rewardAmount.toLocaleString()}획득</b></div><div class="res-item fragment"><span>🔩</span><b>${frags}개 획득</b></div>`;
        modals.reward.classList.remove('hidden');
    }
    state.lastSavedAt = now; saveGame(); updateUI();
}

document.getElementById('reward-collect-btn').onclick = () => modals.reward.classList.add('hidden');
function confetti() { const colors = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6']; for(let i=0;i<50;i++){const p=document.createElement('div');p.className='particle';p.style.left=`${window.innerWidth/2}px`;p.style.top=`${window.innerHeight/2}px`;p.style.backgroundColor=colors[Math.floor(Math.random()*colors.length)];p.style.zIndex='200';p.style.setProperty('--tx',`${(Math.random()-0.5)*800}px`);p.style.setProperty('--ty',`${(Math.random()-0.5)*800}px`);document.body.appendChild(p);setTimeout(()=>p.remove(),1000);} }

document.addEventListener('mousemove', (e) => { const p = document.getElementById('pickaxe-container'); if(p) { p.style.left = `${e.clientX}px`; p.style.top = `${e.clientY}px`; } });

function cheatResource(type, amount) {
    if (type === 'fragment') { state.pickaxeFragments += amount; } else if (type === 'cash') { state.resources.cash += amount; } else { state.resources[type] += amount; }
    FX.createFloatingText(window.innerWidth / 2, window.innerHeight / 2, `치트 적용 완료!`, 'lucky'); saveGame(); updateUI();
}
function cheatExp() { const neededExp = BALANCES.getRequiredExp(state.playerLevel) - state.playerExp; gainExp(neededExp); saveGame(); updateUI(); }
function cheatAutoMiner() {
    if (!state.autoMinerUnlocked) {
        state.totalStonesMined = Math.max(state.totalStonesMined, 20); state.autoMinerUnlocked = true; state.autoMinerSpeedLevel = 1; state.autoMinerDmgLevel = 1;
        FX.createFloatingText(window.innerWidth / 2, window.innerHeight / 2, `자동 채굴기 강제 해금!`, 'lucky'); saveGame(); updateUI();
    } else { alert("이미 자동 채굴기가 해금되어 있습니다."); }
}