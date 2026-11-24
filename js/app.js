(() => {
    'use strict';

    // ======== ゲーム状態 ========
    const state = {
        category: 'plant',      // 'plant' | 'biome'
        difficulty: 'easy',     // 'easy' | 'normal' | 'hard' | 'oni'
        score: 0,
        selectedItemId: null,
        items: [],
        toastTimeout: null,
        returnTimeout: null
    };

    const TOTAL_QUESTIONS = BIOME_DATA.length;

    // ======== DOM参照 ========
    const els = {
        homeScreen: document.getElementById('home-screen'),
        gameScreen: document.getElementById('game-screen'),
        homeDesc: document.getElementById('home-desc'),
        ruleOniText: document.getElementById('rule-oni-text'),
        categoryTabs: document.querySelectorAll('.category-tab'),
        modeButtons: document.querySelectorAll('.mode-btn'),
        homeBtn: document.getElementById('home-btn'),
        modeDisplay: document.getElementById('mode-display'),
        trayTitleText: document.getElementById('tray-title-text'),
        score: document.getElementById('score'),
        totalQuestions: document.getElementById('total-questions'),
        progressFill: document.getElementById('progress-fill'),
        dropZone: document.getElementById('drop-zone'),
        cardList: document.getElementById('card-list'),
        toast: document.getElementById('toast'),
        clearOverlay: document.getElementById('clear-overlay'),
        clearTitle: document.getElementById('clear-title'),
        clearSubtitle: document.getElementById('clear-subtitle')
    };

    // ======== 初期化 ========
    function init() {
        els.totalQuestions.textContent = TOTAL_QUESTIONS;

        // 上部の学習モード切替タブ
        els.categoryTabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                setCategory(tab.dataset.category);
            });
        });

        // 難易度スタートボタン
        els.modeButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                startGame(btn.dataset.difficulty);
            });
        });

        // ホームに戻るボタン
        els.homeBtn.addEventListener('click', resetToHome);

        // グラフのドロップ・タップ操作
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

        setCategory('plant');
    }

    // ======== 学習カテゴリ切替 ========
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
    }

    // ======== ゲーム開始 ========
    function startGame(difficulty) {
        clearTimeout(state.returnTimeout);
        state.difficulty = difficulty;
        state.score = 0;
        state.selectedItemId = null;

        els.dropZone.innerHTML = '';
        updateProgress();

        // カテゴリと難易度に応じた問題セットを生成
        state.items = buildQuestionItems(state.category, difficulty);
        shuffleArray(state.items);

        // 画面切り替えとヘッダー・トレイ表示更新
        const categoryConfig = CATEGORY_CONFIG[state.category];
        els.modeDisplay.textContent = `${categoryConfig.label} / ${DIFFICULTY_LABELS[difficulty]}`;
        els.trayTitleText.textContent = categoryConfig.trayTitle;

        els.homeScreen.classList.remove('active');
        els.gameScreen.classList.add('active');

        const startMessage = (difficulty === 'oni')
            ? categoryConfig.oniToast
            : categoryConfig.startToast;
        showToast(startMessage);

        renderCards();
    }

    function buildQuestionItems(category, difficulty) {
        return BIOME_DATA.map((biome, index) => {
            if (category === 'biome') {
                return {
                    id: `item-${index}`,
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
                id: `item-${index}`,
                biomeId: biome.id,
                name: plantDef.name,
                emoji: plantDef.emoji,
                color: plantDef.color,
                bg: plantDef.bg,
                hint: biome.hint,
                targets: biome.targets
            };
        });
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // ======== カード一覧の描画 ========
    function renderCards() {
        els.cardList.innerHTML = '';

        const remainingItems = state.items.filter(
            (item) => !document.getElementById(`placed-${item.id}`)
        );
        const isAdvanced = state.difficulty === 'hard' || state.difficulty === 'oni';

        remainingItems.forEach((item) => {
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

            // タップ / クリックで選択
            card.addEventListener('click', () => {
                state.selectedItemId = isSelected ? null : item.id;
                renderCards();
            });

            // PC向けドラッグ操作
            card.addEventListener('dragstart', (e) => {
                state.selectedItemId = item.id;
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(renderCards, 0);
            });

            els.cardList.appendChild(card);
        });
    }

    // ======== 配置判定 ========
    function handlePlacementAttempt(clientX, clientY) {
        if (!state.selectedItemId) return;

        const rect = els.dropZone.getBoundingClientRect();
        const px = ((clientX - rect.left) / rect.width) * 100;
        const py = ((clientY - rect.top) / rect.height) * 100;

        const item = state.items.find((entry) => entry.id === state.selectedItemId);
        if (!item) return;

        // バイオーム名モードの「おに」では当たり判定をシビアにする
        const tolerance = (state.category === 'biome' && state.difficulty === 'oni') ? 7 : 12;

        const matchedTarget = item.targets.find(
            (target) => Math.abs(px - target.x) < tolerance && Math.abs(py - target.y) < tolerance
        );

        if (matchedTarget) {
            state.score++;
            updateProgress();
            placePinOnGraph(item, matchedTarget.x, matchedTarget.y);

            if (state.score === TOTAL_QUESTIONS) {
                handleGameClear();
            } else {
                showToast(`⭕ 正解！ ${item.name}`);
                state.selectedItemId = null;
                renderCards();
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
    }

    function updateProgress() {
        els.score.textContent = state.score;
        const percent = (state.score / TOTAL_QUESTIONS) * 100;
        els.progressFill.style.width = `${percent}%`;
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
        }, 1800);
    }

    // ======== クリア演出＆リセット ========
    function handleGameClear() {
        let displayTime = 3500;

        if (state.difficulty === 'oni') {
            els.clearTitle.innerHTML = '🌙 よく頑張ったね';
            els.clearTitle.style.color = '#334155';
            els.clearTitle.style.textShadow = 'none';
            els.clearSubtitle.innerHTML = '厳しい自然環境をすべて理解しました。<br>息抜きをして、体を労わってね。';
            displayTime = 5000;
        } else {
            els.clearTitle.innerHTML = '🎊 素晴らしい！ 🎊';
            els.clearTitle.style.color = 'var(--primary)';
            els.clearTitle.style.textShadow = '0 4px 10px rgba(16, 185, 129, 0.2)';
            els.clearSubtitle.innerHTML = 'すべてのバイオームをマスターしました！';
            createConfetti();
        }

        els.clearOverlay.classList.add('active');

        clearTimeout(state.returnTimeout);
        state.returnTimeout = setTimeout(resetToHome, displayTime);
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

    function resetToHome() {
        clearTimeout(state.returnTimeout);
        els.clearOverlay.classList.remove('active');
        els.dropZone.innerHTML = '';
        els.cardList.innerHTML = '';
        state.score = 0;
        state.selectedItemId = null;
        updateProgress();

        els.gameScreen.classList.remove('active');
        els.homeScreen.classList.add('active');
    }

    init();
})();
