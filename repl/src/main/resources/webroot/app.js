const APP = (function() {
    function test() {
        fetch("/test-ajax")
        .then( resp => {
            return resp.text();
        })
        .then( txt => {
            document.querySelector("#results-pane").innerHTML = txt
        });
    }
    
    return {
        test: test
    }
})();

document.addEventListener("DOMContentLoaded", function(event) {
    APP.test();
});
