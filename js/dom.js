export function byId                                 (id        )    {
    const el = document.getElementById(id);
    if (!el) {
        throw new Error(`要素 #${id} が index.html に見つかりません`);
    }
    return el                ;
}

export function bySelector                                 (selector        )    {
    const el = document.querySelector   (selector);
    if (!el) {
        throw new Error(`要素 ${selector} が index.html に見つかりません`);
    }
    return el;
}


//# sourceURL=dom.ts