/**
 * A cheatsheet that puts hotkeys into a bootstrap list.
 */
export default class CommandPanel {
    
    listDom: HTMLOListElement | HTMLUListElement;

    /**
     * Create a new command window and append it to the provided list.
     * @param listDom The DOM node of a list into which LIs will be inserted
     */
    constructor(listDom: HTMLOListElement | HTMLUListElement) {
        this.listDom = listDom;
    }

    /**
     * Adds a shortcut to the commnad window.
     * @param ctrl Must the control key be pressed to activate this action?
     * @param alt Must the alt key be pressed to activate this action?
     * @param shift Must the shift key be pressed to activate this action?
     * @param key The key that needs to be pressed to activate this action
     * @param hint The text to display next to the action
     * @param action The action to perform on click
     */
    addShortcut(ctrl: boolean, alt: boolean, shift: boolean, key: string, hint: string, action): HTMLButtonElement {
        if (hint) {
            let names = []
            if (ctrl) names.push("Ctrl")
            if (alt) names.push("Alt")
            if (shift) names.push("Shift")
            names.push(key)
            const keyName = names.join(" + ")

            const container = document.createElement("li");
            this.listDom.appendChild(container);

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
}