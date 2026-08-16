import { STORAGE_KEY, BALANCES, defaultState } from './config.js';
import { SVG_GEN, FX, confetti } from './js/ui/effects.js';
import { state, loadState, resetState } from './js/core/state.js';
import { db, auth, googleProvider, saveGame, setCurrentUser, currentUser } from './js/api/firebase.js';
import { updateUI, updateBoxShopUI, renderInventory, renderStageList, renderOfflineUI } from './js/ui/uiManager.js';
import { handleMining, handleOfflineArrival, gainExp } from './js/core/game.js';
import { openQuestModal, claimQuestReward, addQuestProgress } from './js/features/quest.js';
import { openBox, useItem, buyOrCombineBox, doExchange, closeRoulette, buyOfflineTicket } from './js/features/shop.js';
import { initChatSystem } from './js/features/chat.js';

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

// 로그인 상태 처리
auth.onAuthStateChanged(async (user) => {
    const introView = document.getElementById('intro-view');
    const loginView = document.getElementById('login-view');
    const gameView = document.getElementById('game-view');

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
        if (gameView) gameView.classList.add('hidden'); 
    }
});

const urlParams = new URLSearchParams(window.location.search);
window.isDevMode = (urlParams.get('dev') === '278admin'); 

// 자동 채굴
let autoMinerTimer = null;
function runAutoMiner() {
    if (state.autoMinerUnlocked) handleMining(true);
    const delay = state.autoMinerUnlocked ? BALANCES.getAutoMinerInterval(state.autoMinerSpeedLevel) : 1000;
    autoMinerTimer = setTimeout(runAutoMiner, delay);
}

// 인트로 애니메이션
function initIntroSequence() {
    const introView = document.getElementById('intro-view');
    const introCrack = document.getElementById('intro-crack');
    const introTitle = document.getElementById('intro-title');
    const introGuide = document.getElementById('intro-guide-text');
    const loginView = document.getElementById('login-view');
    const gameView = document.getElementById('game-view');

    if (!introView || !loginView) return; // 요소가 없으면 종료

    let introStep = 0; 
    
    // 자동 로그인이 되어있다면 인트로를 아예 스킵하고 게임으로!
    if (auth.currentUser) {
        introView.classList.add('hidden');
        loginView.classList.add('hidden');
        if (gameView) gameView.classList.remove('hidden');
        return;
    }

    // 로그인 창은 무조건 처음에 숨김
    loginView.classList.add('hidden');

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
    }, 3000);

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
                // 인트로가 끝나면 로그인 창을 보여줌
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
                // 팝업 방식으로 로그인 진행
                await auth.signInWithPopup(googleProvider); 
            } catch (error) {
                console.error("로그인 에러:", error);
            }
        };
    }
    
    // 👇 진짜 로그아웃 버튼 (설정창 내부)
    const realLogoutBtn = document.getElementById('real-logout-btn');
    if (realLogoutBtn) {
        realLogoutBtn.onclick = () => {
            if(confirm("정말 로그아웃 하시겠습니까?")) {
                auth.signOut().then(() => console.log("로그아웃 완료")).catch(e => console.error(e));
            }
        };
    }

    const rockContainer = document.getElementById('rock-container');
    if (rockContainer) {
        rockContainer.onclick = (e) => handleMining(false, e.clientX, e.clientY);
    }
    
    runAutoMiner();
}; 

// UI 탭 전환 함수
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

// 모달 제어
// 👇 1. modals 객체 맨 끝에 settings: document.getElementById('settings-modal') 가 추가되었습니다!
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
    encyclopedia: document.getElementById('encyclopedia-modal') /* ✨ 신규 추가 */
};

