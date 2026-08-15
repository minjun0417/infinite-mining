import { BALANCES } from '../../config.js';

export const SVG_GEN = {
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

export const FX = {
    // 변경: 파라미터로 oreColor를 받도록 수정했습니다.
    createSparks(x, y, oreColor) {
        const container = document.getElementById('particle-layer');
        for (let i = 0; i < 8; i++) {
            const p = document.createElement('div');
            p.className = 'particle'; 
            p.style.left = `${x}px`; p.style.top = `${y}px`; 
            p.style.backgroundColor = oreColor; // 변경: 파라미터로 받은 색상 사용
            p.style.setProperty('--tx', `${(Math.random() - 0.5) * 200}px`); p.style.setProperty('--ty', `${(Math.random() - 0.5) * 200}px`);
            container.appendChild(p); setTimeout(() => p.remove(), 600);
        }
    },
    createFloatingText(x, y, text, type = 'standard', duration = 800) {
        const el = document.createElement('div');
        el.className = `floating-text ${type}-text`; 
        el.textContent = text; 
        el.style.left = `${x}px`; 
        el.style.top = `${y}px`;
        
        // 새로 추가할 resource 타입일 경우 애니메이션과 시간 강제 할당
        if(type === 'resource') {
            el.style.animation = 'floatSlow 1.5s ease-out forwards';
            duration = 1500;
        }

        document.body.appendChild(el); 
        setTimeout(() => el.remove(), duration);
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

export function confetti() { 
    const colors = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6']; 
    for(let i=0; i<50; i++) {
        const p=document.createElement('div');
        p.className='particle';
        p.style.left=`${window.innerWidth/2}px`;
        p.style.top=`${window.innerHeight/2}px`;
        p.style.backgroundColor=colors[Math.floor(Math.random()*colors.length)];
        p.style.zIndex='200';
        p.style.setProperty('--tx',`${(Math.random()-0.5)*800}px`);
        p.style.setProperty('--ty',`${(Math.random()-0.5)*800}px`);
        document.body.appendChild(p);
        setTimeout(()=>p.remove(),1000);
    } 
}