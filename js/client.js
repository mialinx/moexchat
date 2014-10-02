(function() {
    
    var paneMinWidth = 320;
    var chatMinWidth = paneMinWidth;
    var chatMinHeigh = 475;
    var scriptTags = document.getElementsByTagName('script');
    var chatBaseUrl = scriptTags[scriptTags.length - 1].src.replace(/\/js\/client.js.*/, '/');
    if (window.location.search.match(/\bgetmoex_demo=1\b/)) {
        chatBaseUrl = chatBaseUrl.replace(/\/\//, '//demo.');
    }
    var localStorage = window.localStorage || {};

    function gebi (id) { // old school
        return document.getElementById(id);
    }

    function addClass(obj, name) {
        obj.className = obj.className + ' ' + name;
    }

    function removeClass(obj, name) {
        obj.className = obj.className.replace(new RegExp('\\b' + name + '\\b', 'g'), '');
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
            return element.attachEvent("on" + eventName, handler);
        }
    }

    function removeListener(element, eventName, handler) {
        if (element.removeEventListener) {
            return element.removeEventListener(eventName, handler, false);
        }
        else {
            return element.detachEvent("on" + eventName, handler);
        }
    }

    var clientHTML = 
        '<img src="' + chatBaseUrl + 'images/launcher2.png" id="getmoex_chat_launcher" style="position: fixed; bottom: 0px; right: 100px;">' + 
        '<div id="getmoex_chat_container" style="display: none" class="hidden" >' + 
            '<div id="getmoex_chat_handle"></div>' +
            '<div id="getmoex_chat_rfix"></div>' +
            '<iframe src="about:blank" id="getmoex_chat" sandbox="allow-same-origin allow-scripts allow-popups allow-forms"></iframe>' + 
        '</div>' + 
        '<link rel="stylesheet" href="' + chatBaseUrl + 'css/client.css">';

    // run!
    addOnLoadListener(document, function () {

        var d = document.createElement('div');
        d.innerHTML = clientHTML;
        document.body.appendChild(d);

        var launcher = gebi('getmoex_chat_launcher');
        var container = gebi('getmoex_chat_container');
        var chat = gebi('getmoex_chat');
        var handle = gebi('getmoex_chat_handle');
        var rfix = gebi('getmoex_chat_rfix');
        var loaded = false;

        function openChat() {
            removeClass(container, 'hidden');
            addClass(launcher,  'hidden');
            if (!loaded) {
                var url = chatBaseUrl + 'chat.html?r=' + Math.random();
                var XHR = window.XDomainRequest || window.XMLHttpRequest;
                var xhr = new XHR();
                xhr.open('GET', url, true);
                xhr.onload = function() {
                    var doc = chat.contentDocument || chat.contentWindow.document;
                    doc.write(this.responseText);
                    doc.close();
                    loaded = true;
                }
                xhr.onerror = function() {
                    console.log(this.status);
                }
                xhr.send('');
            }
        }
        addListener(launcher, 'click', openChat);

        function setWide(wide) {
            if (wide) {
                container.style.width = (container.clientWidth + paneMinWidth) + 'px';
                chatMinWidth = 2 * paneMinWidth;
            }
            else {
                container.style.width = (container.clientWidth - paneMinWidth) + 'px';
                chatMinWidth = paneMinWidth;
            }
        }

        function closeChat() {
            addClass(container, 'hidden');
            removeClass(launcher, 'hidden');
        }

        // resize
        var resizeInfo = null;
        function startResize (ev) {
            ev = ev || window.event;
            resizeInfo = { 
                clickOffsetX: ev.clientX - container.offsetLeft, 
                clickOffsetY: ev.clientY - container.offsetTop,
                brX: container.offsetLeft + container.clientWidth,
                brY: container.offsetTop + container.clientHeight
            };
            addListener(document, 'mousemove', doResize);
            addListener(document, 'mouseup', stopResize);
            rfix.style.display = 'block';
            addClass(container, 'resizing');
            ev.preventDefault();
            return false;
        }
        function doResize (ev) {
            ev = ev || window.event;
            var width = Math.max(resizeInfo.brX - (ev.clientX - resizeInfo.clickOffsetX), chatMinWidth);
            var height = Math.max(resizeInfo.brY - (ev.clientY - resizeInfo.clickOffsetY), chatMinHeigh);
            container.style.width =  width + 'px';
            container.style.height = height + 'px';
            ev.preventDefault();
            return false;
        }
        function stopResize (ev) {
            ev = ev || window.event;
            removeListener(document, 'mousemove', doResize);
            removeListener(document, 'mouseup', arguments.callee);
            rfix.style.display = 'none';
            resizeInfo = null;
            removeClass(container, 'resizing');
            ev.preventDefault();
            localStorage['getmoex_width'] = container.clientWidth;
            localStorage['getmoex_height'] = container.clientHeight;
            return false;
        }
        addListener(handle, 'mousedown', startResize);

        // stop wheel event to main window
        function cancelWheel(e) {
          e = e || window.event;
          e.preventDefault ? e.preventDefault() : (e.returnValue = false);
        }
        if (container.addEventListener) {
            if ('onwheel' in document) {
                container.addEventListener ("wheel", cancelWheel, false);
            } 
            else if ('onmousewheel' in document) {
                container.addEventListener ("mousewheel", cancelWheel, false);
            } 
            else {
                container.addEventListener ("MozMousePixelScroll", cancelWheel, false);
            }
        } 
        else {
            container.attachEvent ("onmousewheel", cancelWheel);
        }

        // restore sizes
        container.style.width  = Math.max(chatMinWidth, parseInt(localStorage['getmoex_width']) || 0) + 'px';
        container.style.height = Math.max(chatMinHeigh, parseInt(localStorage['getmoex_height']) || 0) + 'px';

        // public API
        window.GETMOEX = {
            chatBaseUrl: chatBaseUrl,
            setWide:     setWide,
            openChat:    openChat,
            closeChat:   closeChat
        };
    });

})();