function openModal(id) { 
    // 1. 모든 모달창 숨기기
    Object.values(modals).forEach(m => m?.classList.add('hidden')); 
    
    // 2. 내가 누른 모달창만 띄우기
    if(modals[id]) modals[id].classList.remove('hidden'); 
    
    // 3. 각 모달창에 맞는 데이터 불러오기
    if(id === 'shop') updateBoxShopUI(); 
    if(id === 'inv') renderInventory(); 
    if(id === 'map') renderStageList();
    if(id === 'offline') renderOfflineUI();
    
    // 👇 💡 핵심: 랭킹창이 열리면 반드시 데이터를 불러오도록 강력하게 명령!
    if(id === 'ranking') {
        if (typeof window.loadRankingData === 'function') {
            window.loadRankingData(); 
        } else {
            console.error("🚨 랭킹 불러오기 함수(loadRankingData)를 찾을 수 없습니다! 함수 위치를 확인해주세요.");
        }
    }
    if(id === 'encyclopedia' && typeof window.renderEncyclopedia === 'function') window.renderEncyclopedia();
    
    // 4. UI 업데이트
    updateUI(); 
}
window.openModal = openModal;

// 👇 2. 함수 바로 밑에 설정 버튼 클릭 이벤트를 달아줍니다!
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

document.querySelectorAll('.close-btn').forEach(btn => btn.onclick = () => btn.closest('.modal').classList.add('hidden'));

