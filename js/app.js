var CONFIG = {
    messagesPerPage: 20,
    pusherAppKey: 'b139f2a300b26850df94',
    pusherOptions: {
        authTransport: 'jsonp',
        authEndpoint:  'http://auth.getmoex.ru/pusher/jauth'
    },
    httpTimeout: 10 * 1000,
    apiBase: 'http://auth.getmoex.ru/api'
};

var app = angular.module('GetmoexApp', ['ngSanitize']);

// TODO: JOIN PUSHER WHILE currentChannelName changes
app.factory('Pusher', function ($rootScope) {
    var pusherOptions = angular.extend({}, CONFIG.pusherOptions);
    pusherOptions.authEndpoint = pusherOptions.authEndpoint + '/' + $rootScope.user.session.token;

    return {
        connect: function (channelName) {
            var pusher = new Pusher(CONFIG.pusherAppKey, pusherOptions);
            var channel = pusher.subscribe(channelName);
            var presence = pusher.subscribe('presence-' + channelName);
            return {
                channelName: channelName,
                pusher: pusher,
                channel: channel,
                presence: presence
            };
        }
    }
});

app.factory('Storage', function () {
    var ls = window.localStorage || {};
    return {
        get: function (key) {
            key = 'getmoex_' + key;
            try {
                return angular.fromJson(ls[key]);
            }
            catch (e) {
                return null;
            }
        },
        set: function (key, val) {
            key = 'getmoex_' + key;
            ls[key] = angular.toJson(val);
        },
        del: function (key) {
            key = 'getmoex_' + key;
            delete ls[key];
        }
    }
});

app.factory('Backend', function ($http, $q, $rootScope, Storage, $timeout, $log) {

    function fake(data) {
        var d = $q.defer();
        $timeout(function() { d.resolve(data) }, 300);
        var p = d.promise;
        p.success = function(cb) { p.then(cb); return p};
        p.error = function(cb) { p.then(null, cb); return p};
        return p;
    }

    function handleErrors(httpPromise) {
        var d = $q.defer();
        httpPromise.then(function(rsp) {
            if (rsp.status != 200) {
                rsp.result = 'http_error';
                d.reject(rsp);
                return;
            }
            if ((rsp.data.result || '') != "ok" ) {
                d.reject(rsp.data);
                return;
            }
            d.resolve(rsp.data);
        });
        $timeout(function () {
            d.reject({ result: 'http_timeout' });
            return;
        }, CONFIG.httpTimeout);
        d.promise.then(null, function(data) {
            $log.log('Backend error', data);
            switch (data.result) {
                case 'http_error':
                    // TODO
                    break;
                case 'Incorrect access token':
                    $rootScope.user.session = null;
                    Storage.del('session');
                    window.location.reload();
                    break;
            }
        });
        return d.promise;
    }

    function callJSONP(method, data) {
        var url = CONFIG.apiBase + '/v1/jsonp/' + method;
        var first = true;
        data['callback'] = 'JSON_CALLBACK';
        for (var key in data) {
            if (typeof data[key]  == "undefined") continue;
            url += (first ? '?' : '&');
            url += encodeURIComponent(key);
            url += '=' + encodeURIComponent(data[key]);
            first = false;
        }
        return handleErrors($http.jsonp(url));
    }

    return {

        initializeSession: function (clientType) {
            return callJSONP('initialize_session', { 
                client_type: clientType 
            });
        }, 

        listChannels: function (withPrivate) {
            return callJSONP('channels/list', {
                token: $rootScope.user.session.token
            })
                .then(function (data) {
                    if (data.channels && data.channels.length && !withPrivate) {
                        // remove private channels 
                        for (var i = data.channels.length - 1; i >= 0; i--) {
                            if (data.channels[i].is_private) {
                                data.channels.splice(i, 1);
                            }
                        }
                    }
                    return data;
                });
        },

        messagesFetch: function (channel, lastMessageId) {
            return callJSONP('messages/fetch', { 
                channel: channel,
                per_page: CONFIG.messagesPerPage, 
                last_message_id: lastMessageId,
                token: $rootScope.user.session.token
            });
        }

    };
});

