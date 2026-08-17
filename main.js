// main.js
import { STORAGE_KEY, BALANCES, defaultState } from './config.js';
import { SVG_GEN, FX, confetti } from './js/ui/effects.js';
import { state, loadState, resetState } from './js/core/state.js';
import { db, auth, googleProvider, saveGame, setCurrentUser, currentUser } from './js/api/firebase.js';
import { updateUI, updateBoxShopUI, renderInventory, renderStageList, renderOfflineUI } from './js/ui/uiManager.js';
import { handleMining, handleOfflineArrival, gainExp } from './js/core/game.js';
import { openQuestModal, claimQuestReward, addQuestProgress } from './js/features/quest.js';
import { openBox, useItem, buyOrCombineBox, doExchange, closeRoulette, buyOfflineTicket } from './js/features/shop.js';
import { initChatSystem, activeViewingUid } from './js/features/chat.js';

window.openBox = openBox;
window.useItem = useItem;
window.doExchange = doExchange;
window.buyOrCombineBox = buyOrCombineBox; 
window.switchTab = switchTab;
window.switchShopTab = switchShopTab;
window.switchForgeTab = switchForgeTab;
window.closeRoulette = closeRoulette;
window.openQuestModal = openQuestModal;
window.claimQuestReward = claimQuestReward;
window.cheatResource = cheatResource;
window.cheatExp = cheatExp;
window.cheatAutoMiner = cheatAutoMiner;
window.buyOfflineTicket = buyOfflineTicket;

auth.onAuthStateChanged(async (user) => {
    const introView = document.getElementById('intro-view');
    const loginView = document.getElementById('login-view');
    const gameView = document.getElementById('game-view');
    const chatView = document.getElementById('chat-view');

    if (user) {
        console.log("🟢 로그인 성공! 유저 데이터 로딩 시작...");
        setCurrentUser(user);
        
        try {
            const snapshot = await db.ref('users/' + user.uid).once('value');
            const saved = snapshot.val();
            
            if (saved) loadState(saved);
            else resetState(user.displayName || 'Digger');
            
            handleOfflineArrival();
            
            if (introView) introView.classList.add('hidden'); 
            if (loginView) loginView.classList.add('hidden'); 
            if (gameView) gameView.classList.remove('hidden'); 
            
            initChatSystem(user);
            saveGame(); 
            updateUI(); 
            
            console.log("🟢 게임 화면 진입 완료!");
        } catch (e) {
            console.error("데이터 로드 오류:", e);
            alert(`데이터 불러오기 실패: ${e.message}`);
            auth.signOut();
        }
    } else {
        console.log("🔴 로그아웃 상태입니다.");
        setCurrentUser(null);
        resetState(); 
        
        Object.values(modals).forEach(m => m?.classList.add('hidden'));
        if (gameView) gameView.classList.add('hidden');
        if (chatView) chatView.classList.add('chat-overlay-hidden');
        initIntroSequence(true);
    }
});

const urlParams = new URLSearchParams(window.location.search);
window.isDevMode = (urlParams.get('dev') === '278admin'); 

let autoMinerTimer = null;
function runAutoMiner() {
    if (state.autoMinerUnlocked) handleMining(true);
    const delay = state.autoMinerUnlocked ? BALANCES.getAutoMinerInterval(state.autoMinerSpeedLevel) : 1000;
    autoMinerTimer = setTimeout(runAutoMiner, delay);
}

