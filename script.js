const COLUMN_CONFIG = [
    { label: "Character", key: "name", imgKey: "image", type: "image", mandatory: true },
    { label: "Path", key: "path", imgKey: "path_img", type: "image" },
    { label: "Element", key: "element", imgKey: "element_img", type: "image" },
    { label: "Gender", key: "gender", type: "text" },
    { label: "Species", key: "species", type: "list" },
    { label: "Rarity", key: "rarity", type: "text" },
    { label: "Release", key: "release", type: "year" },
    { label: "Factions", key: "factions", type: "list", info: "factions_verbose" },
];

class UIRenderer {
    constructor() {
        this.resultsGrid = document.getElementById("resultsGrid");
        this.gridHeader = document.getElementById("gridHeader");
        this.gameContainer = document.querySelector(".game-container");
        this.toggleContainer = document.getElementById("toggleContainer");

        // Modal Elements
        this.infoModal = document.getElementById("infoModal");
        this.modalTitle = document.getElementById("modalTitle");
        this.modalList = document.getElementById("modalList");
        this.winDisplay = document.getElementById("winDisplay");
        this.winImage = document.getElementById("winImage");
        this.winName = document.getElementById("winName");

        // Buttons & Settings
        this.resetBtn = document.getElementById("resetBtn");
        this.settingsBtn = document.getElementById("settingsBtn");
        this.settingsMenu = document.getElementById("settingsMenu");

        this.hintsEnabled = false; // Default: Hints OFF

        // Toggle Settings Menu
        this.settingsBtn.onclick = (e) => {
            e.stopPropagation();
            this.settingsMenu.classList.toggle("hidden");
        };

        // Close menu when clicking outside
        document.addEventListener("click", (e) => {
            if (!this.settingsBtn.contains(e.target) && !this.settingsMenu.contains(e.target)) {
                this.settingsMenu.classList.add("hidden");
            }
        });
    }

    // Persist settings
    saveSettings(activeKeys, hintsEnabled) {
        localStorage.setItem("hsr_wordle_cols", JSON.stringify(activeKeys));
        localStorage.setItem("hsr_wordle_hints", hintsEnabled);
    }

    loadSettings() {
        const cols = JSON.parse(localStorage.getItem("hsr_wordle_cols"));
        const hints = localStorage.getItem("hsr_wordle_hints") === "true";
        return { cols, hints };
    }

    createHintArrow(direction) {
        const arrow = document.createElement("div");
        arrow.className = `hint-arrow ${direction}`;
        return arrow;
    }

    initOptions(onToggleColumn, onToggleHints) {
        this.toggleContainer.innerHTML = "";

        COLUMN_CONFIG.forEach((col) => {
            const label = document.createElement("label");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = true;
            checkbox.disabled = col.mandatory;

            checkbox.onchange = () => onToggleColumn(col.key, checkbox.checked);

            label.append(checkbox, col.label);
            this.toggleContainer.appendChild(label);
        });

        const separator = document.createElement("div");
        separator.style.width = "100%";
        separator.style.height = "10px";
        this.toggleContainer.appendChild(separator);

        const hintCheck = document.getElementById("hintToggle");
        if (hintCheck) {
            hintCheck.onchange = () => {
                this.hintsEnabled = hintCheck.checked;
                onToggleHints();
            };
            this.hintsEnabled = hintCheck.checked;
        }
    }

    updateLayout(activeColumns) {
        this.gameContainer.style.setProperty("--col-count", activeColumns.length);
        this.gridHeader.innerHTML = "";
        activeColumns.forEach((col) => {
            const span = document.createElement("span");
            span.textContent = col.label;
            this.gridHeader.appendChild(span);
        });
    }

    refreshBoard(guesses, activeColumns, target) {
        this.resultsGrid.innerHTML = "";
        [...guesses].forEach((guess) => this.addGuessRow(guess, activeColumns, target));
    }

    addGuessRow(guess, activeColumns, target) {
        const row = document.createElement("div");
        row.className = "guess-row";

        activeColumns.forEach((col) => {
            const card = document.createElement("div");
            card.className = "attribute-card";

            const square = this.createSquareContent(col, guess);
            const indicator = this.createIndicator(col, guess, target);

            card.appendChild(square);
            card.appendChild(indicator);
            row.appendChild(card);
        });

        this.resultsGrid.prepend(row);
    }

