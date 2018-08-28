const checkLinks = require('check-links')
const notifier = require('node-notifier')
const path = require('path')
const fs = require('fs')
const mustache = require('mustache')

const urlList = require('./url-list')

async function runTests() {

    let results

    try {
        results = await checkLinks(urlList)
    } catch (e) {
        console.log(e)
    }

    return displayData(results)

}

// setInterval(() => {
//     runTests()
// }, 1000 * 60)

runTests()

function displayData(resultsFetch) {

    let month = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

    let reportData = {};
    let date = new Date();
    
    reportData.filename = `${date.getFullYear()}${month[date.getMonth()]}${date.getDate()}-${date.getHours()}${('0'+date.getMinutes()).slice(-2)}`;
    reportData.datetime = `${date.getDate()}/${month[date.getMonth()]}/${date.getFullYear()} - ${date.getHours()}:${('0'+date.getMinutes()).slice(-2)}`;
    reportData.results = [];

    for (let i = 0; i < urlList.length; i++) {

        if (resultsFetch[urlList[i]].statusCode != 200) {

            let offlineResult = {};

            offlineResult.url = urlList[i]
            offlineResult.status = resultsFetch[urlList[i]].status
            offlineResult.code = resultsFetch[urlList[i]].statusCode
            reportData.results.push(offlineResult)

            console.log(`${urlList[i]} `, resultsFetch[urlList[i]])

        }

    }
    
    if (reportData.results.length > 0) {

        notifier.notify({
            title: '🚧 Relatório SENTINEL 🚧',
            message: 'Alguns sites estão fora do ar.\nVerifique o último relatório gerado!',
            icon: path.join(__dirname, 'error-icon.png'),
            sound: true
        })
        
        let template = fs.readFileSync("./reports/template.html", "utf8")

        writeReport(template, reportData)

    }

}

function writeReport(template, data) {

    let html = mustache.to_html(template, data)
    fs.writeFileSync(`./reports/${data.filename}.html`, html)

}
