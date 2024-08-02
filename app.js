const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

const app = express()
const dbPath = path.join(__dirname, 'covid19India.db')

app.use(express.json())
let db = null

const inizializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error : ${e.message}`)
    process.exit(1)
  }
}

inizializeDbAndServer()

const DbObjTOJsonObjstates = state => {
  return {
    stateId: state.state_id,
    stateName: state.state_name,
    population: state.population,
  }
}

const DbObjToJsonObjForDistrict = district => {
  return {
    districtId: district.district_id,
    districtName: district.district_name,
    stateId: district.state_id,
    cases: district.cases,
    cured: district.cured,
    active: district.active,
    deaths: district.deaths,
  }
}

// API 1
app.get('/states/', async (req, res) => {
  const getStatesQuery = `
        Select * from State;
    `
  const StatesList = await db.all(getStatesQuery)
  res.send(StatesList.map(eachState => DbObjTOJsonObjstates(eachState)))
})

// API 2
app.get('/states/:stateId/', async (req, res) => {
  const {stateId} = req.params
  const getStateQuery = `
  Select * from State
  where state_id = '${stateId}';`
  const state = await db.get(getStateQuery)
  res.send(DbObjTOJsonObjstates(state))
})

// API 3
app.post('/districts/', async (req, res) => {
  const {districtName, stateId, cases, cured, active, deaths} = req.body
  const addDistrictQuery = `
  Insert into District (district_name,state_id,cases,cured,active,deaths)
  values ('${districtName}','${stateId}','${cases}','${cured}','${active}','${deaths}'); `
  await db.run(addDistrictQuery)
  res.send('District Successfully Added')
})

// API 4
app.get('/districts/:districtId/', async (req, res) => {
  const {districtId} = req.params
  const getDistrictQuery = `
  select * from District
  where district_id = '${districtId}';`
  const district = await db.get(getDistrictQuery)
  res.send(DbObjToJsonObjForDistrict(district))
})

// API 5
app.delete('/districts/:districtId/', async (req, res) => {
  const {districtId} = req.params
  const deleteQuery = `
  delete from District 
  where district_id = '${districtId}';`
  await db.run(deleteQuery)
  res.send('District Removed')
})

//API-6
app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const updateDistrictQuery = `
        UPDATE 
            district
        SET 
            district_name='${districtName}',
            state_id=${stateId},
            cases=${cases},
            cured=${cured},
            active=${active},
            deaths=${deaths}
        WHERE 
            district_id=${districtId};
    `
  await db.run(updateDistrictQuery)
  response.send('District Details Updated')
})

const getStateStatesResponse = dbObject => {
  return {
    totalCases: dbObject['SUM(cases)'],
    totalCured: dbObject['SUM(cured)'],
    totalActive: dbObject['SUM(active)'],
    totalDeaths: dbObject['SUM(deaths)'],
  }
}

//API-7
app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getStatsQuery = `
        SELECT 
            SUM(cases),
            SUM(cured),
            SUM(active),
            SUM(deaths)
        FROM 
            district
        WHERE 
            state_id=${stateId}
    `
  const stateStats = await db.get(getStatsQuery)
  response.send(getStateStatesResponse(stateStats))
})

//API-8
app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictName = `
        SELECT
            state_name
        FROM
            district
        NATURAL JOIN
            state
        WHERE 
            district_id=${districtId};
    `
  const stateName = await db.get(getDistrictName)
  response.send({
    stateName: stateName.state_name,
  })
})

module.exports = app