app.factory('Utils', function() {
    var Utils;
    Utils = {
        datediff: function (d1, d2) {
            if (d1 instanceof Date) {
                d1 = Math.round(d1.getTime() / 1000);
            }
            if (d2 instanceof Date) {
                d2 = Math.round(d2.getTime() / 1000);
            }
            if (d1 > d2) {
                return;
            }
            var diff = d2 - d1;
            return {
                d1:      d1,
                d2:      d2,
                months:  Math.floor(diff / (24 * 3600 * 30.5)),
                days:    Math.floor(diff / (24 * 3600)),
                hours:   Math.floor(diff / 3600),
                minutes: Math.floor(diff / 60),
                seconds: diff
            };
        },

        parsedate: function (ts) {
            if (!ts) {
                return;
            }
            if (ts instanceof Date) {
                return ts;
            }
            ts = String(ts || '');
            var matches;
            if (matches = ts.match(/^\s*(\d+)\s*$/)) { // unix timestamp
                ts = new Date(matches[1] * 1000);
            }
            else if (matches = ts.match(/^\s*(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?(Z|[+-]\d{2}:\d{2})?\s*$/)) { // iso time
                ts = new Date(matches[1], matches[2], matches[3], matches[4], matches[5], matches[6], matches[7]);
                // TODO: support timezones
            }
            else {
                ts = new Date(ts);
            }
            return ts;
        },

        decline: function (n, w1, w24, w50) {
            if (!((n = Number(n)) && w1 && w24 && w50)) {
                return "";
            }
            var r = n % 100;
            if (r == 11 || r == 12 || r == 13 || r == 14) {
                return w50;
            }
            r = r % 10;
            if (r == 1) {
                return w1;
            }
            else if (2 <= r && r <= 4) {
                return w24;
            }
            else {
                return w50;
            }
        },

        nidedate: function (ts) {
            ts = Utils.parsedate(ts);
            if (!ts) {
                return ''
            }
            var wDayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
            var mNames = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
            var now = new Date();
            var time = (ts.getHours() > 9 ? ts.getHours() : '0' + ts.getHours()) + ':' +
                       (ts.getMinutes() > 9 ? ts.getMinutes() : '0' + ts.getMinutes());
            var res = '';
            if (ts.getYear() == now.getYear() && 
                ts.getMonth() == now.getMonth() &&
                ts.getDate() == now.getDate())
            {
                res = time;
            }
            else if (Math.abs(now.getTime() - ts.getTime()) / 1000 < 7 * 24 * 3600) {
                res = wDayNames[ts.getDay()] + '<br>' + time;
            }
            else {
                res = (ts.getDate() + 0) + ' ' + mNames[ts.getMonth()-1] + '<br>' + time;
            }
            return res;
        },

        date: function (ts) {
            ts = Utils.parsedate(ts);
            if (!ts) {
                return '';
            }
            var wDayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
            var mNames = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
            var res = wDayNames[ts.getDay()] + ', ' + (ts.getDate() + 0) + ' ' + mNames[ts.getMonth() - 1];
            return res;
        },

        time: function (ts) {
            ts = Utils.parsedate(ts);
            if (!ts) {
                return '';
            }
            var time = (ts.getHours() > 9 ? ts.getHours() : '0' + ts.getHours()) + ':' +
                       (ts.getMinutes() > 9 ? ts.getMinutes() : '0' + ts.getMinutes());
            return time;
        }
        
    };
    return Utils;
});

app.filter('nicedate', function (Utils, $sce) {
    return function  (ts) {
        return $sce.trustAsHtml(Utils.nicedate(ts));
    }
});

app.filter('date', function (Utils, $sce) {
    return function  (ts) {
        return $sce.trustAsHtml(Utils.date(ts));
    }
});

app.filter('time', function (Utils, $sce) {
    return function  (ts) {
        return $sce.trustAsHtml(Utils.time(ts));
    }
});

app.filter('hyperlink', function ($sce) {
    return function (ct) {
        if (!ct) {
            ct = '';
        }
        if (ct.match(/^(([\w_-]+\.)+\w{2,4})$/)) {
            ct = '<a href="http://' + RegExp.$1 + '/" target="_blank">' + RegExp.$1 + '</a>'; 
            return $sce.trustAsHtml(ct);
        }
        if (ct.match(/(\s|$)ios(\s|$)/i)) {
            ct = '<span class="i-chat__item__content__from__ios">отправлено из мобильного чата</span>';
            return $sce.trustAsHtml(ct);
        }
        ct = ct.replace(/[^\w_ \.-]/g,'');
        return $sce.trustAsHtml(ct);
    }
});

app.filter('splitlong', function ($sce) {
    return function (txt, len) {
        var re = new RegExp('(\\S{' + Number(len) + '})(\\S)', 'g');
        return (txt || '').replace(re, function () { 
            return RegExp.$1 + ' ' + RegExp.$2
        });
    };
});

app.filter('decline', function (Utils, $sce) {
    return function (num, text) {
        text = (text || '').split(',');
        text = Utils.decline(num, text[0], text[1], text[2]); 
        return text;
    }
});

app.directive('scrollBar', function ($timeout) {
    return function ($scope, element, attrs) {
        var plHndl, plOffset;
        var el = element[0];

        var scrl = baron({
            root:     $(element).closest('.b-baron__wrapper'),
            scroller: '.b-baron__scrollable',
            bar:      '.b-baron__bar',
            track:    '.b-baron__track',
            barOnCls: 'b-baron_active'
        });

        if (attrs.updateOn) {
            $scope.$watch(attrs.updateOn, function () {
                setTimeout(function () {
                    if (typeof plOffset == "number") {
                        el.scrollTop = el.scrollHeight - plOffset;
                        plOffset = undefined;
                    }
                    else {
                        switch (attrs.updateDirection) {
                            case 'bottom':
                                el.scrollTop = Math.max(el.scrollHeight - el.clientHeight, 0);
                                break;
                            case 'top':
                                el.scrollTop = 0;
                                break;
                        }
                    }
                    scrl.update();
                });
            });
        }

        if (attrs.progressiveLoad && attrs.progressiveLoadMargin) {
            element.on('scroll', function () {
                if (el.scrollTop < attrs.progressiveLoadMargin) {
                    clearTimeout(plHndl);
                    plHndl = setTimeout(function () {
                        plOffset = el.scrollHeight - el.scrollTop;
                        $scope[attrs.progressiveLoad]();
                        $scope.$apply();
                        scrl.update();
                    }, 250);
                }
            });
        }

        $scope.$on('layoutChange', function () {
            scrl.update();
        });
    };
});

app.directive('adjustMsgLine', function () {
    return function ($scope, element, attrs) {
        var $messages = $('.b-chat__messages', element);
        var $line = $('.b-chat__msgline', element);
        var $ta = $('.b-chat__msgline__input', $line);
        var messages = $messages[0];
        var line = $line[0];
        var ta = $ta[0];
        var mh = 74;
        $ta.on('keydown', function () {
            var ph = line.clientHeight;
            setTimeout(function() {
                ta.style.height = 0 + 'px';
                ta.style.height = Math.min(ta.scrollHeight, mh) + 'px';
                var nh = line.clientHeight;
                if (nh != ph) {
                    messages.style.bottom = line.clientHeight + 'px';
                    $scope.$broadcast('layoutChange');
                }
            });
        });
    }
});


app.controller('AppCtrl', function ($scope, Storage, Backend, $rootScope) {

    // Init global variables

    $rootScope.user = {};
    $rootScope.user.nickname = Storage.get('nickname');
    $rootScope.user.session = Storage.get('session') || {};

    $scope.clientType = window.top.document.location.hostname || 'getmoex.ru';

    if (!$rootScope.user.session.token 
        || ($rootScope.user.session.expires && new Date() > new Date($rootScope.user.session.expires_at || 0)))
    {
        Backend.initializeSession($scope.clientType).then(function(session) {
            Storage.set('session', session);
            $rootScope.user.session = session;
            $rootScope.currentChannelName = session.channel_name;
        });
    }

    $rootScope.currentChannelName = $rootScope.user.session.channel_name;
    $rootScope.channels = [];

    $scope.totalChannelMessages = 0;
    $rootScope.$watchCollection("channels", function () {
        var total = 0;
        for (var i = 0; i < $rootScope.channels.length; i++){
              total = total + ($rootScope.channels[i].messages_count || 0);
        }
        $scope.totalChannelMessages = total;
    });

    // TODO: init totalChannelMessages other way
    Backend.listChannels().then(function (data) {
        if (data.result == 'ok') {
            $rootScope.channels = data.channels;
        }
        else {
            $rootScope.channels = [];
        }
    });

    // buttons handler
    $scope.closeChat = function () {
        window.top.GETMOEX.closeChat();
    };

    $scope.channelsShown = true;
    $scope.toggleChannels = function () {
        if ($scope.channelsShown) {
            window.top.GETMOEX && window.top.GETMOEX.setWide(false);
            $scope.channelsShown = false;
        }
        else {
            window.top.GETMOEX && window.top.GETMOEX.setWide(true);
            $scope.channelsShown = true;
        }
    };

    $scope.toggleSettings = function () {
        $scope.settingsShown = !$scope.settingsShown;
    };

    // common fix-ups
    $('*[title]').tooltipster({
        theme: 'tooltipster-light'
    });
});

app.controller('PresentCtrl', function ($scope, Storage, $rootScope) {
    $scope.setNickname = function() {
        var nickname = $scope.nickname;
        $rootScope.user.nickname = nickname;
        Storage.set('nickname', nickname);
    };
});

app.controller('ChatCtrl', function ($scope, Pusher, Backend, $rootScope, Utils, $log) {

    $scope.messages = [];
    var pusher = null;

    function connectPusher () {
        if (pusher && pusher.channelName == $rootScope.currentChannelName) {
            return;
        }
        $log.log('Connecting to Pusher ' + $rootScope.currentChannelName);
        pusher = Pusher.connect($rootScope.currentChannelName);
        pusher.channel.bind('client-message', function (msg) {
            $scope.messages.push(msg);
            setSequenceFlags($scope.messages);
            $scope.$apply();
        });
        pusher.presence.bind('pusher:member_added', function () {
            $log.info('Member added', arguments);
        });
        pusher.presence.bind('pusher:member_removed', function () {
            $log.info('Member removed', arguments);
        });
    }
    connectPusher();
    $rootScope.$watch('currentChannelName', connectPusher);

    function setSequenceFlags (messages) {
        for (var i = 0; i < messages.length; i++) {
            messages[i].firstInSeq = (i == 0) || (messages[i-1].name != messages[i].name);
            messages[i].lastInSeq = (i == messages.length - 1) || (messages[i+1].name != messages[i].name);
            messages[i].date = messages[i].date || Utils.date(messages[i].timestamp);
            messages[i].firstOfTheDay = (i == 0) || (messages[i-1].date != messages[i].date);
            messages[i].fromLong = (messages[i].client_type || '').length >= (messages[i].text || '').length * 1.2;
        }
    }

    $scope.loadHistory = function () {
        var messages = $scope.messages;
        var lastMsgId;
        for (var i = 0; i < messages.length; i++) {
            lastMsgId = messages[i]._id;
            if (lastMsgId) break;
        }
        $scope.messagesLoading = true;
        Backend.messagesFetch($rootScope.currentChannelName, lastMsgId)
            .then(function (data) {
                var page = data.messages || [];
                page.reverse();
                messages.unshift.apply(messages, page);
                setSequenceFlags(messages);
                $scope.messagesLoading = false;
            })
            .catch(function () {
                $scope.messagesLoading = false;
            });
    };

    $scope.loadHistory();

    $rootScope.$watch("currentChannelName", function () {
        $scope.messages = [];
        $scope.loadHistory();
    });

    $scope.sendMessage = function () {
        var user = $rootScope.user;
        var message = {
            text:               $scope.newMessage,
            nickname:           user.nickname,
            name:               user.nickname,
            client_type:        user.session.client_type,
            anonymous:          true,
            anonymous_pic_url:  user.session.anonymous_pic_url,
            timestamp:          new Date()
        };
        var pusherMessage = angular.extend({}, message, { token: user.session.token });
        pusher.channel.trigger('client-message', pusherMessage);
        var scopeMessage = angular.extend({}, message, { my: true });
        $scope.messages.push(scopeMessage);
        setSequenceFlags($scope.messages);
        $scope.newMessage = '';
    };

    $scope.insertNickname = function(nickname) {
        nickname = nickname + ', ';
        var newMessage = typeof $scope.newMessage == 'string' ? $scope.newMessage : '';
        if (newMessage.indexOf(nickname) != 0) {
            $scope.newMessage = nickname + newMessage;
        }
    };

});

app.controller('ChannelsCtrl', function ($scope, $rootScope, Backend, $rootScope, Utils, $log) {
    Backend.listChannels().then(function(data) {
        if (data.result == 'ok') {
            $rootScope.channels = data.channels;
        }
        else {
            $rootScope.channels = [];
        }
    });

    $scope.joinChannel = function (name) {
        $rootScope.currentChannelName = name;
    };

    function createChannel(isPrivate) {
        var title = prompt('Введите название ' + (isPrivate ? 'приватного' : 'публичного') + ' канала');
        if (!title) return;
        $scope.channels.unshift({
            avatar: '/images/av3.png',
            title: title,
            members: 42,
            isPrivate: isPrivate,
            ts: new Date
        });
    }

    $scope.createPrivateChannel = function () { createChannel(true) };
    $scope.createPublicChannel = function () { createChannel(false) };
});
