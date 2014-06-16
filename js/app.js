var CONFIG = {
    pusherAppKey: 'b139f2a300b26850df94',
    pusherOptions: {}
};

var getmoexApp = angular.module('GetmoexApp', []);

getmoexApp.factory('Pusher', function () {
    var pusher = new Pusher(CONFIG.pusherAppKey, CONFIG.pusherOptions);
    var channel = pusher.subscribe('moex-global');
    // channel.bind('client-message', function(data) {
    //     alert(data.message);
    // });
    return {
        pusher: pusher,
        channel: channel
    };
});

getmoexApp.factory('Backend', function ($http, $q) {
    function test(data) {
        var d = $q.defer();
        setTimeout(function() { d.resolve(data) }, 300);
        var p = d.promise;
        p.success = function(cb) { p.then(cb); return p};
        p.error = function(cb) { p.then(null, cb); return p};
        return p;
    }
    return {

        loadHistory: function (id) {
        },

        sendMessage: function (text) {
            return test({});
        },

        getSession: function () {
        }
    };
});

getmoexApp.controller('ChatCtrl', function ($scope, Pusher, Backend) {

    $scope.messages = [
        {
            type:           'incoming',
            user_id:        33,
            nickname:       'Pupkin',
            client_type:    'web',
            text:           'Hello there!',
            avatar_url:     '/img/av1.png'
        },
        {
            type:           'incoming',
            user_id:        44,
            nickname:       'Bilbo',
            client_type:    'ios',
            text:           'howdy ?',
            avatar_url:     '/img/av2.png'
        }
    ];

    function appendMessage(msg) {
        $scope.messages.push(msg);
    }

    $scope.sendMessage = function () {
        var msg = $scope.newMessage;
        $scope.messageSending = true;

        Backend.sendMessage(msg)
            .success(function() {
                appendMessage({
                    type:           'outgoing',
                    self:           true,
                    text:           msg,
                    user_id:        0,     // TODO: self user id
                    nickname:       'nuf', // TODO: self nickname
                    client_type:    'web',
                    avatar_url:     '/img/av3.png',
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

    Pusher.channel.bind('client-message-test', function(msg) {
        msg.type = 'incoming';
        msg.timestamp = new Date(msg.timestamp * 1000);
        appendMessage(msg);
        $scope.$apply();
    });
});