function initIntroSequence(forceShow = false) {
    const introView = document.getElementById('intro-view');
    const introCrack = document.getElementById('intro-crack');
    const introTitle = document.getElementById('intro-title');
    const introGuide = document.getElementById('intro-guide-text');
    const loginView = document.getElementById('login-view');
    const gameView = document.getElementById('game-view');

    if (!introView || !loginView) return;

    if (!forceShow && auth.currentUser) {
        introView.classList.add('hidden');
        loginView.classList.add('hidden');
        if (gameView) gameView.classList.remove('hidden');
        return;
    }

    introView.className = 'view';
    introView.classList.remove('hidden', 'fade-out', 'screen-quake');
    loginView.classList.add('hidden');
    if (introCrack) introCrack.classList.add('hidden');
    if (introTitle) {
        introTitle.classList.add('hidden');
        introTitle.style.animation = 'none';
    }
    if (introGuide) introGuide.classList.add('hidden');

    let introStep = 0;

    function createDebrisEffect() {
        const colors = ['#7f8c8d', '#95a5a6', '#5d4037', '#8d6e63', '#34495e'];
        for (let i = 0; i < 40; i++) {
            const debris = document.createElement('div');
            debris.className = 'debris-particle';
            const size = Math.random() * 8 + 4; 
            debris.style.width = `${size}px`;
            debris.style.height = `${size}px`;
            debris.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            debris.style.left = `calc(50% + ${(Math.random() - 0.5) * 300}px)`;
            debris.style.top = `calc(50% + ${(Math.random() - 0.5) * 100}px)`;
            debris.style.setProperty('--tx', `${(Math.random() - 0.5) * 400}px`); 
            debris.style.setProperty('--ty', `${Math.random() * 300 + 100}px`); 
            debris.style.setProperty('--rot', `${Math.random() * 720}deg`); 
            introView.appendChild(debris);
            setTimeout(() => debris.remove(), 1500);
        }
    }

    setTimeout(() => {
        if(introStep > 0) return;
        introStep = 1;
        introView.classList.add('screen-quake'); 
        if(introCrack) introCrack.classList.remove('hidden');   
        if(introGuide) introGuide.classList.remove('hidden');   
    }, 2000);

    introView.onclick = () => {
        if (introStep === 1) {
            introStep = 2;
            if(introCrack) introCrack.classList.add('hidden');
            introView.classList.remove('screen-quake');
            void introView.offsetWidth; 
            introView.classList.add('screen-quake');
            
            if(introTitle) {
                introTitle.classList.remove('hidden');
                void introTitle.offsetWidth; 
                introTitle.style.animation = 'titleDrop 1s cubic-bezier(0.25, 0.8, 0.25, 1) forwards';
            }
            setTimeout(createDebrisEffect, 350); 
            
        } else if (introStep === 2) {
            introStep = 3;
            if(introGuide) introGuide.classList.add('hidden');
            introView.classList.add('fade-out'); 
            
            setTimeout(() => {
                introView.classList.add('hidden');
                if(loginView) loginView.classList.remove('hidden'); 
            }, 1000); 
        }
    };
}

window.onload = () => {
    initIntroSequence();
    
    if (window.isDevMode) {
        const cheatBtn = document.getElementById('nav-cheat');
        if (cheatBtn) cheatBtn.style.display = 'flex'; 
    }
    
    const loginBtn = document.getElementById('google-login-btn');
    if (loginBtn) {
        loginBtn.onclick = async () => {
            try {
                await auth.signInWithPopup(googleProvider); 
            } catch (error) {
                console.error("로그인 에러:", error);
            }
        };
    }
    
    const realLogoutBtn = document.getElementById('real-logout-btn');
    if (realLogoutBtn) {
        realLogoutBtn.onclick = () => {
            if(confirm("정말 로그아웃 하시겠습니까?")) {
                auth.signOut().then(() => {
                    console.log("로그아웃 완료");
                }).catch(e => console.error(e));
            }
        };
    }

    const rockContainer = document.getElementById('rock-container');
    if (rockContainer) {
        rockContainer.onpointerdown = (e) => {
            handleMining(false, e.clientX, e.clientY);
        };
    }
    
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const modal = btn.closest('.modal');
            if (modal) modal.classList.add('hidden');
        };
    });

    runAutoMiner();
}; 

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    event.currentTarget.classList.add('active');
    document.getElementById(`tab-${tabId}`).classList.add('active');
}

