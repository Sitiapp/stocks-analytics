'use strict';

const { BigQuery } = require('@google-cloud/bigquery');
const { Storage } = require('@google-cloud/storage');
const { ErrorReporting } = require('@google-cloud/error-reporting');

const projectId = process.env.projectId;
const bucket = process.env.nasdaqGCSBucket;
const fileName = process.env.nasdaqFileName;
const datasetName = process.env.datasetName;
const tableName = process.env.tableName;
const location = process.env.location;

exports.wk_nasdaq_importGCSQuotesToBQ = async (req, res) => {

    if (req.method === 'POST') {
        saveToBQ()
    } else {
        const error = `Error on wk_nasdaq_importGCSQuotesToBQ, req.method: This is not a POST request`
        const errors = new ErrorReporting();
        errors.report();
        return res.status(404).send(error);
    }

    async function saveToBQ() {
        //console.log('Starting saveToBQ function: ', JSON.stringify(buf));
        console.log('Starting saveToBQ function');

        const storage = new Storage(projectId);
        const bigquery = new BigQuery(projectId)
        let dataset = bigquery.dataset(datasetName)

        dataset.exists().catch(err => {
            const error = `Error on wk_nasdaq_importGCSQuotesToBQ, saveToBQ: dataset.exists: dataset ${datasetName} does not exist: ${JSON.stringify(err)}`
            new ErrorReporting().report(error);
            return res.status(404).send(error);
        })

        let table = dataset.table(tableName)
        table.exists().catch(err => {
            const error = `Error on wk_nasdaq_importGCSQuotesToBQ, saveToBQ: table.exists: table ${tableName} does not exist: ${JSON.stringify(err)}`
            new ErrorReporting().report(error);
            return res.status(404).send(error);
        })

        const metadata = {
            destinationFormat: 'NEWLINE_DELIMITED_JSON',
            autodetect: true,
            location
        };

        console.log('Starting bq load operation');

        try {
            const [job] = await bigquery
                .dataset(datasetName)
                .table(tableName)
                .load(storage.bucket(bucket).file(fileName), metadata);
            console.log(`Job ${job.id} completed.`);
            res.end()

            const errors = job.status.errors;
            if (errors && errors.length > 0) {
                const error = `Error on wk_nasdaq_importGCSQuotesToBQ, saveToBQ: error on big query job: ', ${JSON.stringify(errors)}`
                new ErrorReporting().report(error);
                return res.status(404).send(error);

            }
        } catch (err) {
            const error = `Error on wk_nasdaq_importGCSQuotesToBQ, saveToBQ: error saveToBQ: ${JSON.stringify(err)}`
            new ErrorReporting().report(error);
            return res.status(404).send(error);
        }
    }
}