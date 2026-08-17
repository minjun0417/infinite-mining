// js/features/chat.js
import { db, currentUser } from '../api/firebase.js';
import { state } from '../core/state.js';
import { BALANCES } from '../../config.js';

export let activeViewingUid = null; // 💡 현재 조회 중인 프로필의 UID (null이면 내 프로필)
let topRankUsers = {}; 
let liveUsers = {};

export function updateTopRanks() {
    db.ref('users').once('value').then(snap => {
        const users = snap.val() || {};
        liveUsers = users;
        
        let list = [];
        Object.keys(users).forEach(uid => {
            const data = users[uid];
            const level = data.playerLevel || (data.state && data.state.playerLevel) || data.level || 1;
            const exp = data.playerExp || (data.state && data.state.playerExp) || data.exp || 0;
            list.push({ uid, level, exp });
        });
        list.sort((a, b) => b.level === a.level ? b.exp - a.exp : b.level - a.level);
        
        topRankUsers = {};
        if (list[0]) topRankUsers[list[0].uid] = 1;
        if (list) topRankUsers[list[1].uid] = 2;
        if (list) topRankUsers[list[2].uid] = 3;
    }).catch(e => console.error("랭킹 캐시 에러:", e));
}

window.toggleChatView = function(show) {
    const chatView = document.getElementById('chat-view');
    if (show) {
        chatView.classList.remove('chat-overlay-hidden');
        window.loadMyProfile(); 
        updateTopRanks();
        const msgDiv = document.getElementById('chat-messages');
        msgDiv.scrollTop = msgDiv.scrollHeight;
    } else {
        chatView.classList.add('chat-overlay-hidden');
    }
}

// 👤 내 프로필 불러오기
window.loadMyProfile = function() {
    activeViewingUid = currentUser ? currentUser.uid : null;
    
    document.getElementById('prof-name').textContent = state.playerName || 'Digger';
    document.getElementById('prof-name').style.color = '#fff';
    document.getElementById('prof-level').textContent = state.playerLevel || 1;
    
    const userPhoto = (currentUser && currentUser.photoURL) ? currentUser.photoURL : (state.profilePic || 'images/ms.png');
    const profImgEl = document.getElementById('chat-profile-img');
    if (profImgEl) profImgEl.src = userPhoto;

    const reqExp = BALANCES.getRequiredExp(state.playerLevel || 1);
    const exp = state.playerExp || 0;
    let percent = ((exp / reqExp) * 100).toFixed(1);
    if (percent > 100) percent = 100;

    const profExp = document.getElementById('prof-current-exp');
    const profMaxExp = document.getElementById('prof-max-exp');
    const profExpFill = document.getElementById('prof-exp-fill');
    if (profExp) profExp.textContent = Math.floor(exp).toLocaleString();
    if (profMaxExp) profMaxExp.textContent = reqExp.toLocaleString();
    if (profExpFill) profExpFill.style.width = `${percent}%`;

    const pickaxeName = BALANCES.PICKAXES[(state.pickaxeTier || 1) - 1].name;
    document.getElementById('prof-pickaxe').textContent = `${pickaxeName} (Tier ${state.pickaxeTier || 1})`;
    
    document.getElementById('prof-reset-btn').classList.add('hidden');
}

