'use strict';

const { BigQuery } = require('@google-cloud/bigquery');
const yahooFinance = require('yahoo-finance2').default;
var moment = require('moment-timezone');
const { ErrorReporting } = require('@google-cloud/error-reporting');

const projectId = process.env.projectId;
const query = process.env.nasdaqQuery;
const bucket = process.env.nasdaqGCSBucket;
const fileName = process.env.nasdaqQuotesFileName;
const timezone = process.env.timezone;
const location = process.env.location;

exports.wk_nasdaq_eodYFinanceQuotesToGCS = async (req, res) => {

  if (req.method === 'POST') {
    console.log('Starting wk_nasdaq_eodYFinanceQuotesToGCS');
    getBQCsvData()
  } else {
    const error = `Error on wk_nasdaq_eodYFinanceQuotesToGCS, req.method: This is not a POST request`
    new ErrorReporting().report(error);
    return res.status(500).send(error);
  }

  async function getBQCsvData() {
    console.log('Starting getBQCsvData');
    let bigquery = new BigQuery(projectId)

    // For all options, see https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
    const options = {
      query,
      // Location must match that of the dataset(s) referenced in the query.
      location,
      useLegacySql: true,
    };
    // Run the query as a job
    const [job] = await bigquery.createQueryJob(options);
    console.log(`Job ${job.id} started.`);
    // Wait for the query to finish
    const [rows] = await job.getQueryResults();
    //console.log(`rows ${JSON.stringify(rows)}`);
    getQuotes(rows)
  }

  async function getQuotes(rows) {
    console.log('Starting getQuotes');
    //console.log(`rows on getQuotes are: ${JSON.stringify(rows)}`);
    let quotes = [];

    await Promise.all(
      rows.map(async (row) => {
        try {
          var symbol = '' + row.Symbol;
          var price = await yahooFinance.quote(symbol);
          const today = moment().tz(timezone).format()
          price.createdAt = today ? today : null;
          price.industry = row.Industry ? row.Industry : null;
          price.sector = row.Sector ? row.Sector : null;
          if (!price) {
            const error = `Error on wk_nasdaq_eodYFinanceQuotesToGCS, getQuotes rows.map: No quotes found for symbol: ${symbol}`
            console.log(error)
            new ErrorReporting().report(error);
          }
          quotes.push(price);
        } catch (err) {
          const substring = "Error";
          const isError = string.includes(substring);
          if (!isError) {
            //console.log('Error with some missmatching values returned from yahoo-finance2 on getQuotes rows.map')
            return null; // Maybe log the error?
          } else {
            const error = `Error on wk_nasdaq_eodYFinanceQuotesToGCS, getQuotes rows.map: ${JSON.stringify(err)}`
            new ErrorReporting().report(error);
          }
        }
      }),
    ).then(() => {
      //console.log(`quotes are: ${JSON.stringify(quotes)}`);
      uploadToGCS(quotes)
    }).catch((err) => {
      const substring = "Error";
      const isError = string.includes(substring);
      if (!isError) {
        //console.log('Error with some missmatching value riturned from yahoo-finance2 on getQuotes Promise.all')
        return null; // Maybe log the error?
      } else {
        const error = `Error on wk_nasdaq_eodYFinanceQuotesToGCS, getQuotes Promise.all: ${JSON.stringify(err)}`
        console.log(error);
        new ErrorReporting().report(error);
      }
    })
  }

  async function uploadToGCS(quotes) {
    if (!quotes || quotes.length == 0 || typeof quotes !== 'object') {
      const error = `Error on wk_nasdaq_eodYFinanceQuotesToGCS, uploadToGCS: No quotes found`
      new ErrorReporting().report(error);
      return res.status(404).send(error);
    }
    console.log(`Starting uploading a new json line with ${JSON.stringify(quotes.length)} lines`);

    const { Storage } = require('@google-cloud/storage');
    const stream = require('stream');
    const storage = new Storage(projectId);
    const myBucket = storage.bucket(bucket);
    const file = myBucket.file(fileName);
    const passthroughStream = new stream.PassThrough();

    // converting json object into json new line for big query
    const ndJson = JSON.parse(JSON.stringify(quotes))
      .map((element) => {
        return JSON.stringify(element)
      })
      .join("\n")

    // saving gcs json new line file into bq as a stream
    passthroughStream.write(ndJson);
    passthroughStream.end();

    async function streamFileUpload() {
      passthroughStream.pipe(file.createWriteStream())
        .on('finish', () => {
          console.log('File upload completed succesfully');
        })
      console.log('SUCCESS: wk_nasdaq_eodYFinanceQuotesToGCS completed');
      res.end();
    }

    await streamFileUpload()
      .catch((err) => {
        const error = `Error on wk_nasdaq_eodYFinanceQuotesToGCS, streamFileUpload: ${JSON.stringify(err)}`
        new ErrorReporting().report(error);
        return res.status(404).send(error);
      });
  }
}