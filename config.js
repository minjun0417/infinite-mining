/**
 * 📊 config.js
 * 게임 내 모든 수치, 확률, 밸런스, 기본 상태를 관리하는 데이터 전용 파일입니다.
 */

export const STORAGE_KEY = 'InfiniteMiningSquad_v8';

export const BALANCES = {
    getRequiredExp(level) { 
        return Math.floor(200 * Math.pow(1.25, level - 1)); 
    },
    CRIT_MULTIPLIER: 3,
    OFFLINE_MAX_SECONDS_DEFAULT: 3600,
    OFFLINE_UPGRADES: [
        { seconds: 3600, cost: null },
        { seconds: 7200, cost: { stone: 5000, iron: 100 } },
        { seconds: 10800, cost: { stone: 15000, iron: 300 } },
        { seconds: 21600, cost: { stone: 40000, iron: 800, gold: 20 } },
        { seconds: 43200, cost: { iron: 2500, gold: 100 } },
        { seconds: 57600, cost: { iron: 5000, gold: 250, diamond: 5 } },
        { seconds: 86400, cost: { gold: 1000, diamond: 25 } }
    ],
    // 💡 곡괭이 이미지 경로 설정 완료
    PICKAXES: [
        { tier: 1, name: '낡은 곡괭이', baseDamage: 1, crit: 0.02, fragmentCost: 10, efficiency: 0.60, color: '#8d6e63', image: 'images/pickaxe_1.png' },
        { tier: 2, name: '돌 곡괭이', baseDamage: 4, crit: 0.04, fragmentCost: 40, efficiency: 0.65, color: '#9e9e9e', image: 'images/pickaxe_2.png' },
        { tier: 3, name: '철 곡괭이', baseDamage: 15, crit: 0.06, fragmentCost: 120, efficiency: 0.70, color: '#b0bec5', image: 'images/pickaxe_3.png' },
        { tier: 4, name: '강철 곡괭이', baseDamage: 50, crit: 0.08, fragmentCost: 400, efficiency: 0.75, color: '#546e7a', image: 'images/pickaxe_4.png' },
        { tier: 5, name: '황금 곡괭이', baseDamage: 180, crit: 0.12, fragmentCost: 1200, efficiency: 0.80, color: '#fbc02d', image: 'images/pickaxe_5.png' },
        { tier: 6, name: '다이아 곡괭이', baseDamage: 600, crit: 0.15, fragmentCost: 3500, efficiency: 0.85, color: '#4fc3f7', image: 'images/pickaxe_6.png' },
        { tier: 7, name: '마력 곡괭이', baseDamage: 2500, crit: 0.20, fragmentCost: 10000, efficiency: 0.90, color: '#ba68c8', image: 'images/pickaxe_7.png' },
        { tier: 8, name: '심연의 곡괭이', baseDamage: 10000, crit: 0.30, fragmentCost: 30000, efficiency: 1.00, color: '#311b92', image: 'images/pickaxe_8.png' }
    ],
    MINES: [
        { name: '돌 광산', depth: 10, maxHp: 15, reward: 'stone', amount: 1, fragChance: 0.02, color: '#757575', ore: '#9e9e9e', reqLevel: 1, unlockCost: null },
        { name: '철 광산', depth: 50, maxHp: 200, reward: 'iron', amount: 1, fragChance: 0.03, color: '#5d4037', ore: '#d7ccc8', reqLevel: 5, unlockCost: { stone: 1000 } },
        { name: '금 광산', depth: 150, maxHp: 2500, reward: 'gold', amount: 1, fragChance: 0.04, color: '#424242', ore: '#fbc02d', reqLevel: 10, unlockCost: { iron: 500 } },
        { name: '다이아 광산', depth: 400, maxHp: 35000, reward: 'diamond', amount: 1, fragChance: 0.05, color: '#1a237e', ore: '#4fc3f7', reqLevel: 20, unlockCost: { gold: 500 } },
        { name: '심층 철 광산', depth: 800, maxHp: 200000, reward: 'iron', amount: 150, fragChance: 0.08, color: '#3e2723', ore: '#ffffff', reqLevel: 30, unlockCost: { diamond: 200 } },
        { name: '지하 마그마', depth: 1500, maxHp: 1500000, reward: 'gold', amount: 50, fragChance: 0.12, color: '#b71c1c', ore: '#ffeb3b', reqLevel: 40, unlockCost: { iron: 5000 } },
        { name: '심연의 틈', depth: 3000, maxHp: 10000000, reward: 'diamond', amount: 20, fragChance: 0.20, color: '#000000', ore: '#ba68c8', reqLevel: 50, unlockCost: { gold: 3000 } }
    ],
    BOXES: {
        'D': { name: 'D등급 나무 상자', cost: { diamond: 10 }, minCash: 1, maxCash: 10, icon: '📦' },
        'C': { name: 'C등급 철 상자', reqBox: 'D', reqCount: 9, minCash: 10, maxCash: 50, icon: '🧰' },
        'B': { name: 'B등급 금 상자', reqBox: 'C', reqCount: 9, minCash: 50, maxCash: 500, icon: '🎁' },
        'A': { name: 'A등급 다이아 상자', reqBox: 'B', reqCount: 9, minCash: 500, maxCash: 5000, icon: '💎' }
    },

    EXCHANGE: [
        { low: 'stone', high: 'iron', rateUp: 1000, rateDown: 800, nameL: '돌', nameH: '철', iconL: '🪨', iconH: '⛓️' },
        { low: 'iron', high: 'gold', rateUp: 100, rateDown: 80, nameL: '철', nameH: '금', iconL: '⛓️', iconH: '🥇' },
        { low: 'gold', high: 'diamond', rateUp: 50, rateDown: 40, nameL: '금', nameH: '다이아', iconL: '🥇', iconH: '💎' }
    ],
    ITEMS: {
        'exp_small': { name: '소형 경험치 물약', desc: '사용 시 100 EXP를 즉시 획득합니다.', type: 'exp', value: 100, icon: '🧪' }
    },
    
    getAutoMinerDamage(level) { 
        if (level === 0) return 0; 
        return Math.floor(1 * Math.pow(1.4, level - 1)); 
    },
    getAutoMinerDmgCost(level) {
        const next = level + 1;
        let cost = { stone: Math.floor(20 * Math.pow(1.5, next - 1)) };
        if (next >= 10) cost.iron = Math.floor(10 * Math.pow(1.4, next - 10));
        if (next >= 20) cost.gold = Math.floor(5 * Math.pow(1.3, next - 20));
        return cost;
    },
    getAutoMinerInterval(level) { 
        if (level === 0) return 5000; 
        return Math.max(500, 5000 - (level - 1) * 200); 
    },
    getAutoMinerSpeedCost(level) {
        const next = level + 1;
        let cost = { stone: Math.floor(30 * Math.pow(1.5, next - 1)) };
        if (next >= 5) cost.iron = Math.floor(15 * Math.pow(1.4, next - 5));
        if (next >= 15) cost.gold = Math.floor(5 * Math.pow(1.3, next - 15));
        return cost;
    },

    getUpgradeSuccessChance(level) {
        if (level < 10) return 1.0;
        if (level < 15) return 0.6;
        if (level < 20) return 0.4;
        return 0.2;
    },
    LUCKY_STRIKE_CHANCE: 0.01,
    LUCKY_STRIKE_MULT: 10,

    DAILY_QUESTS: [
        { id: 'quest_stone', name: '기본에 충실하게', desc: '돌 1,000개 채굴하기', target: 1000, rewardText: '조각 100개', reward: { type: 'fragment', amount: 100 } },
        { id: 'quest_iron', name: '철의 시대', desc: '철 500개 채굴하기', target: 500, rewardText: '조각 250개', reward: { type: 'fragment', amount: 250 } },
        { id: 'quest_gold', name: '반짝이는 황금', desc: '금 100개 채굴하기', target: 100, rewardText: '조각 500개', reward: { type: 'fragment', amount: 500 } },
        { id: 'quest_diamond', name: '최고의 보석', desc: '다이아 20개 채굴하기', target: 20, rewardText: '조각 1,000개', reward: { type: 'fragment', amount: 1000 } }
    ],

    OFFLINE_TICKETS: [
        { name: '30분 충전권', time: 1800, cost: { stone: 1000, iron: 100, gold: 10, diamond: 1 } },
        { name: '1시간 충전권', time: 3600, cost: { stone: 2000, iron: 200, gold: 20, diamond: 2 } },
        { name: '3시간 충전권', time: 10800, cost: { stone: 6000, iron: 600, gold: 60, diamond: 6 } },
        { name: '6시간 충전권', time: 21600, cost: { stone: 12000, iron: 1200, gold: 120, diamond: 12 } },
        { name: '12시간 충전권', time: 43200, cost: { stone: 24000, iron: 2400, gold: 240, diamond: 24 } },
        { name: '24시간 충전권', time: 86400, cost: { stone: 48000, iron: 4800, gold: 480, diamond: 48 } }
    ],
};

export const defaultState = () => ({
    playerName: 'Digger',
    playerLevel: 1,
    playerExp: 0,
    currentMineIndex: 0,
    unlockedStages: [0],
    currentHp: 15,
    pickaxeTier: 1,
    pickaxeLevel: 1,
    pickaxeFragments: 0,
    
    totalStonesMined: 0,
    autoMinerUnlocked: false,
    autoMinerSpeedLevel: 0,
    autoMinerDmgLevel: 0,
    
    offlineTimeRemaining: 0,
    lastSavedAt: Date.now(),
    autoExchange: false,
    resources: { stone: 0, iron: 0, gold: 0, diamond: 0, cash: 0 },
    inventory: {
        boxes: { 'D': 0, 'C': 0, 'B': 0, 'A': 0 },
        items: { 'exp_small': 1 }
    },
    lastQuestDate: '', 
    dailyQuests: {}
});