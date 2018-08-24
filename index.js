const checkLinks = require('check-links')
const notifier = require('node-notifier')
const path = require('path')

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

    let message = '';

    for (let i = 0; i < urlList.length; i++) {

        if (resultsFetch[urlList[i]].statusCode != 200) {
            console.log(`${urlList[i]} `, resultsFetch[urlList[i]])
            message += '\n' + urlList[i]
        }

    }
    
    if (message.length > 0) {
        notifier.notify({
            title: 'Sites fora do ar!',
            message: 'Os sites estão fora do ar:' + message,
            icon: path.join(__dirname, 'error-icon.png'),
            sound: true
        })
    }

}