    createSquareContent(col, guess) {
        const square = document.createElement("div");
        square.className = "card-square";

        if (col.type === "image") {
            const img = document.createElement("img");
            img.src = guess[col.imgKey];
            img.alt = guess[col.key];
            square.title = guess[col.key];
            square.appendChild(img);
        } else {
            const span = document.createElement("span");
            let content = guess[col.key];

            if (col.type === "list" && Array.isArray(content)) {
                square.classList.add("square-list");
                square.classList.add("clickable");

                if (content.length > 1) {
                    const firstItem = document.createElement("div");
                    firstItem.textContent = content[0];
                    const moreDots = document.createElement("div");
                    moreDots.textContent = "...";
                    square.append(firstItem, moreDots);
                } else {
                    span.textContent = content[0] || "-";
                    square.appendChild(span);
                }

                const badgeContainer = document.createElement("div");
                badgeContainer.className = "corner-badge";

                const triangle = document.createElement("div");
                triangle.className = "badge-triangle";

                const count = document.createElement("div");
                count.className = "badge-count";
                count.textContent = content.length;

                badgeContainer.append(triangle, count);
                square.appendChild(badgeContainer);

                // 3. Popup Interaction
                const verbose_content = col.key == "factions" ? guess[col.info] : content;
                square.onclick = () => this.openModal(col.label, verbose_content);
            } else {
                // Standard Text / Year Handling
                if (col.type === "year") content = this.extractYear(content);
                span.textContent = content || "-";
                square.appendChild(span);
            }
        }
        return square;
    }

    openModal(title, listItems) {
        const modal = document.getElementById("infoModal");
        const modalTitle = document.getElementById("modalTitle");
        const modalList = document.getElementById("modalList");
        const winDisplay = document.getElementById("winDisplay");

        // Set Content
        modalTitle.textContent = title;
        modalList.innerHTML = "";
        winDisplay.classList.add("hidden");

        listItems.forEach((item) => {
            const li = document.createElement("li");
            li.textContent = item;
            modalList.appendChild(li);
        });

        modal.classList.remove("hidden");
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.add("hidden");
        };
    }

    showWinModal(character) {
        const modal = document.getElementById("infoModal");
        const modalTitle = document.getElementById("modalTitle");
        const modalList = document.getElementById("modalList");
        const winDisplay = document.getElementById("winDisplay");

        const winImage = document.getElementById("winImage");
        const winName = document.getElementById("winName");

        // Setup Victory Content
        modalTitle.textContent = "Victory!";
        modalTitle.style.color = "#00ffcc";
        modalList.innerHTML = "";

        winImage.src = character.image;
        winName.textContent = character.name;

        winDisplay.classList.remove("hidden");
        modal.classList.remove("hidden");

        this.triggerConfetti();
    }

    triggerConfetti() {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 2000 };

        const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);

            const particleCount = 50 * (timeLeft / duration);
            confetti({
                ...defaults,
                particleCount,
                origin: { x: Math.random(), y: Math.random() - 0.2 },
            });
        }, 250);
    }

    createIndicator(col, guess, target) {
        const indicator = document.createElement("div");
        indicator.className = "card-indicator";
        indicator.style.display = "flex";
        indicator.style.justifyContent = "center";
        indicator.style.alignItems = "center";
        indicator.style.color = "white";
        indicator.style.fontSize = "12px";
        indicator.style.fontWeight = "bold";

        const matchStatus = this.checkMatch(col, guess, target);

        if (matchStatus === "correct") indicator.classList.add("correct");
        else if (matchStatus === "partial") indicator.classList.add("partial");
        else indicator.classList.add("wrong");

        if (
            this.hintsEnabled &&
            matchStatus === "wrong" &&
            (col.type === "year" || col.key === "rarity")
        ) {
            const guessVal = this.getNumericValue(col, guess);
            const targetVal = this.getNumericValue(col, target);

            if (guessVal < targetVal) indicator.appendChild(this.createHintArrow("up")); // Target is higher
            if (guessVal > targetVal) indicator.appendChild(this.createHintArrow("down")); // Target is lower
        }

        return indicator;
    }

    checkMatch(col, guess, target) {
        const guessVal = guess[col.key];
        const targetVal = target[col.key];

        if (col.type === "list") {
            const gList = Array.isArray(guessVal) ? guessVal : [guessVal];
            const tList = Array.isArray(targetVal) ? targetVal : [targetVal];

            const intersection = gList.filter((item) => tList.includes(item));

            const isExact = intersection.length === gList.length && gList.length === tList.length;

            if (isExact) return "correct";
            if (intersection.length > 0) return "partial";
            return "wrong";
        }

        if (col.type === "year") {
            return this.extractYear(guessVal) === this.extractYear(targetVal) ? "correct" : "wrong";
        }

        return guessVal == targetVal ? "correct" : "wrong";
    }

    extractYear(dateStr) {
        if (!dateStr) return 0;
        const match = String(dateStr).match(/\d{4}/);
        return match ? parseInt(match[0]) : 0;
    }

    getNumericValue(col, obj) {
        if (col.type === "year") return this.extractYear(obj[col.key]);
        if (col.key === "rarity") return parseInt(obj[col.key]) || 0;
        return 0;
    }
}

