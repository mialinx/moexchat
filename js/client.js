(function() {
        
    function addOnLoadListener(el, callback) {
        if (!(el && callback)) {
            return;
        }
        el.onreadystatechange = el.onload = function() {
            var state = el.readyState;
            if (!callback.done && (!state || /loaded|complete/.test(state))) {
                callback.done = true;
                callback();
                el.onreadystatechange = el.onload = null;
            }
        };
    }

    function setInnerHtml(el, html) {
        el.innerHTML = '_' + html; // fix for IE
        el.removeChild(el.firstChild);
    }


    var html = "" + (function () {/*
        <a href="#" id="getmoex_chat_btn">Чат GETMOEX</a>
        <iframe src="" id="getmoex_chat"></iframe>
        <img src="http://static.getmoex.ru/images/icon/close.png" id="getmoex_chat_close"/>
        <style>
            #getmoex_chat_btn {
                display: block;
                position: fixed;
                bottom: 0;
                right: 200px;
                width: 100px;
                height: 50px;
                background: red;
                text-decoration: none;
                font-size: 16px;
            }
            #getmoex_chat {
                display: none;
                position: fixed;
                bottom: 0px;
                right: 400px
                border: none;
                width: 320px;
                height: 475px;
                -webkit-box-shadow: 0 0 3 3 #333333;
                -moz-box-shadow: 0 0 3 3 #333333;
                box-shadow: 0 0 3 3 #333333;
            }
            #getmoex_chat_close {
                display: none;
                position: fixed;
                bottom: 400px;
                right: 70px;
            }
        </style>
    */});
    html = html.substr(0, html.length - 3).substr(15);


    // run!
    addOnLoadListener(document, function () {
        var d = document.createElement('div');
        setInnerHtml(d, html);
    });

})();