function switchShopTab(tabId) {
    document.querySelectorAll('#shop-modal .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('#shop-modal .tab-content').forEach(content => content.classList.remove('active'));
    event.currentTarget.classList.add('active');
    document.getElementById(`shop-tab-${tabId}`).classList.add('active');
}

function switchForgeTab(tabId) {
    document.querySelectorAll('#forge-modal .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('#forge-modal .tab-content').forEach(content => content.classList.remove('active'));
    event.currentTarget.classList.add('active');
    const target = document.getElementById(`forge-tab-${tabId}`);
    if (target) target.classList.add('active');
}

const modals = { 
    map: document.getElementById('map-modal'), 
    forge: document.getElementById('forge-modal'), 
    inv: document.getElementById('inv-modal'), 
    shop: document.getElementById('shop-modal'), 
    offline: document.getElementById('offline-mgr-modal'), 
    reward: document.getElementById('reward-modal'), 
    cheat: document.getElementById('cheat-modal'),
    settings: document.getElementById('settings-modal'),
    ranking: document.getElementById('ranking-modal'),
    encyclopedia: document.getElementById('encyclopedia-modal')
};

function openModal(id) { 
    Object.values(modals).forEach(m => m?.classList.add('hidden')); 
    if(modals[id]) modals[id].classList.remove('hidden'); 
    
    if(id === 'shop') updateBoxShopUI(); 
    if(id === 'inv') renderInventory(); 
    if(id === 'map') renderStageList();
    if(id === 'offline') renderOfflineUI();
    
    if(id === 'ranking') {
        if (typeof window.loadRankingData === 'function') {
            window.loadRankingData(); 
        } else {
            console.error("🚨 랭킹 불러오기 함수를 찾을 수 없습니다.");
        }
    }
    if(id === 'encyclopedia' && typeof window.renderEncyclopedia === 'function') window.renderEncyclopedia();
    
    updateUI(); 
}
window.openModal = openModal;

window.closeModal = function(id) {
    if (id && modals[id]) modals[id].classList.add('hidden');
    else Object.values(modals).forEach(m => m?.classList.add('hidden'));
};

const settingsBtn = document.getElementById('settings-btn');
if (settingsBtn) {
    settingsBtn.onclick = () => openModal('settings');
}

const navMap = document.getElementById('nav-map'); if (navMap) navMap.onclick = () => openModal('map'); 
const navForge = document.getElementById('nav-forge'); if (navForge) navForge.onclick = () => openModal('forge'); 
const navInv = document.getElementById('nav-inv'); if (navInv) navInv.onclick = () => openModal('inv'); 
const navShop = document.getElementById('nav-shop'); if (navShop) navShop.onclick = () => openModal('shop'); 
const navOffline = document.getElementById('nav-offline'); if (navOffline) navOffline.onclick = () => openModal('offline'); 
const navCheat = document.getElementById('nav-cheat'); if (navCheat) navCheat.onclick = () => openModal('cheat');

let isPickaxeUpgrading = false;

const forgeUpgradeBtn = document.getElementById('forge-upgrade-btn');
if (forgeUpgradeBtn) {
    forgeUpgradeBtn.onclick = () => {
        if (isPickaxeUpgrading) return;

        const cost = Math.ceil(BALANCES.PICKAXES[state.pickaxeTier - 1].fragmentCost * Math.pow(1.15, state.pickaxeLevel - state.pickaxeTier));
        if (state.pickaxeFragments < cost) return;

        isPickaxeUpgrading = true;
        state.pickaxeFragments -= cost;
        saveGame();
        updateUI();

        const forgeDisplay = document.querySelector('.forge-display');
        const statusMsg = document.getElementById('forge-status-msg');
        
        forgeUpgradeBtn.disabled = true;
        forgeUpgradeBtn.textContent = '⚡ 강화 시도 중...';
        forgeUpgradeBtn.style.background = 'linear-gradient(180deg, #e67e22, #d35400)';
        if (forgeDisplay) forgeDisplay.classList.add('starforce-pulse');
        if (statusMsg) {
            statusMsg.innerHTML = '<span style="color:var(--gold); animation: blink 0.5s infinite;">별의 기운을 불어넣는 중... ⏳</span>';
        }

        setTimeout(() => {
            const chance = BALANCES.getUpgradeSuccessChance(state.pickaxeLevel);
            const isSuccess = Math.random() < chance;

            if (forgeDisplay) forgeDisplay.classList.remove('starforce-pulse');

            if (isSuccess) {
                state.pickaxeLevel++;
                const willTierUp = (state.pickaxeLevel > state.pickaxeTier * 10 && state.pickaxeTier < BALANCES.PICKAXES.length);

                if (willTierUp) {
                    state.pickaxeTier++;
                    const newPick = BALANCES.PICKAXES[state.pickaxeTier - 1];
                    FX.createFloatingText(window.innerWidth/2, window.innerHeight/2, "🔥 TIER UP!", 'critical');
                    confetti();
                    if (statusMsg) statusMsg.innerHTML = `<span style="color:#f1c40f; font-size:1rem; font-weight:900;">🎉 [TIER UP] ${newPick.name} 승급 성공!</span>`;
                } else {
                    FX.createFloatingText(window.innerWidth/2, window.innerHeight/2, "✨ 강화 성공!", 'critical');
                    if (statusMsg) statusMsg.innerHTML = `<span style="color:var(--success); font-size:0.95rem;">✨ [SUCCESS] 강화 성공! (Lv.${state.pickaxeLevel})</span>`;
                }
            } else {
                FX.createFloatingText(window.innerWidth/2, window.innerHeight/2, "💥 강화 실패...", 'standard');
                if (statusMsg) statusMsg.innerHTML = `<span style="color:var(--danger); font-size:0.95rem;">💥 [FAIL] 강화 실패... (레벨 유지)</span>`;
            }

            saveGame();
            updateUI();
            isPickaxeUpgrading = false;
        }, 1500);
    };
}

const amSpeedUpgradeBtn = document.getElementById('am-speed-upgrade-btn');
if (amSpeedUpgradeBtn) {
    amSpeedUpgradeBtn.onclick = () => {
        const cost = BALANCES.getAutoMinerSpeedCost(state.autoMinerSpeedLevel); let canAfford = true;
        if (cost.stone) { if (state.resources.stone < cost.stone) canAfford = false; }
        if (cost.iron) { if (state.resources.iron < cost.iron) canAfford = false; }
        if (cost.gold) { if (state.resources.gold < cost.gold) canAfford = false; }
        if (canAfford) { 
            if (cost.stone) state.resources.stone -= cost.stone; 
            if (cost.iron) state.resources.iron -= cost.iron; 
            if (cost.gold) state.resources.gold -= cost.gold; 
            state.autoMinerSpeedLevel++; 
            FX.createFloatingText(window.innerWidth/2, window.innerHeight/2, "채굴 속도 강화! ⚡", 'auto'); 
            saveGame(); updateUI(); 
        }
    };
}

const amDmgUpgradeBtn = document.getElementById('am-dmg-upgrade-btn');
if (amDmgUpgradeBtn) {
    amDmgUpgradeBtn.onclick = () => {
        const cost = BALANCES.getAutoMinerDmgCost(state.autoMinerDmgLevel); let canAfford = true;
        if (cost.stone) { if (state.resources.stone < cost.stone) canAfford = false; }
        if (cost.iron) { if (state.resources.iron < cost.iron) canAfford = false; }
        if (cost.gold) { if (state.resources.gold < cost.gold) canAfford = false; }
        if (canAfford) { 
            if (cost.stone) state.resources.stone -= cost.stone; 
            if (cost.iron) state.resources.iron -= cost.iron; 
            if (cost.gold) state.resources.gold -= cost.gold; 
            state.autoMinerDmgLevel++; 
            FX.createFloatingText(window.innerWidth/2, window.innerHeight/2, "채굴 파워 강화! 💥", 'auto'); 
            saveGame(); updateUI(); 
        }
    };
}

const rewardCollectBtn = document.getElementById('reward-collect-btn');
if (rewardCollectBtn) rewardCollectBtn.onclick = () => { if(modals.reward) modals.reward.classList.add('hidden'); };

window.cheatReset = () => {
    if (!window.isDevMode) return;
    if (confirm("정말 모든 데이터를 초기화하시겠습니까?\n(확인 시 즉시 초기화되며 복구할 수 없습니다)")) {
        resetState(state.playerName || 'Digger'); 
        saveGame();                               
        location.reload();                        
    }
};
function cheatResource(type, amount) {
    if (!window.isDevMode) return;
    if (type === 'fragment') { state.pickaxeFragments += amount; } else if (type === 'cash') { state.resources.cash += amount; } else { state.resources[type] += amount; }
    FX.createFloatingText(window.innerWidth / 2, window.innerHeight / 2, `치트 적용 완료!`, 'lucky'); saveGame(); updateUI();
}
function cheatExp() { 
    if (!window.isDevMode) return;
    const neededExp = BALANCES.getRequiredExp(state.playerLevel) - state.playerExp; gainExp(neededExp); saveGame(); updateUI(); 
}
function cheatAutoMiner() {
    if (!window.isDevMode) return;
    if (!state.autoMinerUnlocked) {
        state.totalStonesMined = Math.max(state.totalStonesMined, 20); state.autoMinerUnlocked = true; state.autoMinerSpeedLevel = 1; state.autoMinerDmgLevel = 1;
        FX.createFloatingText(window.innerWidth / 2, window.innerHeight / 2, `자동 채굴기 강제 해금!`, 'lucky'); saveGame(); updateUI();
    } else { alert("이미 자동 채굴기가 해금되어 있습니다."); }
}

// 💡 [수정] 내 프로필을 보고 있을 때만 경험치 바 동기화
setInterval(() => {
    if (activeViewingUid && currentUser && activeViewingUid !== currentUser.uid) return;

    const topExp = document.getElementById('current-exp');
    const topMaxExp = document.getElementById('max-exp');
    const topExpFill = document.getElementById('exp-bar-fill');
    
    const profExp = document.getElementById('prof-current-exp');
    const profMaxExp = document.getElementById('prof-max-exp');
    const profExpFill = document.getElementById('prof-exp-fill');
    
    if (topExp && profExp) {
        profExp.innerText = topExp.innerText;
        profMaxExp.innerText = topMaxExp.innerText;
        if (topExpFill && profExpFill) {
            profExpFill.style.width = topExpFill.style.width;
        }
    }
}, 500);

const chatInput = document.getElementById('chat-input');
if (chatInput) {
    chatInput.addEventListener('focus', () => {
        setTimeout(() => {
            chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    });
}

const profileToggleBtn = document.getElementById('profile-toggle-btn');
const profileContent = document.getElementById('chat-profile-content');
const profileToggleIcon = document.getElementById('profile-toggle-icon');
const rankingBtn = document.getElementById('ranking-btn');

if (profileToggleBtn && profileContent) {
    profileToggleBtn.onclick = () => {
        profileContent.classList.toggle('collapsed');
        if (profileContent.classList.contains('collapsed')) {
            profileToggleIcon.textContent = '▼';
            if (rankingBtn) rankingBtn.classList.remove('show');
        } else {
            profileToggleIcon.textContent = '▲';
            if (rankingBtn) rankingBtn.classList.add('show');
        }
    };
}

if (rankingBtn) {
    rankingBtn.onclick = () => {
        openModal('ranking');
    };
}

window.loadRankingData = async () => {
    const rankingListEl = document.getElementById('ranking-list');
    if(!rankingListEl) return;
    
    rankingListEl.innerHTML = '<div style="text-align:center; padding:20px; color:var(--primary);">데이터를 불러오는 중입니다... ⏳</div>';

    try {
        const snapshot = await db.ref('users').once('value');
        const usersData = snapshot.val();

        if (!usersData) {
            rankingListEl.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">아직 랭킹에 등록된 유저가 없습니다.</div>';
            return;
        }

        let players = [];
        Object.keys(usersData).forEach(uid => {
            const data = usersData[uid];
            const level = data.playerLevel || (data.state && data.state.playerLevel) || data.level || 1;
            const exp = data.playerExp || (data.state && data.state.playerExp) || data.exp || 0;
            const name = data.playerName || (data.state && data.state.playerName) || data.nickname || '이름없는 광부';
            const profile = data.profilePic || (data.state && data.state.profilePic) || 'images/ms.png';

            players.push({ id: uid, name: name, level: level, exp: exp, profilePic: profile });
        });

        players.sort((a, b) => {
            if (b.level === a.level) return b.exp - a.exp; 
            return b.level - a.level;
        });

        players = players.slice(0, 50);
        rankingListEl.innerHTML = '';
        
        players.forEach((p, index) => {
            const rank = index + 1;
            let rankClass = ''; let rankIcon = rank;
            if (rank === 1) { rankClass = 'rank-1'; rankIcon = '🥇'; }
            else if (rank === 2) { rankClass = 'rank-2'; rankIcon = '🥈'; }
            else if (rank === 3) { rankClass = 'rank-3'; rankIcon = '🥉'; }

            let myName = '';
            if (typeof state !== 'undefined' && p.name === state.playerName) {
                myName = '<span style="color:var(--primary); font-size:0.8rem; font-weight:bold; margin-left:5px;">(나)</span>';
            }

            const reqExp = BALANCES.getRequiredExp(p.level);
            let percent = ((p.exp / reqExp) * 100).toFixed(1);
            if (percent > 100) percent = 100;
            if (isNaN(percent) || percent < 0) percent = 0;

            const itemHTML = `
                <div class="rank-item ${rankClass}">
                    <div class="rank-num">${rankIcon}</div>
                    <img src="${p.profilePic}" alt="프로필" class="rank-prof" onerror="this.src='images/ms.png'">
                    <div class="rank-info" style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px;">
                        <div class="rank-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 1rem;">${p.name}${myName}</div>
                        
                        <div class="rank-stats" style="display: flex; flex-direction: column; gap: 6px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span class="lv-badge" style="font-size: 0.75rem; padding: 2px 7px;">Lv.${p.level}</span>
                                <span style="font-size: 0.75rem; color: var(--primary); font-weight: bold;">
                                    ${Math.floor(p.exp).toLocaleString()} EXP <strong style="margin-left: 4px; color: #fff;">(${percent}%)</strong>
                                </span>
                            </div>
                            <div class="exp-bar" style="height: 6px; width: 100%; margin: 0; background: rgba(0,0,0,0.5); border-radius: 3px;">
                                <div class="exp-bar-fill" style="width: ${percent}%; border-radius: 3px; background: var(--primary);"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            rankingListEl.insertAdjacentHTML('beforeend', itemHTML);
        });

    } catch (error) {
        console.error("👉 [랭킹] 에러 발생:", error);
        rankingListEl.innerHTML = '<div style="text-align:center; color:#e74c3c;">랭킹 데이터를 불러오지 못했습니다. 😢</div>';
    }
};

window.renderEncyclopedia = () => {
    const gridEl = document.getElementById('encyclopedia-grid');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    let pickaxes = [];
    if (typeof BALANCES !== 'undefined') {
        pickaxes = BALANCES.pickaxes || BALANCES.PICKAXES || [];
    }

    if (!pickaxes || pickaxes.length === 0) {
        gridEl.innerHTML = '<div style="grid-column: span 3; text-align:center; color:gray; padding: 20px;">곡괭이 데이터(config.js)를 찾을 수 없습니다.</div>';
        return;
    }

    const currentTier = state.pickaxeTier || 0; 

    pickaxes.forEach((pickaxe, index) => {
        const isUnlocked = index <= currentTier;
        let imgUrl = pickaxe.image || pickaxe.img || pickaxe.src || pickaxe.url || `images/tier${index}.png`;
        let pickaxeName = pickaxe.name || pickaxe.title || `티어 ${index+1} 곡괭이`;

        const itemHTML = `
            <div class="encyc-item ${isUnlocked ? '' : 'locked'}">
                <img src="${imgUrl}" alt="${pickaxeName}" onerror="this.src='images/ms.png'">
                <div class="encyc-name">${isUnlocked ? pickaxeName : '???'}</div>
                <div style="font-size: 0.7rem; color: #f1c40f;">Tier ${index + 1}</div>
            </div>
        `;
        gridEl.insertAdjacentHTML('beforeend', itemHTML);
    });
};