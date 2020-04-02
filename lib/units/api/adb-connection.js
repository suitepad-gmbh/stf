const adbkit = require('adbkit')
var adbclient

module.exports = function(options) {
    adbclient = adbkit.createClient({
        host: options.adbHost, 
        port: options.adbPort
    })
}

module.exports.get = function() {
    return adbclient
}