// 업그레이드 버튼 로직
const forgeUpgradeBtn = document.getElementById('forge-upgrade-btn');
if (forgeUpgradeBtn) {
    forgeUpgradeBtn.onclick = () => {
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
}

const amSpeedUpgradeBtn = document.getElementById('am-speed-upgrade-btn');
if (amSpeedUpgradeBtn) {
    amSpeedUpgradeBtn.onclick = () => {
        const cost = BALANCES.getAutoMinerSpeedCost(state.autoMinerSpeedLevel); let canAfford = true;
        if (cost.stone && state.resources.stone < cost.stone) canAfford = false; if (cost.iron && state.resources.iron < cost.iron) canAfford = false; if (cost.gold && state.resources.gold < cost.gold) canAfford = false;
        if (canAfford) { if (cost.stone) state.resources.stone -= cost.stone; if (cost.iron) state.resources.iron -= cost.iron; if (cost.gold) state.resources.gold -= cost.gold; state.autoMinerSpeedLevel++; FX.createFloatingText(window.innerWidth/2, window.innerHeight/2, "채굴 속도 강화! ⚡", 'auto'); saveGame(); updateUI(); }
    };
}

const amDmgUpgradeBtn = document.getElementById('am-dmg-upgrade-btn');
if (amDmgUpgradeBtn) {
    amDmgUpgradeBtn.onclick = () => {
        const cost = BALANCES.getAutoMinerDmgCost(state.autoMinerDmgLevel); let canAfford = true;
        if (cost.stone && state.resources.stone < cost.stone) canAfford = false; if (cost.iron && state.resources.iron < cost.iron) canAfford = false; if (cost.gold && state.resources.gold < cost.gold) canAfford = false;
        if (canAfford) { if (cost.stone) state.resources.stone -= cost.stone; if (cost.iron) state.resources.iron -= cost.iron; if (cost.gold) state.resources.gold -= cost.gold; state.autoMinerDmgLevel++; FX.createFloatingText(window.innerWidth/2, window.innerHeight/2, "채굴 파워 강화! 💥", 'auto'); saveGame(); updateUI(); }
    };
}

const rewardCollectBtn = document.getElementById('reward-collect-btn');
if (rewardCollectBtn) rewardCollectBtn.onclick = () => { if(modals.reward) modals.reward.classList.add('hidden'); };

document.addEventListener('mousemove', (e) => { const p = document.getElementById('pickaxe-container'); if(p) { p.style.left = `${e.clientX}px`; p.style.top = `${e.clientY}px`; } });

// 치트 로직
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
// --- [신규 추가] 프로필 경험치 실시간 동기화 로직 ---
setInterval(() => {
    const topExp = document.getElementById('current-exp');
    const topMaxExp = document.getElementById('max-exp');
    const topExpFill = document.getElementById('exp-bar-fill');
    
    const profExp = document.getElementById('prof-current-exp');
    const profMaxExp = document.getElementById('prof-max-exp');
    const profExpFill = document.getElementById('prof-exp-fill');
    
    // 메인 화면의 경험치가 변동되면, 채팅 프로필 창의 경험치도 똑같이 맞춰줍니다.
    if (topExp && profExp) {
        profExp.innerText = topExp.innerText;
        profMaxExp.innerText = topMaxExp.innerText;
        if (topExpFill && profExpFill) {
            profExpFill.style.width = topExpFill.style.width;
        }
    }
}, 500); // 0.5초마다 연동 상태 확인
// --- [신규 추가] 모바일 채팅창 키보드 가림 방지 로직 ---
const chatInput = document.getElementById('chat-input');
if (chatInput) {
    chatInput.addEventListener('focus', () => {
        // 키보드가 올라오는 시간(약 0.3초)을 기다렸다가 입력창을 화면 중앙으로 쓱 끌어올립니다.
        setTimeout(() => {
            chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    });
}
// --- [변경됨] 채팅창 상단 프로필 접기/펴기 & 랭킹 버튼 애니메이션 ---
const profileToggleBtn = document.getElementById('profile-toggle-btn');
const profileContent = document.getElementById('chat-profile-content');
const profileToggleIcon = document.getElementById('profile-toggle-icon');
const rankingBtn = document.getElementById('ranking-btn'); // 랭킹 버튼 찾기

if (profileToggleBtn && profileContent) {
    profileToggleBtn.onclick = () => {
        // 프로필 열고 닫기
        profileContent.classList.toggle('collapsed');
        
        // 접혀있으면 화살표 바꾸고 랭킹 버튼 숨기기
        if (profileContent.classList.contains('collapsed')) {
            profileToggleIcon.textContent = '▼';
            if (rankingBtn) rankingBtn.classList.remove('show'); // 랭킹 버튼 퇴장
        } else {
            // 열려있면 화살표 바꾸고 랭킹 버튼 튀어나오게 하기
            profileToggleIcon.textContent = '▲';
            if (rankingBtn) rankingBtn.classList.add('show'); // 랭킹 버튼 등장!
        }
    };
}

// 랭킹 모달 열기 이벤트
if (rankingBtn) {
    rankingBtn.onclick = () => {
        openModal('ranking');
    };
}
// --- 🏆 실시간 데이터베이스(RTDB) 전용 랭킹 데이터 불러오기 ---
window.loadRankingData = async () => {
    console.log("👉 [랭킹] RTDB 랭킹 불러오기 시작...");
    
    const rankingListEl = document.getElementById('ranking-list');
    if(!rankingListEl) return;
    
    rankingListEl.innerHTML = '<div style="text-align:center; padding:20px; color:var(--primary);">데이터를 불러오는 중입니다... ⏳</div>';

    try {
        // 💡 핵심: db.collection() 대신 RTDB 전용인 db.ref().once() 사용!
        const snapshot = await db.ref('users').once('value');
        const usersData = snapshot.val();

        if (!usersData) {
            rankingListEl.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">아직 랭킹에 등록된 유저가 없습니다.</div>';
            return;
        }

        let players = [];
        
        // RTDB는 객체 형태로 데이터를 주므로 변환 과정이 필요합니다
        Object.keys(usersData).forEach(uid => {
            const data = usersData[uid];

            // 데이터베이스 구조에 맞게 안전하게 추출
            const level = data.playerLevel || (data.state && data.state.playerLevel) || data.level || 1;
            const exp = data.playerExp || (data.state && data.state.playerExp) || data.exp || 0;
            const name = data.playerName || (data.state && data.state.playerName) || data.nickname || '이름없는 광부';
            const profile = data.profilePic || (data.state && data.state.profilePic) || 'images/ms.png';

            players.push({ id: uid, name: name, level: level, exp: exp, profilePic: profile });
        });

        // 레벨순 -> 경험치순 정렬
        players.sort((a, b) => {
            if (b.level === a.level) return b.exp - a.exp; 
            return b.level - a.level;
        });

        // 50명까지만 자르기
        players = players.slice(0, 50);
        rankingListEl.innerHTML = '';
        
        // 화면에 예쁘게 그리기
        players.forEach((p, index) => {
            const rank = index + 1;
            let rankClass = ''; let rankIcon = rank;
            if (rank === 1) { rankClass = 'rank-1'; rankIcon = '🥇'; }
            else if (rank === 2) { rankClass = 'rank-2'; rankIcon = '🥈'; }
            else if (rank === 3) { rankClass = 'rank-3'; rankIcon = '🥉'; }

            // 내 닉네임일 경우 강조
            let myName = '';
            if (typeof state !== 'undefined' && p.name === state.playerName) {
                myName = '<span style="color:var(--primary); font-size:0.8rem; font-weight:bold; margin-left:5px;">(나)</span>';
            }

            // --- 👇 여기서부터 교체 시작 ---
            
            // 💡 해당 유저의 레벨에 맞는 '최대 경험치' 계산
            const reqExp = BALANCES.getRequiredExp(p.level);
            let percent = ((p.exp / reqExp) * 100).toFixed(1);
            if (percent > 100) percent = 100;
            if (isNaN(percent) || percent < 0) percent = 0;

            const itemHTML = `
                <div class="rank-item ${rankClass}">
                    <div class="rank-num">${rankIcon}</div>
                    <img src="${p.profilePic}" alt="프로필" class="rank-prof" onerror="this.src='images/ms.png'">
                    
                    <!-- 넓이 꽉 채우기 -->
                    <div class="rank-info" style="flex: 1; min-width: 0;">
                        <div class="rank-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}${myName}</div>
                        
                        <!-- 📊 새롭게 바뀐 랭킹 게이지 바 & 퍼센트! -->
                        <div class="rank-stats" style="display: flex; flex-direction: column; gap: 4px; margin-top: 3px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span class="lv-badge">Lv.${p.level}</span>
                                <span style="font-size: 0.75rem; color: var(--primary); font-weight: 900;">${percent}%</span>
                            </div>
                            <div class="exp-bar" style="height: 6px; margin: 0; background: rgba(0,0,0,0.5); border-radius: 3px;">
                                <div class="exp-bar-fill" style="width: ${percent}%; border-radius: 3px; background: var(--primary);"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            rankingListEl.insertAdjacentHTML('beforeend', itemHTML);
            
            // --- 👆 여기까지 교체 끝 ---
        }); // 👈 💡 [핵심] 이것이 빠져있었습니다! (forEach 반복문 닫기)
        
        console.log("👉 [랭킹] 랭킹 그리기 완벽 성공!");

    } catch (error) {
        console.error("👉 [랭킹] 에러 발생:", error);
        rankingListEl.innerHTML = '<div style="text-align:center; color:#e74c3c;">랭킹 데이터를 불러오지 못했습니다. 😢</div>';
    }
};
// --- 📖 곡괭이 도감 렌더링 함수 (이미지 찾기 강화 버전) ---
window.renderEncyclopedia = () => {
    const gridEl = document.getElementById('encyclopedia-grid');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    // config.js의 데이터 이름이 pickaxes 일 수도, PICKAXES 일 수도 있으니 확인
    let pickaxes = [];
    if (typeof BALANCES !== 'undefined') {
        pickaxes = BALANCES.pickaxes || BALANCES.PICKAXES || [];
    }

    console.log("👉 [도감] 불러온 곡괭이 데이터 원본:", pickaxes);

    if (!pickaxes || pickaxes.length === 0) {
        gridEl.innerHTML = '<div style="grid-column: span 3; text-align:center; color:gray; padding: 20px;">곡괭이 데이터(config.js)를 찾을 수 없습니다.</div>';
        return;
    }

    const currentTier = state.pickaxeTier || 0; 

    pickaxes.forEach((pickaxe, index) => {
        const isUnlocked = index <= currentTier;
        
        // 💡 1. 이미지 찾기: image, img, src 어떤 이름으로 되어있든 다 찾아옵니다.
        // 만약 못 찾으면 images/티어번호.png 같은 기본 규칙으로 찔러봅니다.
        let imgUrl = pickaxe.image || pickaxe.img || pickaxe.src || pickaxe.url || `images/tier${index}.png`;
        
        // 💡 2. 이름 찾기
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