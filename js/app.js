var CONFIG = {
    messagesPerPage: 20,
    pusherAppKey: 'b139f2a300b26850df94',
    pusherOptions: {
         authTransport: 'jsonp',
         authEndpoint:  'http://auth.getmoex.ru/pusher/jauth'
    },
    apiBase: 'http://auth.getmoex.ru/api'
};

var app = angular.module('GetmoexApp', []);

app.factory('Pusher', function (Global) {
    var pusherOptions = angular.extend({}, CONFIG.pusherOptions);
    pusherOptions.authEndpoint = pusherOptions.authEndpoint + '/' + Global.user.session.token;
    var pusher = new Pusher(CONFIG.pusherAppKey, pusherOptions);
    var channel = pusher.subscribe(Global.user.session.channel_name);
    return {
        pusher: pusher,
        channel: channel
    };
});

app.factory('Global', function () {
    return { };
});

app.factory('Storage', function () {
    var ls = window.localStorage;
    return {
        get: function (key) {
            try {
                return angular.fromJson(ls[key]);
            }
            catch (e) {
                return null;
            }
        },
        set: function (key, val) {
            ls[key] = angular.toJson(val);
        },
        del: function (key) {
            delete ls[key];
        }
    }
});

app.factory('Backend', function ($http, $q, Global) {

    function fake(data) {
        var d = $q.defer();
        setTimeout(function() { d.resolve(data) }, 300);
        var p = d.promise;
        p.success = function(cb) { p.then(cb); return p};
        p.error = function(cb) { p.then(null, cb); return p};
        return p;
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
        return $http.jsonp(url);
    }

    return {

        initializeSession: function (clientType) {
            return callJSONP('initialize_session', { 
                client_type: clientType 
            }); 
        }, 

        messagesFetch: function (lastMessageId) {
            return callJSONP('messages/fetch', { 
                channel: Global.user.session.channel_name,
                per_page: CONFIG.messagesPerPage, 
                last_message_id: lastMessageId,
                token: Global.user.session.token
            });
        }

    };
});

app.factory('Utils', function() {
    return {
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
            else if (ts.match(/^\s*(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})\s*$/)) { // iso time
                ts = new Date(matches[1], matches[2], matches[3], matches[4], matches[5], matches[6]);
            }
            else {
                ts = new Date(ts);
            }
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
        }
        
    };
});


app.filter('nicedate', function(Utils, $sce) {
    return function  (ts) {
        ts = Utils.parsedate(ts);
        if (!ts) {
            return '';
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
            res = (ts.getDate() + 0) + ' ' + mNames[ts.getMonth()] + '<br>' + time;
        }
        return $sce.trustAsHtml(res);
    }
});

app.directive('scrollBar', function ($timeout) {
    return function ($scope, element, attrs) {
        var plHndl, plOffset;
        var el = element[0];

        el.scrollTop = Math.max(el.scrollHeight - el.clientHeight, 0);

        if (attrs.updateOn) {
            $scope.$watch(attrs.updateOn, function () {
                setTimeout(function () {
                    if (typeof plOffset == "number") {
                        el.scrollTop = el.scrollHeight - plOffset;
                        plOffset = undefined;
                    }
                    else {
                        el.scrollTop = Math.max(el.scrollHeight - el.clientHeight, 0);
                    }
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
                    }, 250);
                }
            });
        }
    };
});

app.controller('AppCtrl', function ($scope, $location, Storage, Backend, Global) {

    var user = {};
    user.nickname = Storage.get('nickname');
    user.session = Storage.get('session');

    if (!user.session || !user.session.token 
        || (user.session.expires && new Date() > new Date(user.session.expires_at || 0)))
    {
        var clientType = $location.search()['client_type'] || 'getmoex.ru';
        Backend.initializeSession(clientType)
            .success(function(session) {
                if (session.result != "ok") return;
                Storage.set('session', session);
                user.session = session;
            });
    }

    $scope.user = Global.user = user;
});

app.controller('PresentCtrl', function ($scope, Storage, Global) {
    $scope.setNickname = function() {
        var nickname = $scope.nickname;
        Global.user.nickname = nickname;
        Storage.set('nickname', nickname);
    };
});

app.controller('ChatCtrl', function ($scope, Pusher, Backend, Global) {

    $scope.messages = [];

    $scope.loadHistory = function () {
        var messages = $scope.messages;
        var lastMsgId;
        for (var i = 0; i < messages.length; i++) {
            lastMsgId = messages[i]._id;
            if (lastMsgId) break;
        }
        $scope.messagesLoading = true;
        Backend.messagesFetch(lastMsgId)
            .success(function (data) {
                if (data.result != "ok") return;
                var page = data.messages || [];
                page.reverse();
                messages.unshift.apply(messages, page);
            })
            .then(function () {
                $scope.messagesLoading = false;
            });
    };

    $scope.loadHistory();

    $scope.sendMessage = function () {
        var user = Global.user;
        var message = {
            text:               $scope.newMessage,
            nickname:           user.nickname,
            client_type:        user.session.client_type,
            anonymous:          true,
            anonymous_pic_url:  user.session.anonymous_pic_url,
            timestamp:          new Date()
        };
        var pusherMessage = angular.extend({}, message, { token: user.session.token });
        Pusher.channel.trigger('client-message', pusherMessage);
        var scopeMessage = angular.extend({}, message, { my: true });
        $scope.messages.push(scopeMessage);
        $scope.newMessage = '';
    };

    Pusher.channel.bind('client-message', function(msg) {
        $scope.messages.push(msg);
        $scope.$apply();
    });

});

