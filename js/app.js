var CONFIG = {
    pusherAppKey: 'b139f2a300b26850df94',
    pusherOptions: {
         authTransport: 'jsonp',
         authEndpoint:  'http://auth.getmoex.ru/pusher/jauth'
    },
    apiBase: 'http://auth.getmoex.ru/api'
};

var app = angular.module('GetmoexApp', ['ngCookies']);

app.factory('Pusher', function () {
    var pusher = new Pusher(CONFIG.pusherAppKey, CONFIG.pusherOptions);
    var channel = pusher.subscribe('moex-global');
    return {
        pusher: pusher,
        channel: channel
    };
});

app.factory('Backend', function ($http, $q) {
    function test(data) {
        var d = $q.defer();
        setTimeout(function() { d.resolve(data) }, 300);
        var p = d.promise;
        p.success = function(cb) { p.then(cb); return p};
        p.error = function(cb) { p.then(null, cb); return p};
        return p;
    }
    return {

        initializeSession: function (clientType, nick) {
            return test({ token: 'lolwhat' });

            return $http({ 
                method: 'POST', 
                url: CONFIG.apiBase + '/v1/initialize_session',
                data: {
                    client_type: clientType
                }
            });
        }, 


        loadHistory: function (id) {
        },

        sendMessage: function (text) {
            return test({});
        },

        getSession: function () {
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
        var time = (ts.getMinutes() > 9 ? ts.getMinutes() : '0' + ts.getMinutes()) + ':' + 
                   (ts.getSeconds() > 9 ? ts.getSeconds() : '0' + ts.getSeconds());
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

app.controller('AppCtrl', function ($scope, $cookies, Backend) {
    $scope.token = $cookies.token;
    $scope.nickname = $cookies.nickname;
});

app.controller('LoginCtrl', function ($scope, $location, $cookies, Backend) {
    $scope.doLogin = function() {
        var nickname = $scope.nickname;
        var clientType = $location.search()['client_type'];
        Backend.initializeSession(clientType, nickname)
            .success(function(data) {
                $scope.token = data.token;
                $cookies.token = data.token;
                $cookies.nickname = nickname;
            })
            .error(function() {
                // TODO: error handling
            });
    };
});

app.controller('ChatCtrl', function ($scope, Pusher, Backend) {

    $scope.messages = [
        {
            type:           'incoming',
            user_id:        33,
            nickname:       'Pupkin',
            client_type:    'web',
            text:           'Hello there!',
            avatar_url:     '/images/av1.png',
            timestamp:      new Date(2012, 12, 12, 12, 12)
        },
        {
            type:           'incoming',
            user_id:        44,
            nickname:       'Bilbo',
            client_type:    'ios',
            text:           'howdy ?',
            avatar_url:     '/images/av2.png',
            timestamp:      new Date(2014, 2, 2, 15, 15)
        }
    ];

    function appendMessage(msg) {
        $scope.messages.push(msg);
    }

    $scope.sendMessage = function () {
        var msg = $scope.newMessage;
        $scope.messageSending = true;

        // TODO: send directly to pusher
        // Pusher.channel.trigger('client-message', {
        //     message: msg,
        //     anonymous_pic_url: '/images/av3.png',
        //     token: $scope.token
        // });

        Backend.sendMessage(msg)
            .success(function() {
                appendMessage({
                    type:           'outgoing',
                    self:           true,
                    text:           msg,
                    user_id:        0,     // TODO: self user id
                    nickname:       'nuf', // TODO: self nickname
                    client_type:    'web',
                    avatar_url:     '/images/av3.png',
                    timestamp:      new Date()
                });
                $scope.newMessage = '';
                $scope.messageSending = false;
            })
            .error(function() {
                // TODO: display error
                $scope.messageSending = false;
            });
    }

    Pusher.channel.bind('client-message', function(msg) {
        msg.type = 'incoming';
        msg.timestamp = new Date(msg.timestamp * 1000);
        appendMessage(msg);
        $scope.$apply();
    });
});