// 🔍 다른 사람 프로필 불러오기
window.loadUserProfile = async function(uid, fallbackName) {
    if (!currentUser || uid === currentUser.uid) {
        window.loadMyProfile();
        return;
    }

    activeViewingUid = uid;

    try {
        const snap = await db.ref(`users/${uid}`).once('value');
        const userData = snap.val();

        if (userData) {
            const name = userData.playerName || (userData.state && userData.state.playerName) || fallbackName;
            const level = userData.playerLevel || (userData.state && userData.state.playerLevel) || 1;
            const exp = userData.playerExp || (userData.state && userData.state.playerExp) || 0;
            const profile = userData.profilePic || (userData.state && userData.state.profilePic) || 'images/ms.png';
            const tier = userData.pickaxeTier || (userData.state && userData.state.pickaxeTier) || 1;
            const pickaxeName = BALANCES.PICKAXES[tier - 1]?.name || '곡괭이';

            const profImgEl = document.getElementById('chat-profile-img');
            if (profImgEl) profImgEl.src = profile;

            document.getElementById('prof-name').textContent = name;
            document.getElementById('prof-name').style.color = 'var(--primary)';
            document.getElementById('prof-level').textContent = level;

            const reqExp = BALANCES.getRequiredExp(level);
            let percent = ((exp / reqExp) * 100).toFixed(1);
            if (percent > 100) percent = 100;

            const profExp = document.getElementById('prof-current-exp');
            const profMaxExp = document.getElementById('prof-max-exp');
            const profExpFill = document.getElementById('prof-exp-fill');
            if (profExp) profExp.textContent = Math.floor(exp).toLocaleString();
            if (profMaxExp) profMaxExp.textContent = reqExp.toLocaleString();
            if (profExpFill) profExpFill.style.width = `${percent}%`;

            document.getElementById('prof-pickaxe').textContent = `${pickaxeName} (Tier ${tier})`;
            document.getElementById('prof-reset-btn').classList.remove('hidden');

            const profileContent = document.getElementById('chat-profile-content');
            if (profileContent && profileContent.classList.contains('collapsed')) {
                profileContent.classList.remove('collapsed');
                const profileToggleIcon = document.getElementById('profile-toggle-icon');
                if (profileToggleIcon) profileToggleIcon.textContent = '▲';
            }
        }
    } catch (e) {
        console.error("프로필 조회 실패:", e);
    }
}

window.sendChatMessage = function() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if(!text || !currentUser) return;

    const msgData = {
        uid: currentUser.uid,
        name: state.playerName || 'Digger',
        level: state.playerLevel || 1,
        text: text,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    db.ref('chats').push(msgData);
    input.value = '';
}

export function initChatSystem(user) {
    updateTopRanks();

    const myConnectionsRef = db.ref(`presence/${user.uid}`);
    const connectedRef = db.ref('.info/connected');

    connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
            const con = myConnectionsRef.push();
            con.onDisconnect().remove();
            con.set(true);
        }
    });

    db.ref('presence').on('value', (snap) => {
        const countEl = document.getElementById('online-count');
        if(countEl) countEl.textContent = snap.numChildren();
    });

    db.ref('chats').orderByChild('timestamp').limitToLast(50).on('child_added', (snap) => {
        const msg = snap.val();
        const msgDiv = document.getElementById('chat-messages');
        const isMe = msg.uid === user.uid;
        
        const rank = topRankUsers[msg.uid];
        let rankBadgeHTML = '';
        let rankClass = '';
        
        if (rank === 1) {
            rankBadgeHTML = '<span class="chat-rank-badge rank-1">🥇 1위</span>';
            rankClass = 'rank-1-msg';
        } else if (rank === 2) {
            rankBadgeHTML = '<span class="chat-rank-badge rank-2">🥈 2위</span>';
            rankClass = 'rank-2-msg';
        } else if (rank === 3) {
            rankBadgeHTML = '<span class="chat-rank-badge rank-3">🥉 3위</span>';
            rankClass = 'rank-3-msg';
        }

        const div = document.createElement('div');
        div.className = `chat-msg ${isMe ? 'my-msg' : 'other-msg'} ${rankClass}`;
        div.onclick = () => window.loadUserProfile(msg.uid, msg.name);
        
        const userLive = liveUsers[msg.uid];
        const lv = userLive ? (userLive.playerLevel || (userLive.state && userLive.state.playerLevel) || msg.level || 1) : (msg.level || 1);

        div.innerHTML = `
            <div class="chat-sender-header" style="display:flex; align-items:center; gap:5px; margin-bottom:4px;">
                ${rankBadgeHTML}
                <span class="lv-badge" style="font-size:0.65rem; padding:1px 5px;">Lv.${lv}</span>
                <b style="font-size:0.8rem; margin:0;">${msg.name}</b>
            </div>
            <span class="chat-text" style="font-size:0.9rem; line-height:1.3;">${msg.text}</span>
        `;
        msgDiv.appendChild(div);

        const previewEl = document.getElementById('mini-chat-preview');
        if(previewEl) previewEl.innerHTML = `<span style="color:var(--primary)">[Lv.${lv}] ${msg.name}:</span> ${msg.text}`;

        msgDiv.scrollTop = msgDiv.scrollHeight;
    });
}