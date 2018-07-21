const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const request = require('request-promise');

const uri = 'http://capital.sec.or.th/webapp/corp_fin2/daily59.php';

function getData() {
  return request({
    method: 'GET',
    uri,
    encoding: null,
  });
}

/*
 * @param data Buffer
 * @returns decodedData String
 */
function decodeTIS620(data) {
  return iconv.decode(Buffer.from(data), 'tis-620');
}

/*
 * @param html String
 * @returns jsonData Object
 * [{
 *   'label0' : 'td0'
 *   'label1' : 'td1'
 * }]
 */
function convertHtmlToJson(html) {
  const $ = cheerio.load(html);
  let labels = []
  let jsonData = []
  let convertedLabel = false

  $('table table tbody')
    .find('tr')
    .each((i, tr) => {
      //each tr
      let trObject = {};

      if (i === 1 && !convertedLabel) {
        labels = convertLabelsToEnglish(labels)
        convertedLabel = true
      }

      $(tr)
        .find('td')
        .each((j, td) => {
          //each td
          if (i === 0) {
            return labels.push(
              $(td)
                .text()
                .trim(),
            );
          }
          trObject[labels[j]] = $(td)
            .text()
            .trim();
        });

      if (Object.keys(trObject).length === 0 && trObject.constructor === Object)
        return;
      jsonData.push(trObject);
    });
  return jsonData;
}

/*
 * @param labels Array{String}
 * @returns englishLabels Array{String}
 */
function convertLabelsToEnglish(labels) {
  const dictionary = {
    'ชื่อบริษัท' : 'company_name',
    'ชื่อผู้บริหาร': 'director_name',
    'ความสัมพันธ์ *': 'relationship',
    'ประเภทหลักทรัพย์': 'type_of_asset',
    'วันที่รับเอกสาร': 'document_receive_date',
    'วันที่ได้มา/จำหน่าย': 'transaction_date',
    'จำนวน': 'amount',
    'ราคา': 'price',
    'วิธีการได้มา/จำหน่าย': 'transaction_type',
    'หมายเหตุ': 'note',
  }

  return labels.map((label) => {
      return dictionary[label]
  })
}

(async () => {
  let data, decodedData;
  try {
    data = await getData();
    decodedData = decodeTIS620(data);
    const convertedData = convertHtmlToJson(decodedData);
    console.log('convertedData = ', JSON.stringify(convertedData, null, 4));
  } catch (error) {
    return console.error(error);
  }
})();
