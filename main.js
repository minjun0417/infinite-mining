import { STORAGE_KEY, BALANCES, defaultState } from './config.js';
import { SVG_GEN, FX, confetti } from './js/ui/effects.js';
import { state, loadState, resetState } from './js/core/state.js';
import { db, auth, googleProvider, saveGame, setCurrentUser, currentUser } from './js/api/firebase.js';
import { updateUI, updateBoxShopUI, renderInventory, renderStageList, renderOfflineUI } from './js/ui/uiManager.js';
import { handleMining, handleOfflineArrival, gainExp } from './js/core/game.js';
import { openQuestModal, claimQuestReward, addQuestProgress } from './js/features/quest.js';
import { openBox, useItem, buyOrCombineBox, doExchange, closeRoulette, buyOfflineTicket } from './js/features/shop.js';

// HTML에서 onclick으로 직접 호출하는 함수들을 전역 스코프에 연결
window.openBox = openBox;
window.useItem = useItem;
window.doExchange = doExchange;
window.buyOrCombineBox = buyOrCombineBox; 
window.switchTab = switchTab;
window.switchShopTab = switchShopTab;
window.closeRoulette = closeRoulette;
window.openQuestModal = openQuestModal;
window.claimQuestReward = claimQuestReward;
window.cheatResource = cheatResource;
window.cheatExp = cheatExp;
window.cheatAutoMiner = cheatAutoMiner;
window.buyOfflineTicket = buyOfflineTicket;

window.cheatReset = () => {
    if (confirm("정말 모든 데이터를 초기화하시겠습니까?\n(확인 시 즉시 초기화되며 복구할 수 없습니다)")) {
        resetState(state.playerName || 'Digger'); 
        saveGame();                               
        location.reload();                        
    }
};


// --- 로그인 상태 감지 및 자동 로그인 처리 ---
auth.onAuthStateChanged(async (user) => {
    if (user) {
        setCurrentUser(user);
        try {
            const snapshot = await db.ref('users/' + user.uid).once('value');
            const saved = snapshot.val();
            
            if (saved) {
                loadState(saved);
            } else {
                resetState(user.displayName || 'Digger');
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
        setCurrentUser(null);
        resetState(); // 💡 핵심 추가: 로그아웃 시 메모리에 남은 이전 유저 데이터 완벽 초기화
        document.getElementById('login-view').classList.remove('hidden'); 
        document.getElementById('game-view').classList.add('hidden'); 
    }
});

// ==========================================
// 🔒 1. 주소창 암호 검사 (일반 유저 차단)
// ==========================================
// 주소창 끝에 ?dev=admin 이라고 쳐야만 true가 됩니다.
const urlParams = new URLSearchParams(window.location.search);
window.isDevMode = (urlParams.get('dev') === '278admin'); 

// ==========================================
// 🔒 2. 치트 기능 철통 보안 (암호 없으면 작동 안함)
// ==========================================
window.cheatResource = (type, amount) => {
    if (!window.isDevMode) return; // 개발자 아니면 즉시 차단
    state.resources[type] += amount;
    FX.createFloatingText(window.innerWidth / 2, window.innerHeight / 2, `${type} +${amount}`, 'lucky');
    saveGame(); updateUI();
};

window.cheatExp = () => {
    if (!window.isDevMode) return;
    state.playerExp = BALANCES.getRequiredExp(state.playerLevel);
    gainExp(1);
    saveGame(); updateUI();
};

window.cheatAutoMiner = () => {
    if (!window.isDevMode) return;
    if (!state.autoMinerUnlocked) {
        state.totalStonesMined = Math.max(state.totalStonesMined, 20); 
        state.autoMinerUnlocked = true; state.autoMinerSpeedLevel = 1; state.autoMinerDmgLevel = 1;
        FX.createFloatingText(window.innerWidth / 2, window.innerHeight / 2, `자동 채굴기 강제 해금!`, 'lucky'); 
        saveGame(); updateUI();
    }
};

window.cheatReset = () => {
    if (!window.isDevMode) return;
    if (confirm("정말 모든 데이터를 초기화하시겠습니까?\n(확인 시 즉시 초기화되며 복구할 수 없습니다)")) {
        localStorage.clear(); 
        location.reload();    
    }
};

// ==========================================
// 🔒 3. 화면 켜질 때 조건부로 버튼 보여주기
// ==========================================
window.onload = () => {
    // 암호를 맞게 치고 들어온 개발자에게만 꽁꽁 숨겨둔 버튼을 보여줍니다!
    if (window.isDevMode) {
        const cheatBtn = document.getElementById('nav-cheat');
        if (cheatBtn) cheatBtn.style.display = 'flex'; 
    }
    const loginBtn = document.getElementById('google-login-btn');
    if (loginBtn) {
        loginBtn.onclick = async () => {
            try {
                // Firebase의 팝업 로그인 호출
                await auth.signInWithPopup(googleProvider);
            } catch (error) {
                console.error("로그인 에러:", error);
                alert("로그인 중 오류가 발생했습니다: " + error.message);
            }
        };
    }

    // 1. 수동 채굴 클릭 이벤트 (아래 기존 코드들은 그대로 유지)
    document.getElementById('rock-container').onclick = (e) => handleMining(false, e.clientX, e.clientY);
    
    // ... (이하 기존 onload 로직) ...
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

const modals = { map: document.getElementById('map-modal'), forge: document.getElementById('forge-modal'), inv: document.getElementById('inv-modal'), shop: document.getElementById('shop-modal'), offline: document.getElementById('offline-mgr-modal'), reward: document.getElementById('reward-modal'), cheat: document.getElementById('cheat-modal') };
function openModal(id) { Object.values(modals).forEach(m => m?.classList.add('hidden')); 
    modals[id].classList.remove('hidden'); 
    if(id==='shop') updateBoxShopUI(); 
    if(id==='inv') renderInventory(); 
    if(id==='map') renderStageList();
    if(id === 'offline') renderOfflineUI();
    updateUI(); }

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

document.getElementById('reward-collect-btn').onclick = () => modals.reward.classList.add('hidden');
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