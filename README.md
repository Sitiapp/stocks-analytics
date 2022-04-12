# Stock analytics - v0.0.1 alpha 🚀

## Info:

This repository provides you a simple Google Cloud App that runs every day and collects Stocks data for report visualization.

## Legal Disclaimer

NOT FINANCIAL ADVICE!! ⚠️ ⚠️ ⚠️

The information contained on this Repository and the resources available for
download through this website is not intended as, and shall not be understood
or construed as, financial advice. I am not an attorney, accountant or financial
advisor, nor am I holding myself out to be, and the information contained on
this Website is not a substitute for financial advice from a professional who is
aware of the facts and circumstances of your individual situation.

We have done our best to ensure that the information provided on this repository
and the resources available for download are accurate and provide valuable
information. Regardless of anything to the contrary, nothing available on or
through this repository should be understood as a recommendation that you
should not consult with a financial professional to address your particular
information. I expressly recommends that you seek advice from a
professional.

## DOWNLOAD - step 1 (required)

    $ git clone https://github.com/Sitiapp/stocks-analytics.git

    $ cd stocks-analytics/js-functions

    $ npm i --s

## CONFIGURATION - step 2 (required)

1. Create a new project on Google Cloud Platform: (See #1)
2. Enable billing for your new project (Link: https://cloud.google.com/billing/docs/how-to/modify-project#enable_billing_for_a_project)
3. Create a service account: (See #2)

   $ gcloud iam service-accounts create cloud-function-invoker --description="This service account for cloud functions" --display-name="cloud-function-invoker"
4. Add roles to new created service account: (Link #2)

   $ gcloud projects add-iam-policy-binding `<YOUR-PROJECT-ID>` --member="serviceAccount:cloud-function-invoker@`<YOUR-PROJECT-ID>`.iam.gserviceaccount.com" --role="roles/bigquery.admin" --role="roles/cloudfunctions.invoker" --role="roles/storage.objectAdmin"
   --role="roles/workflows.invoker"
5. Enable Error Reporting api

    $ gcloud services enable clouderrorreporting.googleapis.com
6. [Create a sink](https://cloud.google.com/logging/docs/export/configure_export_v2#creating_sink) to save Google Cloud Logging logs into Big Query.


## INSTALLATION - step 3 (required)

1. Create a Big Query table called "csv-import" and import the data/nasdaq_screener_1649605170701.csv file (Link #3)
2. Edit variables on env.yaml file
3. Deploy Cloud functions: (Link #4 and #5)

   $ cd stocks-analytics/js-functions

   $ gcloud functions deploy wk_nasdaq_eodYFinanceQuotesToGCS --entry-point wk_nasdaq_eodYFinanceQuotesToGCS --runtime nodejs16 --trigger-http --region YOUR-REGION --service-account cloud-functions-invoker@`<YOUR-PROJECT-ID>`.iam.gserviceaccount.com --env-vars-file env.yaml

   $ gcloud functions deploy wk_nasdaq_importGCSQuotesToBQ --entry-point wk_nasdaq_importGCSQuotesToBQ --runtime nodejs16 --trigger-http --region YOUR-REGION --service-account cloud-functions-invoker@`<YOUR-PROJECT-ID>`.iam.gserviceaccount.com --env-vars-file env.yaml
4. Create Google Cloud Workflow: (Link #6)

   $ gcloud workflows deploy wk_nasdaq --source=../../workflow.yaml --service-account=cloud-function-invoker@`<YOUR-PROJECT-ID>`.iam.gserviceaccount.com
5. Schedule your workflow (Link #7)

   $ gcloud scheduler jobs create http wk_nasdaq_trigger 
   --schedule="0 23 * * 1-5" 
   --uri="https://workflowexecutions.googleapis.com/v1/projects/PROJECT_ID/locations/YOUR-REGION/workflows/wk_nasdaq/executions" 
   --message-body="{"argument":"{\n\"wk_nasdaq_eodYFinanceQuotesToGCS\": true,\n\"wk_nasdaq_importGCSQuotesToBQ\": true\n}" \ --time-zone="TIME_ZONE" 
   --oauth-service-account-email="cloud-function-invoker@`<YOUR-PROJECT-ID>`.iam.gserviceaccount.com"

## TEST - step 4 (optional) 🥇

    $ gcloud workflows run wk_nasdaq \
    --data='{"wk_nasdaq_eodYFinanceQuotesToGCS": true, "wk_nasdaq_importGCSQuotesToBQ": true}'

## CREATE DATASTUDIO REPORT - step 5 (optional) (Link #8)

Create a Google Datastudio report, select your quotes Big Query table as data source, start making charts, schedule an email delivery to receive a daily report via email.

## Errors:

1. Cloud functions runtime error:
   If you increase your query size, the cloud functions could need more resources. Check #4 on how to increase cpu and timeout

## Features Request:

1. Importing nasdaq csv into bq automatically using puppeteer, cloud functions and cloud scheduler
2. Add more cloud functions on the workflow, for example a function that use twitter and reddit api to count which stocks are more tweeted and discussed, also use more endpoint of yahoo-finance2 to analyse stocks news and more...
3. deploy.sh bash script to easily install and configure this project

### Created by:

<img src="https://firebasestorage.googleapis.com/v0/b/sitiapp-logo-public/o/sitiapp-logo_horrizontal.png?alt=media&token=97303a06-192d-4a11-a51b-646b96f46e50" width="200">

### Contact Developer:

info@sitiapp.it
www.sitiapp.it
Donate to see more:
<a href="https://patreon.com/sitiapp"><img src="https://img.shields.io/endpoint.svg?url=https%3A%2F%2Fshieldsio-patreon.vercel.app%2Fapi%3Fusername%3Dendel%26type%3Dpatrons&style=for-the-badge" /> </a>

### Documentation:

#1 [Google Cloud Create a Project](https://cloud.google.com/resource-manager/docs/creating-managing-projects#creating_a_project)
#2 [Google Cloud Service Account](https://cloud.google.com/iam/docs/creating-managing-service-accounts#iam-service-accounts-create-gcloud)
#3 [Google Cloud import CSV into Big Query](https://cloud.google.com/bigquery/docs/loading-data-cloud-storage-csv#loading_csv_data_into_a_table)
#4 [Google Cloud Environment variables](https://github.com/simonprickett/google-cloud-functions-environment-variables/blob/master/README.md)
#5 [Google Cloud Regions zone](https://cloud.google.com/compute/docs/regions-zones)
#6 [Google Cloud create a Workflow](https://cloud.google.com/workflows/docs/creating-updating-workflow#create_a_workflow)
#7 [Google Cloud schedule a Workflow](https://cloud.google.com/workflows/docs/schedule-workflow#schedule_a_workflow)
#8 [Google Cloud create Data Studio Report](https://cloud.google.com/bigquery/docs/visualize-data-studio#create_reports_and_charts_using_and_the_connector)
