import { CATEGORY_CONFIG, DIFFICULTY_LABELS } from './data.ts';
import { byId } from './dom.ts';
import {
    ONI_PENALTY_SECONDS,
    ONI_TIME_LIMIT,
    TOTAL_QUESTIONS,
    buildInitialOniItems,
    buildStandardItems,
    computeRemainingSeconds,
    findMatchingTarget,
    pickNextOniItem
} from './game-logic.ts';
import { shuffleInPlace } from './random.ts';
import { createProgressStore, safeLocalStorage } from './storage.ts';
import type { BiomeCard, Category, Difficulty } from './types.ts';

interface GameState {
    category: Category;
    difficulty: Difficulty;
    score: number;
    selectedItemId: string | null;
    items: BiomeCard[];
    nextItemUid: number;
    timeLeft: number;
    oniEndTime: number;
    isPlaying: boolean;
    justUnlockedOni: boolean;
    timerInterval: ReturnType<typeof setInterval> | null;
    toastTimeout: ReturnType<typeof setTimeout> | null;
    returnTimeout: ReturnType<typeof setTimeout> | null;
}

const progress = createProgressStore(safeLocalStorage());

const state: GameState = {
    category: 'plant',
    difficulty: 'easy',
    score: 0,
    selectedItemId: null,
    items: [],
    nextItemUid: 0,
    timeLeft: ONI_TIME_LIMIT,
    oniEndTime: 0,
    isPlaying: false,
    justUnlockedOni: false,
    timerInterval: null,
    toastTimeout: null,
    returnTimeout: null
};

const els = {
    homeScreen: byId('home-screen'),
    gameScreen: byId('game-screen'),
    homeDesc: byId('home-desc'),
    ruleOniItem: byId('rule-oni-item'),
    ruleOniText: byId('rule-oni-text'),
    btnOni: byId<HTMLButtonElement>('btn-oni'),
    tabScoreBiome: byId('tab-score-biome'),
    tabScorePlant: byId('tab-score-plant'),
    categoryTabs: document.querySelectorAll<HTMLButtonElement>('.category-tab'),
    modeButtons: document.querySelectorAll<HTMLButtonElement>('.mode-btn'),
    homeBtn: byId<HTMLButtonElement>('home-btn'),
    modeDisplay: byId('mode-display'),
    trayTitleText: byId('tray-title-text'),
    trayHint: byId('tray-hint'),
    progressContainer: byId('progress-container'),
    timerBadge: byId('timer-badge'),
    timerText: byId('timer-text'),
    scoreText: byId('score-text'),
    progressFill: byId('progress-fill'),
    graphWrapper: byId('graph-wrapper'),
    dropZone: byId('drop-zone'),
    cardList: byId('card-list'),
    toast: byId('toast'),
    clearOverlay: byId('clear-overlay'),
    clearTitle: byId('clear-title'),
    clearSubtitle: byId('clear-subtitle'),
    clearActions: byId('clear-actions'),
    autoReturnText: byId('auto-return-text'),
    retryBtn: byId<HTMLButtonElement>('retry-btn'),
    overlayHomeBtn: byId<HTMLButtonElement>('overlay-home-btn')
};

function init(): void {
    els.categoryTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const cat = tab.dataset['category'];
            if (cat === 'biome' || cat === 'plant') {
                setCategory(cat);
            }
        });
    });

    els.modeButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const diff = btn.dataset['difficulty'];
            if (diff === 'easy' || diff === 'normal' || diff === 'oni') {
                startGame(diff);
            }
        });
    });

    els.homeBtn.addEventListener('click', resetToHome);
    els.overlayHomeBtn.addEventListener('click', resetToHome);
    els.retryBtn.addEventListener('click', () => {
        els.clearOverlay.classList.remove('active');
        startGame(state.difficulty);
    });

    let isMuted = false;
    let muteClickTimes: number[] = [];
    const homeMuteBtn = document.getElementById('home-mute-btn');
    if (homeMuteBtn) {
        homeMuteBtn.addEventListener('click', () => {
            isMuted = !isMuted;
            homeMuteBtn.textContent = isMuted ? '🔇 音OFF' : '🔊 音ON';
            const now = Date.now();
            muteClickTimes = muteClickTimes.filter((t) => now - t <= 3000);
            muteClickTimes.push(now);
            if (muteClickTimes.length >= 6) {
                muteClickTimes = [];
                (['biome', 'plant'] as const).forEach((cat) => progress.unlockOni(cat));
                updateDifficultyVisibility(true);
                showToast('👹 どこかでとびらがひらいたようだ…！');
            }
        });
    }

    els.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'move';
        }
    });

    els.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        handlePlacementAttempt(e.clientX, e.clientY);
    });

    els.dropZone.addEventListener('click', (e) => {
        handlePlacementAttempt(e.clientX, e.clientY);
    });

    document.addEventListener('keydown', handleGlobalKeydown);

    setCategory('biome');
    updateTabScores();
}

