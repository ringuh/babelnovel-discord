const axios = require('axios')
const sharp = require('sharp')

async function downloadImage(url, filename, folder) {
    if (!url || !url.startsWith("http")) return null
    console.log(url)
    return new Promise(async (resolve, reject) => {
        //url = encodeURI(url)
        const path = `${folder}/${filename}`
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'arraybuffer' // stream
        }).then(async response => {
            const buffer = Buffer.from(response.data, 'binary')
            await sharp(buffer).resize(200).png({ lossless: false }).toFile(path)
                .then(f => setTimeout(() => { resolve(path) }, 1000))
                .catch(err => setTimeout(() => { reject({ message: err.message }) }, 1000))
        }).catch(err => {
            setTimeout(() => { reject({ message: err.message }) }, 1000)
        })
    })
}

module.exports = downloadImage