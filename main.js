// 게임 상태 관리
let state = {
    playerName: 'Digger',
    maxHp: 10,
    currentHp: 10,
    resources: {
        stone: 0,
        iron: 0,
        gold: 0,
        diamond: 0,
        money: 0
    }
};

// DOM 요소 캐싱
const loginView = document.getElementById('login-view');
const gameView = document.getElementById('game-view');
const startBtn = document.getElementById('start-btn');
const nameInput = document.getElementById('digger-name');
const bigRock = document.getElementById('big-rock');
const hpBarFill = document.getElementById('hp-bar-fill');

// 환전소 모달 관련 DOM
const shopModal = document.getElementById('shop-modal');
const openShopBtn = document.getElementById('open-shop-btn');
const closeShopBtn = document.getElementById('close-shop-btn');

// 로그인 로직
startBtn.addEventListener('click', () => {
    const inputName = nameInput.value.trim();
    if (inputName !== '') {
        state.playerName = inputName;
    }
    document.getElementById('display-name').textContent = state.playerName;
    loginView.classList.add('hidden');
    gameView.classList.remove('hidden');
    updateUI();
});

// 광석 클릭 이벤트
bigRock.addEventListener('click', (e) => {
    state.currentHp--;
    
    createDamageText(e.clientX, e.clientY);
    
    const hpPercent = (state.currentHp / state.maxHp) * 100;
    hpBarFill.style.width = `${hpPercent}%`;
    
    if (state.currentHp <= 0) {
        breakRock();
    }
});

function createDamageText(x, y) {
    const damageText = document.createElement('div');
    damageText.textContent = '-1';
    damageText.className = 'floating-damage';
    
    // 약간 랜덤한 위치로 데미지 텍스트 흩뿌리기
    const offsetX = (Math.random() - 0.5) * 40;
    damageText.style.left = `${x - 20 + offsetX}px`;
    damageText.style.top = `${y - 40}px`;
    
    document.body.appendChild(damageText);
    
    setTimeout(() => {
        damageText.remove();
    }, 600);
}

function breakRock() {
    state.resources.stone += 1;
    state.currentHp = state.maxHp;
    hpBarFill.style.width = '100%';
    updateUI();
}

function updateUI() {
    document.getElementById('stone-count').textContent = state.resources.stone.toLocaleString();
    document.getElementById('iron-count').textContent = state.resources.iron.toLocaleString();
    document.getElementById('gold-count').textContent = state.resources.gold.toLocaleString();
    document.getElementById('diamond-count').textContent = state.resources.diamond.toLocaleString();
    document.getElementById('money-count').textContent = state.resources.money.toLocaleString();
}

// ----- 모달 창 열기/닫기 로직 -----

openShopBtn.addEventListener('click', () => {
    shopModal.classList.remove('hidden');
});

closeShopBtn.addEventListener('click', () => {
    shopModal.classList.add('hidden');
});

// 모달 바깥 배경을 클릭하면 창 닫기
window.addEventListener('click', (e) => {
    if (e.target === shopModal) {
        shopModal.classList.add('hidden');
    }
});

// ----- 상점(환전) 로직 -----

document.getElementById('buy-iron').addEventListener('click', () => {
    if (state.resources.stone >= 1000) {
        state.resources.stone -= 1000;
        state.resources.iron += 1;
        updateUI();
    } else {
        alert("돌이 부족합니다! (1,000개 필요)");
    }
});

document.getElementById('buy-gold').addEventListener('click', () => {
    if (state.resources.iron >= 1000) { 
        state.resources.iron -= 1000;
        state.resources.gold += 1;
        updateUI();
    } else {
        alert("철이 부족합니다! (1,000개 필요)");
    }
});

document.getElementById('buy-diamond').addEventListener('click', () => {
    if (state.resources.gold >= 1000) { 
        state.resources.gold -= 1000;
        state.resources.diamond += 1;
        updateUI();
    } else {
        alert("금이 부족합니다! (1,000개 필요)");
    }
});

document.getElementById('buy-money').addEventListener('click', () => {
    if (state.resources.diamond >= 1000) { 
        state.resources.diamond -= 1000;
        state.resources.money += 50; // 다이아 1000개 -> 돈 50원
        updateUI();
    } else {
        alert("다이아가 부족합니다! (1,000개 필요)");
    }
});