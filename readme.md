# Overview

The purpose of this repository is to show how Atlas Stream Processing can be used to:

1. Stream data into MongoDB from Apache Kafka sources (using a sample stream; no outside Kafka connection required)
2. Transform data in realtime before it is loaded into a collection
3. Use window functions to aggregate groups of data that you store in other collections
4. Enrich your data with data requested from external APIs

# What You Need

In order to set this up, you'll need access to an Atlas account that includes:

1. An Atlas Cluster you can write to
2. A stream processing instance you can connect to

# Setup

## Setup Your Local Environment

### Create Connections

In your Atlas Stream Processing instance, you need to create the following three collections:

1. **A sample stream connection called "sample_stream_solar"**  
   This connection mimics a Kafka topic connection streaming solar generator wattage and temperature IoT data.

2. **An Atlas database connection called "my_solar_db"**  
   This is where we will create the collections we will be writing data to.

3. **An Atlas database connection called "open-meteo"**  
   URL: `https://api.open-meteo.com/v1/forecast`  
   We will use this free API to get weather forecasts for the maintenance generators.

### Setup Your Local Environment

In the repository you have this in, run the following two commands to set up your environment and install all needed packages:

```bash
npm init -y
npm install dotenv mongodb
```

# How to Use This Repository

1. **To seed the admin data collection and create stream processors**  
   ```bash
   node main.js --setup
   ```

2. **To start the processors**
   ```bash
   node main.js --start_processors
   ```
You will be able to see the processed records in your collections.

3. **To stop the processors**
```bash
node main.js --stop_processors
```

4. **To drop the processors**
```bash
node main.js --drop_processors
```