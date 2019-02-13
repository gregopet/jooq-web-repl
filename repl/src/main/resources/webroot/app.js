const APP = (function() {

    function init() {
        document.querySelector('#submit-button').addEventListener("click", eval);
    }

    function eval() {
        fetch("/eval", {
            method: 'POST',
            body: document.querySelector('#script-content').value
        })
        .then( resp => {
            return resp.text();
        })
        .then( txt => {
            document.querySelector("#results-pane").innerHTML = txt
        });
    }
    
    return {
        init: init
    }
})();

document.addEventListener("DOMContentLoaded", function(event) {
    APP.init();
});
