var _ = require('lodash')
var Promise = require('bluebird')

var dbapi = require('../../../db/api')
var logger = require('../../../util/logger')
var datautil = require('../../../util/datautil')
var syrup = require('stf-syrup')

var log = logger.createLogger('api:controllers:devices')

module.exports = {
  getDevices: getDevices
, getDeviceBySerial: getDeviceBySerial
, unlockDevice: unlockDevice
, lockDevice: lockDevice
}

function getDevices(req, res) {
  var fields = req.swagger.params.fields.value

  dbapi.loadDevices()
    .then(function(cursor) {
      return Promise.promisify(cursor.toArray, cursor)()
        .then(function(list) {
          var deviceList = []

          list.forEach(function(device) {
            datautil.normalize(device, req.user)
            var responseDevice = device

            if (fields) {
              responseDevice = _.pick(device, fields.split(','))
            }
            deviceList.push(responseDevice)
          })

          res.json({
            success: true
          , devices: deviceList
          })
        })
    })
    .catch(function(err) {
      log.error('Failed to load device list: ', err.stack)
      res.status(500).json({
        success: false
      })
    })
}

function getDeviceBySerial(req, res) {
  var serial = req.swagger.params.serial.value
  var fields = req.swagger.params.fields.value

  dbapi.loadDevice(serial)
    .then(function(device) {
      if (!device) {
        return res.status(404).json({
          success: false
        , description: 'Device not found'
        })
      }

      datautil.normalize(device, req.user)
      var responseDevice = device

      if (fields) {
        responseDevice = _.pick(device, fields.split(','))
      }

      res.json({
        success: true
      , device: responseDevice
      })
    })
    .catch(function(err) {
      log.error('Failed to load device "%s": ', req.params.serial, err.stack)
      res.status(500).json({
        success: false
      })
    })
}


function unlockDevice(req, res) {
  var serial = req.swagger.params.serial.value
  log.info('requesting device unlock ' + serial)
  syrup.serial()
    .dependency(require('../adb'))
    .define(function (options, adb) {
      adb.listDevices()
        .then(function (devices) {
          var isFound = devices.filter(device => device.id === serial).length === 1
          if (isFound) {
            adb.shell(serial, 'am broadcast -a de.suitepad.app.jailable.init.d.JailInitService -eaction stop')
              .timeout(5000)
              .then(function (out) {
                res.status(200).json({
                  success: true,
                  message: 'device unlocked'
                })
              })
              .catch(function (err) {
                log.error(err)
                res.status(500).json({
                  success: false,
                  message: 'Internal server error'
                })
              })
          } else {
            log.error('Device not found')
            res.status(404).json({
              success: false,
              message: 'Device not found'
            })
          }
        })
        .catch(function (err) {
          log.error(err)
          if (err && err.code === 'ECONNREFUSED') {
            res.status(500).json({
              success: false,
              message: 'adb server unreachable'
            })
          } else {
            res.status(500).json({
              success: false,
              message: 'Internal server error'
            })
          }
        })
    })
    .consume()
    .catch(function (err) {
      log.error(err)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    })
}

function lockDevice(req, res) {
  var serial = req.swagger.params.serial.value
  log.info('requesting device lock ' + serial)
  syrup.serial()
    .dependency(require('../adb'))
    .define(function (options, adb) {
      adb.listDevices()
        .then(function (devices) {
          var isFound = devices.filter(device => device.id === serial).length === 1
          if (isFound) {
            adb.shell(serial, 'am broadcast -a de.suitepad.app.jailable.init.d.JailInitService -eaction start')
              .timeout(5000)
              .then(function (out) {
                res.status(200).json({
                  success: true,
                  message: 'device locked'
                })
              })
              .catch(function (err) {
                log.error(err)
                res.status(500).json({
                  success: false,
                  message: 'Internal server error'
                })
              })
          } else {
            log.error('Device not found')
            res.status(404).json({
              success: false,
              message: 'Device not found'
            })
          }
        })
        .catch(function (err) {
          log.error(err)
          if (err && err.code === 'ECONNREFUSED') {
            res.status(500).json({
              success: false,
              message: 'adb server unreachable'
            })
          } else {
            res.status(500).json({
              success: false,
              message: 'Internal server error'
            })
          }
        })
    })
    .consume()
    .catch(function (err) {
      log.error(err)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    })
}