function updateTabScores(): void {
    const entries: ReadonlyArray<{ category: Category; el: HTMLElement }> = [
        { category: 'biome', el: els.tabScoreBiome },
        { category: 'plant', el: els.tabScorePlant }
    ];
    entries.forEach(({ category, el }) => {
        const saved = progress.getOniBest(category);
        if (saved !== null) {
            el.textContent = `👹 ${saved}問`;
            el.hidden = false;
        } else {
            el.hidden = true;
        }
    });
}

function updateDifficultyVisibility(animateReveal = false): void {
    const oniVisible = progress.isOniUnlocked(state.category);
    els.ruleOniItem.hidden = !oniVisible;
    els.btnOni.hidden = !oniVisible;
    els.btnOni.classList.toggle('just-unlocked', oniVisible && animateReveal);
}

function setCategory(category: Category): void {
    state.category = category;
    const config = CATEGORY_CONFIG[category];

    els.categoryTabs.forEach((tab) => {
        const isActive = tab.dataset['category'] === category;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
    });

    els.homeDesc.textContent = config.description;
    els.ruleOniText.innerHTML = config.oniRule;
    updateDifficultyVisibility();
}

function startGame(difficulty: Difficulty): void {
    stopTimers();
    state.difficulty = difficulty;
    state.score = 0;
    state.selectedItemId = null;
    state.nextItemUid = 0;
    state.timeLeft = ONI_TIME_LIMIT;
    state.isPlaying = true;

    els.dropZone.innerHTML = '';

    const isOni = difficulty === 'oni';
    els.graphWrapper.classList.toggle('hide-labels', state.category === 'biome' || isOni);
    els.progressContainer.classList.toggle('oni-active', isOni);
    els.timerBadge.hidden = !isOni;
    els.timerBadge.classList.remove('urgent', 'penalty-flash');
    els.progressFill.classList.toggle('timer-fill', isOni);
    els.progressFill.classList.remove('urgent');

    if (isOni) {
        const built = buildInitialOniItems(state.category, state.nextItemUid);
        state.items = built.items;
        state.nextItemUid = built.nextUid;
        els.trayHint.textContent = '👆1・2・3キーでも選択';
        updateOniHud();
        startOniTimer();
    } else {
        const built = buildStandardItems(state.category, difficulty, state.nextItemUid);
        state.items = shuffleInPlace(built.items);
        state.nextItemUid = built.nextUid;
        els.trayHint.textContent = '👆カードを選んで図をクリック';
        updateStandardProgress();
    }

    const categoryConfig = CATEGORY_CONFIG[state.category];
    els.modeDisplay.textContent = `${categoryConfig.label} / ${DIFFICULTY_LABELS[difficulty]}`;
    els.trayTitleText.textContent = categoryConfig.trayTitle;

    els.homeScreen.classList.remove('active');
    els.gameScreen.classList.add('active');

    showToast(isOni ? categoryConfig.oniToast : categoryConfig.startToast);
    renderCards();
}

