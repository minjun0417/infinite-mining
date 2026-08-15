// js/core/state.js
import { defaultState } from '../../config.js';

// 전역 상태 변수 (이제 이 변수를 다른 파일들에서 import 해서 씁니다)
export let state = defaultState();

// 💡 세이브 데이터를 불러와서 기존 상태에 덮어씌우는 함수
export function loadState(savedData) {
    if (savedData.autoMinerLevel !== undefined && savedData.autoMinerDmgLevel === undefined) {
        savedData.autoMinerDmgLevel = savedData.autoMinerLevel;
        savedData.autoMinerSpeedLevel = savedData.autoMinerLevel;
        delete savedData.autoMinerLevel;
    }
    if (!savedData.inventory) {
        savedData.inventory = { boxes: { 'D': 0, 'C': 0, 'B': 0, 'A': 0 }, items: { 'exp_small': 1 } };
    }
    state = Object.assign(defaultState(), savedData);
}

// 💡 상태를 완전히 초기화하는 함수 (로그아웃 하거나 처음 시작할 때 사용)
export function resetState(playerName = 'Digger') {
    state = defaultState();
    state.playerName = playerName;
}