/** Makes the splitter draggable and double-clickable */
document.addEventListener("DOMContentLoaded", function(event) {
    const splitter = document.querySelector("#splitter");
    const resultsPane = APP.resultsPane;

    var isMouseDown = false;
    splitter.addEventListener("mousedown", () => isMouseDown = true);
    document.addEventListener("mouseup", () => isMouseDown = false);
    document.addEventListener("mousemove", (ev) => {
        if (ev && isMouseDown && ev.offsetY) {
            var dist = ev.clientY - resultsPane.offsetTop;
            resultsPane.style['flex-basis'] = "" + (resultsPane.offsetHeight - dist) + "px";
            resultsPane.style['flex-grow'] = "0";
            if (ev.preventDefault) ev.preventDefault();
        }
    });

    // go back to "neutral" size when double clicking on the splitter
    document.addEventListener("dblclick", (ev) => {
        resultsPane.style['flex-basis'] = "";
        resultsPane.style['flex-grow'] = "0";
    });
});