function startOniTimer(): void {
    state.oniEndTime = Date.now() + ONI_TIME_LIMIT * 1000;

    state.timerInterval = setInterval(() => {
        const now = Date.now();
        const remainingMs = Math.max(0, state.oniEndTime - now);
        state.timeLeft = computeRemainingSeconds(state.oniEndTime, now);
        updateOniHud(remainingMs);

        if (remainingMs <= 0) {
            stopTimers();
            handleOniTimeUp();
        }
    }, 100);
}

function applyOniTimePenalty(): boolean {
    state.oniEndTime -= ONI_PENALTY_SECONDS * 1000;
    const now = Date.now();
    const remainingMs = Math.max(0, state.oniEndTime - now);
    state.timeLeft = computeRemainingSeconds(state.oniEndTime, now);
    updateOniHud(remainingMs);

    els.timerBadge.classList.add('penalty-flash');
    setTimeout(() => {
        els.timerBadge.classList.remove('penalty-flash');
    }, 350);

    if (remainingMs <= 0) {
        stopTimers();
        handleOniTimeUp();
        return true;
    }
    return false;
}

function updateOniHud(remainingMs = state.timeLeft * 1000): void {
    els.timerText.textContent = String(state.timeLeft);
    els.scoreText.textContent = `🏆 ${state.score}問`;

    const percent = Math.min(100, (remainingMs / (ONI_TIME_LIMIT * 1000)) * 100);
    els.progressFill.style.width = `${percent}%`;

    const isUrgent = state.timeLeft <= 10;
    els.timerBadge.classList.toggle('urgent', isUrgent);
    els.progressFill.classList.toggle('urgent', isUrgent);
}

function updateStandardProgress(): void {
    els.scoreText.innerHTML = `<span id="score">${state.score}</span>/<span id="total-questions">${TOTAL_QUESTIONS}</span>`;
    const percent = (state.score / TOTAL_QUESTIONS) * 100;
    els.progressFill.style.width = `${percent}%`;
}

function renderCards(): void {
    const focusedEl = document.activeElement;
    const hadFocusInList = Boolean(focusedEl && els.cardList.contains(focusedEl));
    const focusedItemId = hadFocusInList && focusedEl instanceof HTMLElement ? focusedEl.dataset['itemId'] : null;

    els.cardList.innerHTML = '';

    const isOni = state.difficulty === 'oni';
    const visibleItems = isOni
        ? state.items
        : state.items.filter((item) => !document.getElementById(`placed-${item.id}`));

    const isAdvanced = state.difficulty === 'normal' || isOni;
    els.cardList.classList.toggle('oni-choices', isOni);

    visibleItems.forEach((item, index) => {
        const card = document.createElement('div');
        const isSelected = state.selectedItemId === item.id;
        card.className = `bio-card${isSelected ? ' selected' : ''}${isAdvanced ? ' advanced-card' : ''}`;
        card.draggable = true;
        card.tabIndex = 0;
        card.dataset['itemId'] = item.id;
        card.setAttribute('role', 'listitem');
        card.setAttribute('aria-pressed', String(isSelected));

        if (isAdvanced) {
            card.innerHTML = `<div class="info"><div class="name">${item.name}</div></div>`;
        } else {
            const hintHtml = state.difficulty === 'easy' ? `<div class="hint">${item.hint}</div>` : '';
            card.innerHTML = `
                <div class="emoji" style="background-color: ${item.bg}; border: 2px solid ${item.color};">${item.emoji}</div>
                <div class="info">
                    <div class="name">${item.name}</div>
                    ${hintHtml}
                </div>
            `;
        }

        if (isOni && index < 9) {
            card.insertAdjacentHTML('afterbegin', `<span class="key-badge" aria-hidden="true">${index + 1}</span>`);
            card.setAttribute('aria-keyshortcuts', String(index + 1));
        }

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });

        card.addEventListener('click', () => {
            if (!state.isPlaying) return;
            state.selectedItemId = isSelected ? null : item.id;
            renderCards();
        });

        card.addEventListener('dragstart', (e) => {
            if (!state.isPlaying) return;
            state.selectedItemId = item.id;
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
            }
            setTimeout(renderCards, 0);
        });

        els.cardList.appendChild(card);
    });

    if (hadFocusInList) {
        const sameCard = focusedItemId
            ? els.cardList.querySelector<HTMLElement>(`[data-item-id="${focusedItemId}"]`)
            : null;
        const fallback = sameCard ?? els.cardList.querySelector<HTMLElement>('.bio-card');
        fallback?.focus({ preventScroll: true });
    }
}

