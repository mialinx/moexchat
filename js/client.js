(function() {
        
    function gebi (id) {
        return document.getElementById(id);
    }

    function addOnLoadListener (el, callback) {
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

    function addListener(element, eventName, handler) {
        if (element.addEventListener) {
            return element.addEventListener(eventName, handler, false);
        }
        else {
            return element.attachEvent("on"+eventName, handler);
        }
    }

    var clientHTML = 
        '<a href="#" id="getmoex_chat_btn">Чат GETMOEX</a>' + 
        '<iframe src="" id="getmoex_chat" style="display: none"></iframe>' + 
        '<img src="http://static.getmoex.ru/images/icon/close.png" id="getmoex_chat_close" style="display: none"/>' +
        '<link rel="stylesheet" href="http://static.getmoex.ru/css/client.css">';

    // run!
    addOnLoadListener(document, function () {
        var d = document.createElement('div');
        d.innerHTML = clientHTML;
        document.body.appendChild(d);

        var chatBtn = gebi('getmoex_chat_btn');
        var closeBtn = gebi('getmoex_chat_close');
        var chat = gebi('getmoex_chat');
        var loaded = false;

        addListener(chatBtn, 'click', function () {
            chat.style.display = 'block';
            closeBtn.style.display = 'block';
            chatBtn.style.display = 'none';
            if (!loaded) {
                chat.src = 'http://static.getmoex.ru/chat.html' +
                           '#/?client_type=' + encodeURIComponent(window.GETMOEX_CLIENT || document.location.hostname);
                loaded = true;
            }
        });

        addListener(closeBtn, 'click', function () {
            chat.style.display = 'none';
            closeBtn.style.display = 'none';
            chatBtn.style.display = 'block';
        });

    });

})();
