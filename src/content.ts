type TokenType = "punctuation" | "key" | "string" | "number" | "boolean" | "null";

function createSpan(tokenType: TokenType, textContent: string): HTMLSpanElement {
    const span = document.createElement("span");
    span.className = `argo-json-token argo-json-${tokenType}`;
    span.textContent = textContent;
    return span;
}

function formatAndColorizeJSON(raw: string): HTMLElement | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        // Try to salvage: sometimes logs have trailing commas or are single-line already pretty
        return null;
    }

    const pre = document.createElement("pre");
    pre.className = "argo-json-pretty";

    const json = JSON.stringify(parsed, null, 2);

    // Simple tokenizer over the pretty JSON string
    const regex = /(\{|\}|\[|\]|:|,)|("(?:\\.|[^\\"])*")|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(json)) !== null) {
        if (match.index > lastIndex) {
            pre.append(document.createTextNode(json.slice(lastIndex, match.index)));
        }

        if (match[1]) {
            pre.append(createSpan("punctuation", match[1]));
        } else if (match[2]) {
            // Determine if this is a key (appears right before a colon when trimmed)
            const isKey = /"\s*:\s*$/.test(json.slice(match.index, regex.lastIndex + 2));
            pre.append(createSpan(isKey ? "key" : "string", match[2]));
        } else if (match[3]) {
            if (match[3] === "true" || match[3] === "false") {
                pre.append(createSpan("boolean", match[3]));
            } else {
                pre.append(createSpan("null", match[3]));
            }
        } else if (match[4]) {
            // Format numbers with thousands separators, preserve decimals and exponent if present
            const original = match[4];
            const numParts = original.match(/^(?<sign>-?)(?<int>\d+)(?<frac>\.\d+)?(?<exp>[eE][+-]?\d+)?$/);
            let formatted = original;
            if (numParts && numParts.groups) {
                const sign = numParts.groups["sign"] ?? "";
                const intPart = numParts.groups["int"] ?? "";
                const frac = numParts.groups["frac"] ?? "";
                const exp = numParts.groups["exp"] ?? "";
                const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                formatted = `${sign}${withCommas}${frac}${exp}`;
            }
            pre.append(createSpan("number", formatted));
        }

        lastIndex = regex.lastIndex;
    }

    if (lastIndex < json.length) {
        pre.append(document.createTextNode(json.slice(lastIndex)));
    }

    return pre;
}

function isJSONLike(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return false;
    // Quick check to avoid heavy JSON.parse
    if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return false;
    try {
        JSON.parse(trimmed);
        return true;
    } catch {
        return false;
    }
}

function findLogCodeBlocks(root: ParentNode): HTMLElement[] {
    // Argo CD logs area typically renders <code> inside scroll containers with .noscroll
    const candidates: HTMLElement[] = [];
    const selectors = [
        "div.noscroll code",
        "code",
        "pre code",
        "div[class*='log'] code",
        "div[class*='logs'] code"
    ];
    for (const sel of selectors) {
        document.querySelectorAll(sel).forEach((el) => {
            if (el instanceof HTMLElement) {
                candidates.push(el);
            }
        });
    }
    return candidates;
}

function enhanceElement(el: HTMLElement): void {
    if (el.dataset.argoJsonEnhanced === "true") return;
    const text = el.textContent ?? "";
    if (!isJSONLike(text)) return;

    const pretty = formatAndColorizeJSON(text);
    if (!pretty) return;

    const container = document.createElement("div");
    container.className = "argo-json-container";
    container.appendChild(pretty);

    el.style.display = "none";
    el.insertAdjacentElement("afterend", container);
    el.dataset.argoJsonEnhanced = "true";
}

function scanAll(): void {
    const codeBlocks = findLogCodeBlocks(document);
    codeBlocks.forEach(enhanceElement);
}

let observerRef: MutationObserver | null = null;
function startObserver(): void {
    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            m.addedNodes.forEach((node) => {
                if (!(node instanceof HTMLElement)) return;
                if (node.matches && node.matches("code")) {
                    enhanceElement(node);
                }
                node.querySelectorAll?.("code").forEach((c) => enhanceElement(c as HTMLElement));
            });
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    observerRef = observer;
}

function injectBaseStyles(): void {
    const style = document.createElement("style");
    style.textContent = `
    .argo-json-pretty { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; margin: 0; }
    .argo-json-token.argo-json-punctuation { color: #9aa4b2; }
    .argo-json-token.argo-json-key { color: #4f46e5; }
    .argo-json-token.argo-json-string { color: #059669; }
    .argo-json-token.argo-json-number { color: #d97706; }
    .argo-json-token.argo-json-boolean { color: #2563eb; }
    .argo-json-token.argo-json-null { color: #6b7280; font-style: italic; }
    .argo-json-container { background: rgba(0,0,0,0.03); padding: 2px 8px; border-radius: 4px; overflow-x: auto; }
  `;
    document.head.appendChild(style);
}

let isEnabled = true;
function cleanup(): void {
    document.querySelectorAll<HTMLElement>("[data-argo-json-enhanced='true']").forEach((orig) => {
        const container = orig.nextElementSibling;
        if (container && container instanceof HTMLElement && container.classList.contains("argo-json-container")) {
            container.remove();
        }
        orig.style.display = "";
        delete (orig as any).dataset.argoJsonEnhanced;
    });
    if (observerRef) {
        observerRef.disconnect();
        observerRef = null;
    }
}

async function runIfEnabled(): Promise<void> {
    const { enabled } = await chrome.storage.local.get({ enabled: true });
    isEnabled = Boolean(enabled);
    if (!isEnabled) return;
    injectBaseStyles();
    scanAll();
    startObserver();
}

function init(): void {
    void runIfEnabled();
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local" || !Object.prototype.hasOwnProperty.call(changes, "enabled")) return;
        const next = Boolean(changes.enabled.newValue);
        if (next === isEnabled) return;
        isEnabled = next;
        if (isEnabled) {
            void runIfEnabled();
        } else {
            cleanup();
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}