function handleGlobalKeydown(e: KeyboardEvent): void {
    if (!els.gameScreen.classList.contains('active') || !state.isPlaying) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (state.difficulty === 'oni' && /^[1-9]$/.test(e.key)) {
        const cards = els.cardList.querySelectorAll<HTMLElement>('.bio-card');
        const target = cards[Number(e.key) - 1];
        if (target) {
            e.preventDefault();
            target.click();
        }
        return;
    }

    if (e.key === 'Escape' && state.selectedItemId) {
        e.preventDefault();
        state.selectedItemId = null;
        renderCards();
    }
}

function handlePlacementAttempt(clientX: number, clientY: number): void {
    if (!state.isPlaying || !state.selectedItemId) return;

    const rect = els.dropZone.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * 100;
    const py = ((clientY - rect.top) / rect.height) * 100;

    const itemIndex = state.items.findIndex((entry) => entry.id === state.selectedItemId);
    if (itemIndex === -1) return;
    const item = state.items[itemIndex];
    if (!item) return;

    const matchedTarget = findMatchingTarget(item.targets, px, py);

    if (matchedTarget) {
        state.score++;
        placePinOnGraph(item, matchedTarget.x, matchedTarget.y);

        if (state.difficulty === 'oni') {
            const replacement = pickNextOniItem(state.items, state.category, state.nextItemUid++);
            state.items.splice(itemIndex, 1, replacement);
            updateOniHud();
            showToast(`⭕ 正解！ ${item.name}`);
            state.selectedItemId = null;
            renderCards();
        } else {
            updateStandardProgress();
            if (state.score === TOTAL_QUESTIONS) {
                handleGameClear();
            } else {
                showToast(`⭕ 正解！ ${item.name}`);
                state.selectedItemId = null;
                renderCards();
            }
        }
    } else {
        state.selectedItemId = null;
        renderCards();
        if (state.difficulty === 'oni') {
            showToast(`❌ ミス！ -${ONI_PENALTY_SECONDS}秒`);
            applyOniTimePenalty();
        } else {
            showToast('❌ うーん、違うみたい...');
        }
    }
}

function placePinOnGraph(item: BiomeCard, x: number, y: number): void {
    const pin = document.createElement('div');
    pin.id = `placed-${item.id}`;
    pin.className = 'placed-plant';
    pin.style.left = `${x}%`;
    pin.style.top = `${y}%`;

    const isAdvanced = state.difficulty === 'normal' || state.difficulty === 'oni';
    if (isAdvanced) {
        pin.innerHTML = `<div class="pin-label advanced-label">${item.name}</div>`;
    } else {
        pin.innerHTML = `
            <div class="pin-emoji" style="background-color: ${item.bg}; border: 3px solid ${item.color};">${item.emoji}</div>
            <div class="pin-label" style="border-color: ${item.color}; color: ${item.color};">${item.name}</div>
        `;
    }

    els.dropZone.appendChild(pin);

    if (state.difficulty === 'oni') {
        setTimeout(() => pin.classList.add('fade-out'), 900);
        setTimeout(() => pin.remove(), 1300);
    }
}

function showToast(msg: string): void {
    els.toast.innerHTML = msg;

    if (msg.includes('⭕')) {
        els.toast.style.backgroundColor = 'rgba(16, 185, 129, 0.95)';
    } else if (msg.includes('❌')) {
        els.toast.style.backgroundColor = 'rgba(239, 68, 68, 0.95)';
    } else {
        els.toast.style.backgroundColor = 'rgba(51, 65, 85, 0.95)';
    }

    els.toast.classList.add('show');
    if (state.toastTimeout !== null) {
        clearTimeout(state.toastTimeout);
    }
    state.toastTimeout = setTimeout(() => {
        els.toast.classList.remove('show');
    }, state.difficulty === 'oni' ? 900 : 1800);
}

