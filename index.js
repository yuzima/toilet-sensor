const gpio = require('rpi-gpio')
const gpiop = gpio.promise
const fs = require('fs')
const path = require('path')
const logger = require('./logger')
const fetch = require('node-fetch')

const DOOR_UPDATE_FREQ = 1000 // frequency to check door and update
const DOOR_FREE = false
const DOOR_OCCUPIED = true

// let prevMsgTimestamp
let prevStatus = DOOR_FREE

// config
const defaultConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '/config.json'), 'utf8'))
const config = Object.assign({}, defaultConfig, process.env)

const PIN = config.pin
gpiop.setup(PIN, gpiop.DIR_IN).then(() => {
  run()
})

function run() {
  readInput(PIN)
  // Keep checking door every so often
  setInterval(checkStatus, DOOR_UPDATE_FREQ)
}

// Reads the value of a pin, returning a promise of the result
function readInput(pin) {
  return new Promise((resolve, reject) => {
    gpiop.read(pin, function (err, value) {
      if (err) {
        reject(err)
        return
      }
      resolve(value)
    })
  })
}

// check the status of the door and update slack if necessary
async function checkStatus () {
  const curStatus = await readDoor()
  if (curStatus !== prevStatus) {
    prevStatus = curStatus
    logger.info('Door changed to ' + curStatus)
    const msg = {
      status: curStatus,
      timestamp: new Date().getTime()
    }
    notifyBot(msg)
    // const msg = (curStatus === DOOR_FREE ? OPEN_MESSAGE : CLOSED_MESSAGE)
    // update and save the timestamp of the message
    // const timestamp = await updateSlack(msg, prevMsgTimestamp)
    // prevMsgTimestamp = timestamp
  }
}

// Check if the door is open or closed
async function readDoor () {
  const pinValue = await readInput(PIN)
  logger.info('Read Door Status: ' + pinValue)
  return pinValue ? DOOR_OCCUPIED : DOOR_FREE
}

function notifyBot(body) {
  fetch(`https://young-taiga-63010.herokuapp.com/hubot/toilet/${config.toiletId}`, {
    method: 'POST',
    body: JSON.stringify(body),
    header: { 'Content-Type': 'application/json' }
  })
  .then(res => logger.info(res.json()))
  .catch(err => logger.error(err))
}