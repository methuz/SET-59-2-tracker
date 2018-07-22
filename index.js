const cheerio = require('cheerio');
const fs = require('fs');
const iconv = require('iconv-lite');
const moment = require('moment');
const mongoose = require('mongoose');
const request = require('request-promise');
const yaml = require('js-yaml');

const model = require('./lib/model.js');

let config;

async function init() {
  try {
    config = yaml.safeLoad(fs.readFileSync(`${__dirname}/config.yml`, 'utf8'));
    await mongoose.connect(config.db.uri);
  } catch (e) {
    console.log(e);
  }
}

function getData() {
  return request({
    method: 'GET',
    uri: config.source.uri,
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
 * @returns jsonData Array
 * [{
 *   'label0' : 'td0'
 *   'label1' : 'td1'
 * }]
 */
function convertHtmlToJson(html) {
  const $ = cheerio.load(html);
  let jsonData = [];
  let labels;

  $('table table tbody')
    .find('tr')
    .each((i, tr) => {
      //each tr
      let trObject = {};

      if (i === 0) {
        labels = getLabels($, tr);
        console.log('labels = ', JSON.stringify(labels, null, 4));
        return;
      }

      jsonData.push(getTrObject($, tr, labels));
    });
  return jsonData;
}

/**
 * @param tr
 * @returns labels Array[String]
 */
function getLabels($, tr) {
  let labels = [];
  $(tr)
    .find('td')
    .each((j, td) => {
      return labels.push(
        $(td)
          .text()
          .trim(),
      );
    });
  return convertLabelsToEnglish(labels);
}

/**
 * @param tr
 * @returns trObject Object
 */
function getTrObject($, tr, labels) {
  let trObject = {};
  $(tr)
    .find('td')
    .each((j, td) => {
      //each td
      trObject[labels[j]] = $(td)
        .text()
        .trim();
    });
  return trObject;
}

/*
 * @param labels Array{String}
 * @returns englishLabels Array{String}
 */
function convertLabelsToEnglish(labels) {
  const dictionary = {
    ชื่อบริษัท: 'company_name',
    ชื่อผู้บริหาร: 'director_name',
    'ความสัมพันธ์ *': 'relationship',
    ประเภทหลักทรัพย์: 'type_of_asset',
    วันที่รับเอกสาร: 'document_receive_date',
    'วันที่ได้มา/จำหน่าย': 'transaction_date',
    จำนวน: 'amount',
    ราคา: 'price',
    'วิธีการได้มา/จำหน่าย': 'transaction_type',
    หมายเหตุ: 'note',
  };

  return labels.map(label => {
    return dictionary[label];
  });
}

/**
 * @param data Object company data
 * @returns formattedData Object formated data
 */
function formatData(data) {
    data.symbol = companyNameToSymbol(data.company_name)
    console.log("data.amount = ", JSON.stringify(data.amount, null, 4));
    data.amount = +data.amount.split(',').join('')
    data.price = +data.price

    if (data.transaction_type === 'ซื้อ') {
        data.transaction_type = 'buy'
    } else if (data.transaction_type === 'ขาย'){
        data.transaction_type = 'sell'
    }

    data.document_receive_date = dateFormat(data.document_receive_date)
    data.transaction_date = dateFormat(data.transaction_date)

    return data
}

/**
 * @param date string
 * @returns momentDate Moment
 */
function dateFormat(date) {
 const splitedDate = date.split('/')
 const year = +splitedDate.pop() - 543
 splitedDate.push(year)
 return moment(splitedDate.join(), 'DD/MM/YY')
}


/**
 * @param name String
 * @returns symbol String
 */
function companyNameToSymbol(name) {
  const exp = /\((\w+)\)$/g;
  const match = exp.exec(name);
  if (match === null || match.length < 2 || match[1].length === 0) {
    console.error('Error regular expression', match, name);
    return null;
  }
  return match[1];
}

(async () => {
  let data, decodedData;
  try {
    await init();
    data = await getData();
    decodedData = decodeTIS620(data);
    const convertedData = convertHtmlToJson(decodedData);
    const formattedData = convertedData.map(formatData)

    const insertPromises = formattedData.map((d) => {
        return (new model(d)).save()
    })

    const insertResults = await Promise.all(insertPromises)

  } catch (error) {
    return console.error(error);
  }
})();
