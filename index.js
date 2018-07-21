const request = require('request-promise')
const iconv = require('iconv-lite')

const uri =  'http://capital.sec.or.th/webapp/corp_fin2/daily59.php'

function getData() {
    return request({
        method: 'GET',
        uri,
        encoding: null
    })
}

/*
 * @param data string
 */
function decodeTIS620(data) {
    return iconv.decode(Buffer.from(data), 'tis-620');
}

(async ()=> {
    const data = await getData()
    const decodedData = decodeTIS620(data)
})()

