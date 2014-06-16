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
            user_id:        33,
            nickname:       'Pupkin',
            client_type:    'web',
            text:           'Hello there!',
            avatar:         '123'
        },
        {
            user_id:        44,
            nickname:       'Bilbo',
            client_type:    'ios',
            text:           'howdy ?',
            avatar:         '456'
        }
    ];

    function appendMessage(data) {
        $scope.messages.push(data);
    }

    function sendMessage() {
        var msg = $scope.newMessage;
        $scope.messageSending = true;

        Backend.sendMessage(msg)
            .success(function() {
                appendMessage({
                    self:           true,
                    text:           msg,
                    user_id:        0,    // TODO: self user id
                    nickname:       'me', // TODO: self nickname
                    client_type:    'web'
                });
                $scope.newMessage = '';
                $scope.messageSending = false;
            })
            .error(function() {
                // TODO: display error
                $scope.messageSending = false;
            });
    }

    $scope.sendMessage = sendMessage;
    Pusher.channel.bind('client-message-test', function(data) {
        appendMessage(data);
        $scope.$apply();
    });
});

