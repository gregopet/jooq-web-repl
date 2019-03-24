document.addEventListener("DOMContentLoaded", function(event) {
    
    let resultsToClose = [];
    
    // initialize each frame with a REPL editor
    document.querySelectorAll(".interactive-frame").forEach((frame) => {
        fillOutCommandArea(frame);
        const resultDisplay = frame.querySelector(".result-display");
        const pre = frame.querySelector('pre');
        const button = frame.querySelector('button')
        frame.querySelector(".close").addEventListener("click", (ev) => {
            resultDisplay.style.display = 'none';
            ev.preventDefault();
        });

        const editor = Repl({
            textArea: frame.querySelector('textarea'),
            resultsPane: PreResultsPane(pre),
            submitButton: button,
            keyboardShortcutRoot: frame,
            onCommandExecutionStarted: () => {  },
            onCommandExecutionFinished: () => {
                resultDisplay.style.display = "block";
                pre.scrollTop = 0;
                pre.scrollLeft = 0;
             }
        });
        
        resultsToClose.push(resultDisplay);
    });
    
    // close results on escape - catch events on document root to avoid focus issues
    document.addEventListener("keydown", ev => {
        if (ev.key == "Escape") {
            resultsToClose.forEach( frame => {
                frame.style.display = 'none';
            });
        }
    });
});



function fillOutCommandArea(enclosure) {
    const commandArea = document.createElement("div");
    commandArea.classList.add("hint-and-run");
    enclosure.appendChild(commandArea);
    
    const hint = enclosure.querySelector("template.hint");
    if (hint) {
        const hintEnclosure = document.createElement("div");
        const hintDOM = document.importNode(hint.content, true);
        hintEnclosure.appendChild(hintDOM);
        commandArea.appendChild(hintEnclosure);
    }
    
    const runAndWait = document.createElement("button");
    commandArea.appendChild(runAndWait);
    
    const run = document.createElement("img");
    run.classList.add("run");
    run.src = "../../img/play.svg";
    runAndWait.appendChild(run);
    
    const wait = document.createElement("img");
    wait.classList.add("loader");
    wait.src = "../../img/gears-white.svg";
    runAndWait.appendChild(wait);
    
    
    
    const resultDisplay = document.createElement("div");
    resultDisplay.classList.add("result-display");
    enclosure.appendChild(resultDisplay);
    
    const close = document.createElement("a");
    close.href="#"
    close.innerText = "close";
    close.classList.add("close");
    resultDisplay.appendChild(close);
    
    const pre = document.createElement("pre");
    resultDisplay.appendChild(pre);
    
    
}
