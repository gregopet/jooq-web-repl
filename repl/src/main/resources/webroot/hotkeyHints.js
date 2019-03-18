/**
 * A cheatsheet that puts hotkeys into a bootstrap list.
 * Provides a single public method:
 * @param listDom The DOM node of a list into which LIs will be inserted
 * @return The button that was created
 */
const BootstrapListCheatSheet = function(listDom) {
    function addShortcut(ctrl, alt, shift, key, hint, action) {
        if (hint) {
            let names = []
            if (ctrl) names.push("Ctrl")
            if (alt) names.push("Alt")
            if (shift) names.push("Shift")
            names.push(key)
            const keyName = names.join(" + ")

            const container = document.createElement("li");
            listDom.appendChild(container);

            const button = document.createElement("button");
            button.classList.add("btn");
            button.classList.add("btn-sm");
            button.classList.add("btn-outline-dark");
            container.appendChild(button);

            const caption = document.createElement('span');
            caption.appendChild(document.createTextNode(hint));
            button.appendChild(caption);

            const keyNode = document.createElement('kbd');
            keyNode.appendChild(document.createTextNode(keyName));
            button.appendChild(keyNode);

            button.addEventListener("click", action);

            return button;
        }
    }

    return {
        addShortcut : addShortcut
    }
}