function handleGameClear(): void {
    state.isPlaying = false;
    let displayTime = 3500;
    let unlockHtml = '';

    if (state.difficulty === 'normal' && !progress.isOniUnlocked(state.category)) {
        progress.unlockOni(state.category);
        state.justUnlockedOni = true;
        unlockHtml = '<div class="unlock-message">どこかでとびらがひらいたようだ…！</div>';
        displayTime = 4800;
    }

    els.clearTitle.innerHTML = '🎊 素晴らしい！ 🎊';
    els.clearTitle.style.color = 'var(--primary)';
    els.clearTitle.style.textShadow = '0 4px 10px rgba(16, 185, 129, 0.2)';
    els.clearSubtitle.innerHTML = `すべてのバイオームをマスターしました！${unlockHtml}`;
    els.clearActions.hidden = true;
    els.autoReturnText.hidden = false;

    createConfetti();
    els.clearOverlay.classList.add('active');

    if (state.returnTimeout !== null) {
        clearTimeout(state.returnTimeout);
    }
    state.returnTimeout = setTimeout(resetToHome, displayTime);
}

function handleOniTimeUp(): void {
    state.isPlaying = false;
    state.selectedItemId = null;

    const prevBest = progress.getOniBest(state.category) ?? -1;
    const isNewRecord = state.score > prevBest;
    const bestScore = isNewRecord ? state.score : prevBest;

    if (isNewRecord) {
        progress.setOniBest(state.category, bestScore);
    }
    updateTabScores();

    const recordBadge = isNewRecord
        ? '<br><span class="record-badge">🎉 NEW RECORD!</span>'
        : '';

    els.clearTitle.innerHTML = '⏱️ タイムアップ！';
    els.clearTitle.style.color = '#0F172A';
    els.clearTitle.style.textShadow = 'none';
    els.clearSubtitle.innerHTML = `
        <div style="font-size: 46px; font-weight: 900; color: var(--primary); line-height: 1.15; margin-bottom: 8px;">${state.score}<span style="font-size: 24px; margin-left: 4px;">問正解！</span></div>
        <div style="font-size: 18px;">ベスト記録：<b>${bestScore} 問</b></div>${recordBadge}
    `;
    els.clearActions.hidden = false;
    els.autoReturnText.hidden = true;

    if (state.score > 0) {
        createConfetti();
    }
    els.clearOverlay.classList.add('active');
}

function createConfetti(): void {
    const colors = ['#10B981', '#34D399', '#F59E0B', '#3B82F6', '#8B5CF6'];
    const shapes = ['50%', '0%'];

    document.querySelectorAll('.confetti-piece').forEach((el) => el.remove());

    for (let i = 0; i < 80; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti-piece');

        confetti.style.left = `${Math.random() * 100}vw`;
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)] ?? '#10B981';
        confetti.style.borderRadius = shapes[Math.floor(Math.random() * shapes.length)] ?? '0%';

        const size = Math.random() * 8 + 6;
        confetti.style.width = `${size}px`;
        confetti.style.height = `${size}px`;

        const duration = Math.random() * 3 + 2;
        const delay = Math.random() * 1.5;
        confetti.style.animation = `confettiFall ${duration}s linear ${delay}s forwards`;

        els.clearOverlay.appendChild(confetti);
    }
}

function stopTimers(): void {
    if (state.timerInterval !== null) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
    if (state.returnTimeout !== null) {
        clearTimeout(state.returnTimeout);
        state.returnTimeout = null;
    }
}

function resetToHome(): void {
    stopTimers();
    state.isPlaying = false;
    els.clearOverlay.classList.remove('active');
    els.dropZone.innerHTML = '';
    els.cardList.innerHTML = '';
    state.score = 0;
    state.selectedItemId = null;

    els.gameScreen.classList.remove('active');
    els.homeScreen.classList.add('active');
    updateDifficultyVisibility(state.justUnlockedOni);
    updateTabScores();
    state.justUnlockedOni = false;
}

init();
