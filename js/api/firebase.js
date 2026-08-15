// js/api/firebase.js
import { STORAGE_KEY } from '../../config.js';
import { state } from '../core/state.js';

// --- Firebase 초기화 ---
const firebaseConfig = {
    apiKey: "AIzaSyDEcSZqaK8qFHST5olgf0KNc-3XzQ_0RZ0",
    authDomain: "infinite-mining-group.firebaseapp.com",
    databaseURL: "https://infinite-mining-group-default-rtdb.firebaseio.com/",
    projectId: "infinite-mining-group",
    storageBucket: "infinite-mining-group.firebasestorage.app",
    messagingSenderId: "765777218090",
    appId: "1:765777218090:web:46676037885d43a998d153"
};

// 전역 객체인 firebase는 index.html의 스크립트에서 불러오므로 그대로 사용 가능합니다.
firebase.initializeApp(firebaseConfig);
export const db = firebase.database();
export const auth = firebase.auth();
export const googleProvider = new firebase.auth.GoogleAuthProvider();

// 현재 접속 중인 유저 정보 관리
export let currentUser = null;

// 외부(main.js)에서 유저 정보를 업데이트할 때 쓰는 함수
export function setCurrentUser(user) {
    currentUser = user;
}

// --- 클라우드 세이브 로직 ---
export function saveGame() { 
    if (!currentUser) return; 
    state.lastSavedAt = Date.now(); 
    
    // 1. Firebase 서버에 저장
    db.ref('users/' + currentUser.uid).set(state);
    
    // 2. 기기 로컬 백업
    localStorage.setItem(STORAGE_KEY + '_' + currentUser.uid, JSON.stringify(state)); 
}