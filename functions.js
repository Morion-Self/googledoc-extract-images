const unzipper = require('unzipper');
const fs = require('fs');
const request = require('request');
const os = require('os');
var HTMLParser = require('node-html-parser');
const { shell } = require('electron');
const pjson = require('./package.json');

document.querySelector('#version').innerHTML += pjson.version;

document.querySelector('#btnEd').addEventListener('click', () => {

    logger.clear();
    logger.add('init ...');

    const tmpDir = os.tmpdir() + '/' + 'googledoc_extract_images/' + uuidv4() + '/';
    const zipFullName = tmpDir + 'zip.zip';
    const unzipDirFullName = tmpDir + 'unzip/';
    const dirImages = tmpDir + 'images/';
    let url = document.getElementById('inputUrl').value;

    logger.ok();
    logger.add('parse url ...');

    let docID;
    url.split('/').forEach(function (item, index, array) {
        if (item === 'd') {     // находим в url /d/ и после него идет айдишник документа
            docID = array[index + 1];
        }
    });
    let downloadUrl = 'https://docs.google.com/document/d/' + docID + '/export?format=zip';

    logger.ok();
    logger.add('create tmp dir ...');

    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
    }

    logger.ok();
    logger.add('download ' + downloadUrl + ' ...');

    request(downloadUrl, function (error, response, body) {
        if (response.statusCode != 200) return logger.append(response.statusCode);
        logger.ok();
        logger.add('unzip ...');

        let pipeUnzip =
            fs.createReadStream(zipFullName)
                .pipe(unzipper.Extract({ path: unzipDirFullName }));

        pipeUnzip.on('close', function () {
            logger.ok();
            logger.add('read html ...');

            let htmlName = fs.readdirSync(unzipDirFullName).filter(file => {
                return file.indexOf('html') > -1;
            })[0];

            fs.readFile(unzipDirFullName + '/' + htmlName, 'utf8', function (err, data) {
                if (err) return logger.append(err);
                logger.ok();

                logger.add('create folder ...');
                if (!fs.existsSync(dirImages)) {
                    fs.mkdirSync(dirImages, { recursive: true });
                }
                logger.ok();

                logger.add('parse dom ...');
                const dom = new DOMParser().parseFromString(data, 'text/html');
                logger.ok();

                let cnt = 1; // нумерация изображений
                logger.add('copy images ...');
                for (let item of dom.images) {
                    let oldFullFileName = unzipDirFullName + '/' + item.getAttribute('src');
                    let newFullFileName = dirImages + '/' + (cnt++) + '.png';
                    fs.copyFileSync(oldFullFileName, newFullFileName);
                    logger.image(newFullFileName);
                }


                logger.add('open folder ...');
                shell.openPath(dirImages);
                logger.ok();

                logger.add('finish');
            });
        });
        pipeUnzip.on('error', function (error) {
            logger.append(error);
        });
    }).pipe(fs.createWriteStream(zipFullName)); // пишем скачанное в файл

});


// при нажатии Enter в поле ввода
document.querySelector('#inputUrl').addEventListener("keyup", function (event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        document.getElementById("btnEd").click();
    }
});

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// function getDate() {
//     function pad(n) { return n < 10 ? '0' + n : n };
//     let d = new Date();
//     return d.getFullYear() + '-'
//         + pad(d.getMonth() + 1) + '-'
//         + pad(d.getDate()) + '_'
//         + pad(d.getHours()) + '-'
//         + pad(d.getMinutes()) + '-'
//         + pad(d.getSeconds());
// }

// типа логгер, который будет выходить на экране.
// Просто пишем текст в div
let logger = {
    // нумерация сообщений
    number: 1,

    // новая строка с новым номером
    add: function (sText) {
        document.querySelector('#logger').innerHTML += '<br>' + (this.number++) + '. ' + sText;
    },

    // дописываем к существующей строке
    append: function (sText) {
        document.querySelector('#logger').innerHTML += sText;
    },

    // дописываем к существующей строке статус ОК
    ok: function () {
        document.querySelector('#logger').innerHTML += 'ok';
    },

    // для изображений. новая строка, но без нумерации а с дефисом
    image: function (sText) {
        document.querySelector('#logger').innerHTML += '<br> - ' + sText;
    },

    // очищаем, убираем нумерацию
    clear: function () {
        document.querySelector('#logger').innerHTML = '';
        this.number = 1;
    }
}