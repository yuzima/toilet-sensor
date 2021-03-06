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
  logger.info('Start to sense')
  readInput(PIN).then((pinValue) => {
    prevStatus = pinValue
  })
  setInterval(checkStatus, DOOR_UPDATE_FREQ)
})

// Reads the value of a pin, returning a promise of the result
function readInput(pin) {
  return gpiop.read(pin)
}

// check the status of the door and update slack if necessary
async function checkStatus () {
  const curStatus = await readDoor()
  if (curStatus !== prevStatus) {
    logger.info('Door changed to ' + curStatus)
    const msg = {
      status: curStatus,
      timestamp: new Date().getTime()
    }
    notifyBot(msg)
  }
  prevStatus = curStatus
}

// Check if the door is open or closed
async function readDoor () {
  const pinValue = await readInput(PIN)
  return pinValue ? DOOR_OCCUPIED : DOOR_FREE
}

function notifyBot(body) {
  fetch(`https://young-taiga-63010.herokuapp.com/hubot/toilet/${config.toiletId}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' }
  })
  .then(res => logger.info(res.json()))
  .catch(err => logger.error(err))
}