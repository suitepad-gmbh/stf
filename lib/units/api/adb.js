var adbkit = require('adbkit')
var syrup = require('stf-syrup')

module.exports = syrup.serial()
    .define(function(options) {
        return adbkit.createClient({
            host: options.adbHost, 
            port: options.adbPort
        })
    })
