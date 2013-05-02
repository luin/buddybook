var apn = require('apn');

var errorCallback = function (errcode) {
  console.log('[APNS errorCallback]' + errcode);
};

var iosOption = {
  cert: __dirname + '/../keys/ios_cert.pem',
  key: __dirname + '/../keys/ios_key.pem',
  errorCallback: errorCallback
};

var iosSandboxOption = {
  cert: __dirname + '/../keys/ios_sandbox_cert.pem',
  key: __dirname + '/../keys/ios_sandbox_key.pem',
  gateway: 'gateway.sandbox.push.apple.com',
  errorCallback: errorCallback
};

var apnsConnections = {
  IOS: new apn.Connection(iosOption),
  IOS_SANDBOX: new apn.Connection(iosSandboxOption)
};

var push = function (data) {
  var connection = apnsConnections[data.type];
  console.log('[APNS] Push to ' + data.token + ', Type: ' + data.type);
  if (connection) {
    var note = new apn.Notification();
    note.badge = data.data.badge || {};
    note.sound = data.data.sound;
    note.alert = data.data.alert;
    var device = new apn.Device(data.token);
    connection.pushNotification(note, device);
  }
};

exports.changeDescription = function (users) {
  users.forEach(function (user) {
    if (!user || !user.device || !user.device.token) {
      return;
    }
    push({
      type: user.device.type,
      token: user.device.token,
    });
  });
};

exports.addDeal = function (user, amount, title) {
  if (!user || !user.device || !user.device.token) {
    return;
  }
  user.unreadCount(function (err, unreadCount) {
    push({
      type: user.device.type,
      token: user.device.token,
      data: {
        alert: {
          'loc-key': 'NEW_DEAL_PF',
          'loc-args': [title, ((amount > 0) ? '+' : '-') + Math.abs(amount)]
        },
        badge: unreadCount,
        sound: 'default'
      }
    });
  });
};

exports.deleteDeal = function (user) {
  console.log('[APNS delete]');
  console.log(user);
  if (!user || !user.deviceToken) {
    return;
  }
  user.unreadCount(function (err, unreadCount) {
    console.log(unreadCount);
    push({
      type: user.deviceType,
      token: user.deviceToken,
      data: {
        badge: unreadCount
      }
    });
  });
};