class SearchHandler {
    constructor(inputId, boxId, onSelectCallback) {
        this.input = document.getElementById(inputId);
        this.box = document.getElementById(boxId);
        this.onSelect = onSelectCallback;
        this.data = [];
        this.currentFocus = -1;
        this.initListeners();
    }

    setData(characters) {
        this.data = characters;
    }

    initListeners() {
        this.input.addEventListener("input", (e) => this.handleInput(e.target.value));
        this.input.addEventListener("keydown", (e) => this.handleKeyNavigation(e));
    }

    handleInput(query) {
        this.box.innerHTML = "";
        this.currentFocus = -1;
        if (!query || this.data.length === 0) {
            this.box.classList.add("hidden");
            return;
        }
        const filtered = this.data.filter((c) =>
            c.name.toLowerCase().includes(query.toLowerCase()),
        );
        filtered.forEach((char) => {
            const item = document.createElement("div");
            item.className = "suggestion-item";
            item.textContent = char.name;
            item.tabIndex = 0;
            item.onclick = () => this.selectItem(char);
            item.onkeydown = (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    this.selectItem(char);
                }
            };
            this.box.appendChild(item);
        });
        if (filtered.length > 0) this.box.classList.remove("hidden");
        else this.box.classList.add("hidden");
    }

    handleKeyNavigation(e) {
        const items = this.box.getElementsByClassName("suggestion-item");
        if (items.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            this.currentFocus++;
            this.setActive(items);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            this.currentFocus--;
            this.setActive(items);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (this.currentFocus === -1) {
                this.selectItem(this.getCharacterByItem(items[0]));
            } else if (items[this.currentFocus]) {
                items[this.currentFocus].click();
            }
        }
    }

    getCharacterByItem(element) {
        if (!element) return null;
        return this.data.find((c) => c.name === element.textContent);
    }

    selectItem(character) {
        if (!character) return;
        this.input.value = "";
        this.box.classList.add("hidden");
        this.onSelect(character);

        this.input.focus();
    }

    setActive(items) {
        Array.from(items).forEach((x) => x.classList.remove("suggestion-active"));
        if (this.currentFocus >= items.length) this.currentFocus = 0;
        if (this.currentFocus < 0) this.currentFocus = items.length - 1;
        items[this.currentFocus].classList.add("suggestion-active");
        items[this.currentFocus].scrollIntoView({ block: "nearest" });
    }
}

class GameManager {
    constructor() {
        this.characters = [];
        this.targetCharacter = null;
        this.activeColumns = [...COLUMN_CONFIG];
        this.previousGuesses = [];

        this.ui = new UIRenderer();
        this.search = new SearchHandler("searchInput", "suggestionsBox", (char) =>
            this.makeGuess(char),
        );

        this.init();
    }

    async init() {
        try {
            const response = await fetch("data.json");
            this.characters = await response.json();

            this.ui.initOptions(
                (key, isChecked) => this.handleColumnToggle(key, isChecked),
                () => this.handleHintToggle(),
            );

            this.ui.updateLayout(this.activeColumns);
            this.search.setData(this.characters);
            this.pickTarget();
        } catch (error) {
            console.error("Failed to load game data:", error);
        }
    }

    resetGame() {
        this.previousGuesses = [];
        this.ui.resultsGrid.innerHTML = "";
        this.ui.resetBtn.classList.add("hidden");
        this.pickTarget();
    }

    pickTarget() {
        this.targetCharacter = this.characters[Math.floor(Math.random() * this.characters.length)];
        console.log("Target loaded:", this.targetCharacter.name);
    }

    handleColumnToggle(key, isChecked) {
        if (isChecked) {
            const col = COLUMN_CONFIG.find((c) => c.key === key);
            if (col && !this.activeColumns.includes(col)) {
                this.activeColumns.push(col);
            }
        } else {
            this.activeColumns = this.activeColumns.filter((c) => c.key !== key);
        }
        this.activeColumns.sort((a, b) => COLUMN_CONFIG.indexOf(a) - COLUMN_CONFIG.indexOf(b));

        this.ui.updateLayout(this.activeColumns);
        this.ui.refreshBoard(this.previousGuesses, this.activeColumns, this.targetCharacter);
    }

    handleHintToggle() {
        this.ui.refreshBoard(this.previousGuesses, this.activeColumns, this.targetCharacter);
    }

    makeGuess(character) {
        this.previousGuesses.push(character);
        this.ui.addGuessRow(character, this.activeColumns, this.targetCharacter);

        if (character.id === this.targetCharacter.id) {
            // Replaced alert with showWinModal
            setTimeout(() => {
                this.ui.showWinModal(character);
            }, 500);
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new GameManager();
});
