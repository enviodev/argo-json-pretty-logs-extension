const MENU_ID = "argo-json-toggle";

async function getEnabled(): Promise<boolean> {
    const { enabled } = await chrome.storage.local.get({ enabled: true });
    return Boolean(enabled);
}

async function setEnabled(enabled: boolean): Promise<void> {
    await chrome.storage.local.set({ enabled });
}

function rebuildMenu(): Promise<void> {
    return new Promise(async (resolve) => {
        const enabled = await getEnabled();
        chrome.contextMenus.removeAll(() => {
            chrome.contextMenus.create({
                id: MENU_ID,
                title: enabled ? "Disable Pretty JSON" : "Enable Pretty JSON",
                contexts: ["action"]
            }, () => resolve());
        });
    });
}

async function updateMenuAndBadge(): Promise<void> {
    await rebuildMenu();
    const enabled = await getEnabled();
    chrome.action.setBadgeBackgroundColor?.({ color: enabled ? "#10B981" : "#9CA3AF" });
    chrome.action.setBadgeText({ text: enabled ? "ON" : "OFF" });
}

chrome.runtime.onInstalled.addListener(async () => {
    const stored = await chrome.storage.local.get("enabled");
    if (typeof stored.enabled === "undefined") {
        await setEnabled(true);
    }
    await updateMenuAndBadge();
});

chrome.runtime.onStartup?.addListener(async () => {
    await updateMenuAndBadge();
});

chrome.contextMenus.onClicked.addListener(async (info) => {
    if (info.menuItemId !== MENU_ID) return;
    const enabled = await getEnabled();
    await setEnabled(!enabled);
});

chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === "local" && Object.prototype.hasOwnProperty.call(changes, "enabled")) {
        await updateMenuAndBadge();
    }
});


