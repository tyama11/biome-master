(() => {
    'use strict';

    const TOTAL_QUESTIONS = BIOME_DATA.length;
    const ONI_TIME_LIMIT = 60; // 秒
    const ONI_TRAY_SIZE = 6;   // おにモードでトレイに常時並べるカード枚数

    // ======== ゲーム状態 ========
    const state = {
        category: 'plant',      // 'plant' | 'biome'
        difficulty: 'easy',     // 'easy' | 'normal' | 'hard' | 'oni'
        score: 0,
        selectedItemId: null,
        items: [],
        nextItemUid: 0,
        timeLeft: ONI_TIME_LIMIT,
        isPlaying: false,
        justUnlockedOni: false,
        timerInterval: null,
        toastTimeout: null,
        returnTimeout: null
    };

    // ======== DOM参照 ========
    const els = {
        homeScreen: document.getElementById('home-screen'),
        gameScreen: document.getElementById('game-screen'),
        homeDesc: document.getElementById('home-desc'),
        ruleNormalItem: document.getElementById('rule-normal-item'),
        ruleOniItem: document.getElementById('rule-oni-item'),
        ruleOniText: document.getElementById('rule-oni-text'),
        btnNormal: document.getElementById('btn-normal'),
        btnOni: document.getElementById('btn-oni'),
        categoryTabs: document.querySelectorAll('.category-tab'),
        modeButtons: document.querySelectorAll('.mode-btn'),
        homeBtn: document.getElementById('home-btn'),
        modeDisplay: document.getElementById('mode-display'),
        trayTitleText: document.getElementById('tray-title-text'),
        progressContainer: document.getElementById('progress-container'),
        timerBadge: document.getElementById('timer-badge'),
        timerText: document.getElementById('timer-text'),
        scoreText: document.getElementById('score-text'),
        progressFill: document.getElementById('progress-fill'),
        graphWrapper: document.getElementById('graph-wrapper'),
        dropZone: document.getElementById('drop-zone'),
        cardList: document.getElementById('card-list'),
        toast: document.getElementById('toast'),
        clearOverlay: document.getElementById('clear-overlay'),
        clearTitle: document.getElementById('clear-title'),
        clearSubtitle: document.getElementById('clear-subtitle'),
        clearActions: document.getElementById('clear-actions'),
        autoReturnText: document.getElementById('auto-return-text'),
        retryBtn: document.getElementById('retry-btn'),
        overlayHomeBtn: document.getElementById('overlay-home-btn')
    };

    // ======== 初期化 ========
    function init() {
        els.categoryTabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                setCategory(tab.dataset.category);
            });
        });

        els.modeButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                startGame(btn.dataset.difficulty);
            });
        });

        els.homeBtn.addEventListener('click', resetToHome);
        els.overlayHomeBtn.addEventListener('click', resetToHome);
        els.retryBtn.addEventListener('click', () => {
            els.clearOverlay.classList.remove('active');
            startGame(state.difficulty);
        });

        els.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        els.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            handlePlacementAttempt(e.clientX, e.clientY);
        });

        els.dropZone.addEventListener('click', (e) => {
            handlePlacementAttempt(e.clientX, e.clientY);
        });

        setCategory('biome');
    }

    // ======== 学習カテゴリ切替＆難易度表示制御 ========
    function getOniUnlockKey(category) {
        return `biome-master-oni-unlocked-${category}`;
    }

    function isOniUnlocked(category) {
        return category === 'plant' && localStorage.getItem(getOniUnlockKey(category)) === 'true';
    }

    function updateDifficultyVisibility(animateReveal = false) {
        const isPlant = state.category === 'plant';
        els.ruleNormalItem.hidden = !isPlant;
        els.btnNormal.hidden = !isPlant;

        const oniVisible = isOniUnlocked(state.category);
        els.ruleOniItem.hidden = !oniVisible;
        els.btnOni.hidden = !oniVisible;
        els.btnOni.classList.toggle('just-unlocked', oniVisible && animateReveal);
    }

    function setCategory(category) {
        state.category = category;
        const config = CATEGORY_CONFIG[category];

        els.categoryTabs.forEach((tab) => {
            const isActive = tab.dataset.category === category;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', String(isActive));
        });

        els.homeDesc.textContent = config.description;
        els.ruleOniText.innerHTML = config.oniRule;
        updateDifficultyVisibility();
    }

    // ======== ゲーム開始 ========
    function startGame(difficulty) {
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
        els.timerBadge.classList.remove('urgent');
        els.progressFill.classList.toggle('timer-fill', isOni);
        els.progressFill.classList.remove('urgent');

        if (isOni) {
            state.items = buildInitialOniItems();
            updateOniHud();
            startOniTimer();
        } else {
            state.items = buildStandardItems(state.category, difficulty);
            shuffleArray(state.items);
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

    // ======== 問題生成 ========
    function createItemFromBiome(biome, category, difficulty) {
        const uid = `item-${state.nextItemUid++}`;

        if (category === 'biome') {
            return {
                id: uid,
                biomeId: biome.id,
                name: biome.biomeName,
                emoji: biome.biomeEmoji,
                color: biome.color,
                bg: biome.bg,
                hint: biome.hint,
                targets: biome.targets
            };
        }

        const plantList = (difficulty === 'oni') ? biome.oni : biome.base;
        const plantDef = plantList[Math.floor(Math.random() * plantList.length)];
        return {
            id: uid,
            biomeId: biome.id,
            name: plantDef.name,
            emoji: plantDef.emoji,
            color: plantDef.color,
            bg: plantDef.bg,
            hint: biome.hint,
            targets: biome.targets
        };
    }

    function buildStandardItems(category, difficulty) {
        return BIOME_DATA.map((biome) => createItemFromBiome(biome, category, difficulty));
    }

    function buildInitialOniItems() {
        const pool = [...BIOME_DATA];
        shuffleArray(pool);
        return pool.slice(0, ONI_TRAY_SIZE).map((biome) =>
            createItemFromBiome(biome, state.category, 'oni')
        );
    }

    function pickNextOniItem() {
        const activeBiomeIds = new Set(state.items.map((item) => item.biomeId));
        const candidates = BIOME_DATA.filter((biome) => !activeBiomeIds.has(biome.id));
        const source = candidates.length > 0 ? candidates : BIOME_DATA;
        const chosen = source[Math.floor(Math.random() * source.length)];
        return createItemFromBiome(chosen, state.category, 'oni');
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // ======== おにモード タイマー ========
    function startOniTimer() {
        const endTime = Date.now() + ONI_TIME_LIMIT * 1000;

        state.timerInterval = setInterval(() => {
            const remainingMs = Math.max(0, endTime - Date.now());
            state.timeLeft = Math.ceil(remainingMs / 1000);
            updateOniHud(remainingMs);

            if (remainingMs <= 0) {
                stopTimers();
                handleOniTimeUp();
            }
        }, 100);
    }

    function updateOniHud(remainingMs = state.timeLeft * 1000) {
        els.timerText.textContent = state.timeLeft;
        els.scoreText.textContent = `🏆 ${state.score}問`;

        const percent = (remainingMs / (ONI_TIME_LIMIT * 1000)) * 100;
        els.progressFill.style.width = `${percent}%`;

        const isUrgent = state.timeLeft <= 10;
        els.timerBadge.classList.toggle('urgent', isUrgent);
        els.progressFill.classList.toggle('urgent', isUrgent);
    }

    function updateStandardProgress() {
        els.scoreText.innerHTML = `<span id="score">${state.score}</span>/<span id="total-questions">${TOTAL_QUESTIONS}</span>`;
        const percent = (state.score / TOTAL_QUESTIONS) * 100;
        els.progressFill.style.width = `${percent}%`;
    }

    // ======== カード一覧の描画 ========
    function renderCards() {
        els.cardList.innerHTML = '';

        const isOni = state.difficulty === 'oni';
        const visibleItems = isOni
            ? state.items
            : state.items.filter((item) => !document.getElementById(`placed-${item.id}`));

        const isAdvanced = state.difficulty === 'hard' || isOni;

        visibleItems.forEach((item) => {
            const card = document.createElement('div');
            const isSelected = state.selectedItemId === item.id;
            card.className = `bio-card${isSelected ? ' selected' : ''}${isAdvanced ? ' advanced-card' : ''}`;
            card.draggable = true;

            if (isAdvanced) {
                card.innerHTML = `
                    <div class="info">
                        <div class="name">${item.name}</div>
                    </div>
                `;
            } else {
                const hintHtml = (state.difficulty === 'easy')
                    ? `<div class="hint">${item.hint}</div>`
                    : '';
                card.innerHTML = `
                    <div class="emoji" style="background-color: ${item.bg}; border: 2px solid ${item.color};">${item.emoji}</div>
                    <div class="info">
                        <div class="name">${item.name}</div>
                        ${hintHtml}
                    </div>
                `;
            }

            card.addEventListener('click', () => {
                if (!state.isPlaying) return;
                state.selectedItemId = isSelected ? null : item.id;
                renderCards();
            });

            card.addEventListener('dragstart', (e) => {
                if (!state.isPlaying) return;
                state.selectedItemId = item.id;
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(renderCards, 0);
            });

            els.cardList.appendChild(card);
        });
    }

    // ======== 配置判定 ========
    function handlePlacementAttempt(clientX, clientY) {
        if (!state.isPlaying || !state.selectedItemId) return;

        const rect = els.dropZone.getBoundingClientRect();
        const px = ((clientX - rect.left) / rect.width) * 100;
        const py = ((clientY - rect.top) / rect.height) * 100;

        const itemIndex = state.items.findIndex((entry) => entry.id === state.selectedItemId);
        if (itemIndex === -1) return;
        const item = state.items[itemIndex];

        const tolerance = 12;
        const matchedTarget = item.targets.find(
            (target) => Math.abs(px - target.x) < tolerance && Math.abs(py - target.y) < tolerance
        );

        if (matchedTarget) {
            state.score++;
            placePinOnGraph(item, matchedTarget.x, matchedTarget.y);

            if (state.difficulty === 'oni') {
                // 正解したカードをトレイから取り除き、新しい問題を補充（無限出題）
                state.items.splice(itemIndex, 1);
                state.items.push(pickNextOniItem());
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
            showToast('❌ うーん、違うみたい...');
            state.selectedItemId = null;
            renderCards();
        }
    }

    // ======== グラフ上にピンを配置 ========
    function placePinOnGraph(item, x, y) {
        const pin = document.createElement('div');
        pin.id = `placed-${item.id}`;
        pin.className = 'placed-plant';
        pin.style.left = `${x}%`;
        pin.style.top = `${y}%`;

        const isAdvanced = state.difficulty === 'hard' || state.difficulty === 'oni';
        if (isAdvanced) {
            pin.innerHTML = `<div class="pin-label advanced-label">${item.name}</div>`;
        } else {
            pin.innerHTML = `
                <div class="pin-emoji" style="background-color: ${item.bg}; border: 3px solid ${item.color};">${item.emoji}</div>
                <div class="pin-label" style="border-color: ${item.color}; color: ${item.color};">${item.name}</div>
            `;
        }

        els.dropZone.appendChild(pin);

        // おにモードではグラフが埋まらないよう、ピンを一定時間後にフェードアウトして削除
        if (state.difficulty === 'oni') {
            setTimeout(() => pin.classList.add('fade-out'), 900);
            setTimeout(() => pin.remove(), 1300);
        }
    }

    // ======== トースト通知 ========
    function showToast(msg) {
        els.toast.innerHTML = msg;

        if (msg.includes('⭕')) {
            els.toast.style.backgroundColor = 'rgba(16, 185, 129, 0.95)';
        } else if (msg.includes('❌')) {
            els.toast.style.backgroundColor = 'rgba(239, 68, 68, 0.95)';
        } else {
            els.toast.style.backgroundColor = 'rgba(51, 65, 85, 0.95)';
        }

        els.toast.classList.add('show');
        clearTimeout(state.toastTimeout);
        state.toastTimeout = setTimeout(() => {
            els.toast.classList.remove('show');
        }, state.difficulty === 'oni' ? 900 : 1800);
    }

    // ======== クリア＆タイムアップ演出 ========
    function handleGameClear() {
        state.isPlaying = false;
        let displayTime = 3500;
        let unlockHtml = '';

        if (state.category === 'plant' && state.difficulty === 'hard' && !isOniUnlocked(state.category)) {
            localStorage.setItem(getOniUnlockKey(state.category), 'true');
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

        clearTimeout(state.returnTimeout);
        state.returnTimeout = setTimeout(resetToHome, displayTime);
    }

    function handleOniTimeUp() {
        state.isPlaying = false;
        state.selectedItemId = null;

        const storageKey = `biome-master-oni-best-${state.category}`;
        const prevBest = Number(localStorage.getItem(storageKey) || 0);
        const isNewRecord = state.score > prevBest;
        const bestScore = isNewRecord ? state.score : prevBest;

        if (isNewRecord) {
            localStorage.setItem(storageKey, String(bestScore));
        }

        const recordBadge = isNewRecord
            ? '<br><span class="record-badge">🎉 NEW RECORD!</span>'
            : '';

        els.clearTitle.innerHTML = '⏱️ タイムアップ！';
        els.clearTitle.style.color = '#0F172A';
        els.clearTitle.style.textShadow = 'none';
        els.clearSubtitle.innerHTML = `
            <div style="font-size: 28px; color: var(--primary); margin-bottom: 6px;">${state.score} 問正解！</div>
            ベスト記録：${bestScore} 問${recordBadge}
        `;
        els.clearActions.hidden = false;
        els.autoReturnText.hidden = true;

        if (state.score > 0) {
            createConfetti();
        }
        els.clearOverlay.classList.add('active');
    }

    function createConfetti() {
        const colors = ['#10B981', '#34D399', '#F59E0B', '#3B82F6', '#8B5CF6'];
        const shapes = ['50%', '0%'];

        document.querySelectorAll('.confetti-piece').forEach((el) => el.remove());

        for (let i = 0; i < 80; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti-piece');

            confetti.style.left = `${Math.random() * 100}vw`;
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.borderRadius = shapes[Math.floor(Math.random() * shapes.length)];

            const size = Math.random() * 8 + 6;
            confetti.style.width = `${size}px`;
            confetti.style.height = `${size}px`;

            const duration = Math.random() * 3 + 2;
            const delay = Math.random() * 1.5;
            confetti.style.animation = `confettiFall ${duration}s linear ${delay}s forwards`;

            els.clearOverlay.appendChild(confetti);
        }
    }

    function stopTimers() {
        clearInterval(state.timerInterval);
        clearTimeout(state.returnTimeout);
        state.timerInterval = null;
        state.returnTimeout = null;
    }

    function resetToHome() {
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
        state.justUnlockedOni = false;
    }

    init();
})();
