'use strict';

// Imports the Google Cloud client library
const { BigQuery } = require('@google-cloud/bigquery');
const yahooFinance = require('yahoo-finance2').default;
var moment = require('moment-timezone');
const { ErrorReporting } = require('@google-cloud/error-reporting');

const projectId = process.env.projectId;
const query = process.env.nasdaqQuery;
const bucket = process.env.nasdaqGCSBucket;
const fileName = process.env.nasdaqFileName;
const timezone = process.env.timezone;
const location = process.env.location;

exports.wk_nasdaq_eodYFinanceQuotesToGCS = async (req, res) => {

  if (req.method === 'POST') {
    console.log('Starting wk_nasdaq_eodYFinanceQuotesToGCS');
    getBQCsvData()
  } else {
    const errors = new ErrorReporting();
    errors.report(`Error on wk_nasdaq_eodYFinanceQuotesToGCS, req.method: This is not a POST request`);
    return res.status(404).send({
      error: 'This is not a POST request'
    });
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
          price.createdAt = moment().tz(timezone).format();
          quotes.push(price);
        } catch (e) {
          //console.log(` Error on symbol ${JSON.stringify(symbol)}: ${JSON.stringify(e)}`);
          return null; // Maybe log the error?
        }
      }),
    ).then(() => {
      //console.log(`quotes are: ${JSON.stringify(quotes)}`);
      uploadToGCS(quotes)
    }).catch((e) => {
      console.log(`Error on getQuotes: ${JSON.stringify(e)}`);
    })
  }

  async function uploadToGCS(quotes) {
    if (!quotes) {
      console.log('No quotes found');
      const errors = new ErrorReporting();
      errors.report(`Error on wk_nasdaq_eodYFinanceQuotesToGCS, uploadToGCS: No quotes found`);
      return res.status(404)
    }
    console.log(`Starting uploading a new json line with ${JSON.stringify(quotes.length)} lines`);
    //console.log('Prices to uploadToGCS are: ', quotes);
    const { Storage } = require('@google-cloud/storage');
    const stream = require('stream');
    const storage = new Storage(projectId);
    const myBucket = storage.bucket(bucket);
    const file = myBucket.file(fileName);
    const passthroughStream = new stream.PassThrough();

    // converting json object into json new line for big query
    const ndJson = JSON.parse(JSON.stringify(quotes)).map((element) => {
      return JSON.stringify(element)
    }).join("\n");

    // saving gcs json new line file into bq as a stream
    passthroughStream.write(ndJson);
    passthroughStream.end();

    async function streamFileUpload() {
      passthroughStream.pipe(file.createWriteStream()).on('finish', () => {
        console.log('Uploaded a file!');
      });
      console.log(`File uploaded to bucketName`);
      res.end()
    }

    await streamFileUpload().catch((err) => {
      console.log('Error on streamFileUpload: ', JSON.stringify(err));
      const errors = new ErrorReporting();
      errors.report(`Error on wk_nasdaq_eodYFinanceQuotesToGCS, streamFileUpload: Error on streamFileUpload ${JSON.stringify(err)}`);
      res.status(400).send();
    });
  }
};





