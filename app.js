const express = require('express')
var createError = require('http-errors')
const app = express()
const port = 3000
const cron = require('node-cron');
const { JsonDB, Config } = require('node-json-db');
const cors = require('cors');
const axios = require('axios');

app.use(express.json()); // Add this line
app.use(cors()); // Add this line

var db = new JsonDB(new Config("map", true, false, '/'));

cron.schedule('* * * * *', () => {
  console.log('running a task every minute');
  console.log(Date.now());
});

cron.schedule("*/10 * * * * *", async function() {
  console.log("running a task every 10 second");
  const response = await axios.get('http://192.168.0.18/sensor2');
  try {
    await db.push("/sensors/1", [{
      "id": "sensor1",
      "name": "humedad",
      "value": response.data.hum,
      "timestamp": Date.now()
    }], false);
  await db.push("/sensors/2", [{
    "id": "sensor2",
    "name": "temperatura",
    "value": response.data.temp,
    "timestamp": Date.now()
  }], false);
  await db.push("/sensors/3", [{
    "id": "sensor3",
    "name": "lightStatus",
    "value": (response.data.lightStatus == 1 ? "ON" : "OFF"),
    "timestamp": Date.now()
  }], false);
  } catch (error) {
    console.log('%capp.js line:22 error', 'color: #007acc;', error);
  }
});

app.get('/', (req, res) => {
  res.send('Hello World!')
})


app.get('/zones', async (req, res) => {
  console.log('%capp.js line:53 "[zoneszoneszoneszones]"', 'color: #007acc;', "[zoneszoneszoneszones]");
  const data = {};
  try {
    var sensor1Data = await db.getData("/sensors/1");
    var sensor2Data = await db.getData("/sensors/2");
    var sensor3Data = await db.getData("/sensors/3");
    data.zones =  [{
      "id": "zone1",
      "name": "Zona 1",
      "sensors": [
        sensor1Data,
        sensor2Data,
        sensor3Data
      ]
    }];
  } catch (error) {
    data.error = {
      code: "ERROR_GETTING_ZONES",
      message: error
    };
  } finally {
    res.json(data);
  }
})

app.get('/plants', async (req, res) => {
  const data = {};
  try {
    var allPlants = await db.getData("/plants");
    data.plants = allPlants;
  } catch (error) {
    data.error = {
      code: "ERROR_GETTING_PLANTS",
      message: error
    };
  }
  res.json(data);
})

app.get('/switch-light', async (req, res) => {
  const data = {};
  try {
    const response = await axios.get('http://192.168.0.18/switch-light');
    console.log('%capp.js line:100 response', 'color: #007acc;', response.data.message);
    data.lightStatus = response.data.message;
  } catch (error) {
    data.error = {
      code: "ERROR_GETTING_PLANTS",
      message: error
    };
  }
  res.json(data);
})

app.get('/plants/:id', async (req, res) => {
  const data = {};
  try {
    var plant = await db.getData(`/plants/${req.params.id-1}`);
    data.plant = plant;
    res.json(data);
  } catch (error) {
    data.error = {
      code: "PLANT_NOT_FOUND",
      message: "Plamp not found!"
    };
  }
  res.json(data);
})

app.post('/sensor/:sensorId', (req, res) => {
    res.send(`Got a POST request to ${req.params.sensorId}`)
  })

  app.post('/plants', async (req, res) => {
    console.log('%capp.js line:44 req.body', 'color: #007acc;', req.body);
    if (!req.body.plant) {
      res.send(`INVALID POST request`)
      return false;
    }
    if (!req.body.plant.id) {
      var allPlants = await db.getData("/plants");
      console.log('%capp.js line:53 allPlants', 'color: #007acc;', allPlants);
      //get the next available id for plant
      var maxId = 0;
      allPlants.forEach(plant => {
        if (plant.id > maxId) {
          maxId = plant.id;
        }
      });
      req.body.plant.id = Number(maxId) + 1;
    }
    if (!req.body.plant.history) {
      req.body.plant.history = [];
    }
    console.log('%capp.js line:48 req.body.plant.history', 'color: #007acc;', req.body.plant);
    await db.push("/plants", [req.body.plant], false);
    res.send(`Got a POST request to ${req.params.sensorId}`)
  })

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})