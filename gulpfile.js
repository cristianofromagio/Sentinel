// https://blog.nodeswat.com/simple-node-js-and-slack-webhook-integration-d87c95aa9600

const glob = require('glob');
const path = require('path');
const util = require('util');
const https = require('https');

const notifier = require('node-notifier');
const gulp = require('gulp');
const rename = require('gulp-rename');
const PluginError = require('plugin-error');
const { TaskTimer } = require('tasktimer');
const argv = require('yargs').argv;
const tcpp = require('tcp-ping');
const tcpprobe = util.promisify(tcpp.probe);

const urls = require('./watchable-list');
const configs = require('./configs');
const urlPromises = [];

function sendSlackMessage (webhookURL, messageBody) {
  try {
    messageBody = JSON.stringify(messageBody);
  } catch (e) {
    throw new Error('Failed to stringify messageBody', e);
  }
  return new Promise((resolve, reject) => {
    const requestOptions = {
      method: 'POST',
      header: {'Content-Type': 'application/json' }
    };
    const req = https.request(webhookURL, requestOptions, (res) => {
      let response = '';
      res.on('data', (d) => {
        response += d;
      });
      res.on('end', () => {
        resolve(response);
      })
    });
    req.on('error', (e) => {
      reject(e);
    });
    req.write(messageBody);
    req.end();
  });
}

function probeAll(promises) {
    return Promise.all(promises)
        .then((result) => {
            let currentDate = new Date();
            console.log('Último scan em: ' + currentDate);
            handleNotifications(result);
        })
        .catch((err) => {
            console.error('deu ruim');
            console.log(err);
        });
}

function nativeNotification(offlineArray, message) {
    if (offlineArray.length > 0) {
        notifier.notify({
            title: '🚧 SENTINEL ('+offlineArray.length+') 🚧',
            message: 'Serviços fora do ar! Veja o último scan:\n\n' + message
        });
    } else {
        notifier.notify({
            title: '🚧 SENTINEL 🚧',
            message: message
        });
    }
}

function slackNotification(offlineArray, offlineArrayMessage) {

    if (offlineArray.length >= 1) {

        let textPayload = 'De acordo com o último scan, este serviço está fora do ar.';
        if (offlineArray.length > 1) {
            textPayload = 'De acordo com o último scan, estes ('+ offlineArray.length +') serviços estão fora do ar.';
        }

        const msgPayload = {
            'text': textPayload,
            'attachments': [
                {
                    'fallback': offlineArrayMessage,
                    'color': '#eed140',
                    'fields': [
                        {
                            'title': 'Serviços com instabilidade',
                            'value': offlineArrayMessage,
                            'short': false
                        }
                    ]
                }
            ]
        };

        return sendSlackMessage(configs.slackWebhooUrl, msgPayload);
    
    }

}

function handleNotifications(probeResult) {
    let trueSize = probeResult.filter((res) => res);

    if (trueSize.length != probeResult.length) {
        
        let sitesFora = [];
        for (var k = 0; k < probeResult.length; k++) {
            if (!probeResult[k]) {
                sitesFora.push(urls[k]);
            }
        }

        let offlineArrayMessage = '';
        for (var x = 0; x < sitesFora.length; x++) {
            offlineArrayMessage += sitesFora[x] + '\n';
        }

        nativeNotification(sitesFora, offlineArrayMessage);
        slackNotification(sitesFora, offlineArrayMessage);
    }
}

gulp.task('prepare', function (done) {
    for (var i = 0; i < urls.length; i++) {
        urlPromises.push(tcpprobe(urls[i], 80));
    }
    done();
});

gulp.task('ping', function() {
    return probeAll(urlPromises);
});

gulp.task('start-timer', function() {
    const timer = new TaskTimer(1000 * 60 * 5);
    timer.on('tick', () => probeAll(urlPromises));
    timer.start();
    probeAll(urlPromises); // run one time
});

gulp.task('greetings', function(done) {
    // return sendSlackMessage(configs.slackWebhooUrl, { text: 'O @Joao roubou pão na casa do @Joao' });

    done();
});

// gulp.task('compile', gulp.series('check-required-files', gulp.parallel('mustache', 'copy-images'), 'copy-global-style'));

gulp.task('status', gulp.series('prepare', 'ping'));
gulp.task('sentinel', gulp.series('prepare', 'start-timer'));

gulp.task('default', gulp.task('status'));