import { db, currentUser } from '../api/firebase.js';
import { state } from '../core/state.js';
import { BALANCES } from '../../config.js'; // 곡괭이 이름을 가져오기 위해 추가

// 1. 화면 토글 (바텀 시트 애니메이션)
// chat.js 내부의 토글 함수가 이렇게 생겼는지 확인!
window.toggleChatView = function(show) {
    const chatView = document.getElementById('chat-view');
    if (show) {
        chatView.classList.remove('chat-overlay-hidden');
        window.loadMyProfile(); 
        const msgDiv = document.getElementById('chat-messages');
        msgDiv.scrollTop = msgDiv.scrollHeight;
    } else {
        // 닫을 때는 이 부분이 실행됩니다!
        chatView.classList.add('chat-overlay-hidden');
    }
}

// 2. 내 프로필 화면에 표시하기
window.loadMyProfile = function() {
    document.getElementById('prof-name').textContent = state.playerName || 'Digger';
    document.getElementById('prof-name').style.color = '#fff';
    document.getElementById('prof-level').textContent = state.playerLevel || 1;
    
    const pickaxeName = BALANCES.PICKAXES[(state.pickaxeTier || 1) - 1].name;
    document.getElementById('prof-pickaxe').textContent = `${pickaxeName} (Tier ${state.pickaxeTier || 1})`;
    
    document.getElementById('prof-reset-btn').classList.add('hidden'); // 돌아가기 버튼 숨김
}

// 3. 다른 사람 프로필 불러오기 (Firebase 조회)
window.loadUserProfile = async function(uid, fallbackName) {
    if (uid === currentUser.uid) {
        window.loadMyProfile();
        return;
    }

    try {
        const snap = await db.ref(`users/${uid}`).once('value');
        const userData = snap.val();

        if (userData) {
            document.getElementById('prof-name').textContent = userData.playerName || fallbackName;
            document.getElementById('prof-name').style.color = 'var(--primary)'; // 남의 프로필은 색상 변경
            document.getElementById('prof-level').textContent = userData.playerLevel || 1;
            
            const pickaxeName = BALANCES.PICKAXES[(userData.pickaxeTier || 1) - 1].name;
            document.getElementById('prof-pickaxe').textContent = `${pickaxeName} (Tier ${userData.pickaxeTier || 1})`;
            
            document.getElementById('prof-reset-btn').classList.remove('hidden'); // 돌아가기 버튼 표시
        }
    } catch (e) {
        console.error("프로필 조회 실패:", e);
    }
}

// 4. 채팅 전송
window.sendChatMessage = function() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if(!text || !currentUser) return;

    const msgData = {
        uid: currentUser.uid,
        name: state.playerName || 'Digger',
        text: text,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    db.ref('chats').push(msgData);
    input.value = '';
}

// 5. Firebase 채팅 리스너 초기화
export function initChatSystem(user) {
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
        
        const div = document.createElement('div');
        div.className = `chat-msg ${isMe ? 'my-msg' : 'other-msg'}`;
        
        // 👇 채팅 풍선을 클릭하면 프로필을 불러오도록 onclick 추가
        div.onclick = () => window.loadUserProfile(msg.uid, msg.name);
        
        div.innerHTML = `<b>${msg.name}</b> <span>${msg.text}</span>`;
        msgDiv.appendChild(div);

        const previewEl = document.getElementById('mini-chat-preview');
        if(previewEl) previewEl.innerHTML = `<span style="color:var(--primary)">${msg.name}:</span> ${msg.text}`;

        msgDiv.scrollTop = msgDiv.scrollHeight;
    });
}