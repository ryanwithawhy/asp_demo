import { config } from 'dotenv';
import { MongoClient } from 'mongodb';
import {spawn} from 'child_process';
import { base_device_admin_data }  from './seed_data.js';
import fs from 'fs';

// Goal: Running this script script creates and seeds an admin data collection used for HTTPS calls and runs the scripts creating the stream processors.


// Load environment variables
config();

// Set local variables using env variales
const MONGO_COLLECTION_URI = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_CLUSTER}/?retryWrites=true&w=majority`;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE;
const CONNECT_TO_ASP_SHELL_COMMAND = [
    process.env.MONGODB_STREAM_INSTANCE,
    "--tls",
    "--authenticationDatabase", "admin",
    "--username", process.env.MONGODB_USERNAME,
    "--password", process.env.MONGODB_PASSWORD,
]

// Get CLI argument
const command = process.argv[2];

// Helper: Create collection for solar generator location data that will be used for forecasts and seed it
async function createAndSeedAdminDataCollection(db){
    // delete collection if it exists so we do not get duplicate records
    const collections = await db.listCollections({ name: "solar_generator_admin_data" }).toArray();
    if (collections.length > 0) {
        await db.collection("solar_generator_admin_data").drop();
    }
    // create a collection an index as we will be looking it up by device_name
    const adminCollection = await db.collection("solar_generator_admin_data");
    await adminCollection.createIndex({ device_name: 1 });
    await adminCollection.insertMany(base_device_admin_data);
    console.log("Admin data seeded successfully");
}

// Helper: Connect to MongoDB and run the command to create and seed the colletions
async function seedCollections() {
  const mongoClient = new MongoClient(MONGO_COLLECTION_URI);
  try {
    console.log("Connecting to MongoDB");
    await mongoClient.connect();
    const db = mongoClient.db(MONGODB_DATABASE);
    await createAndSeedAdminDataCollection(db);
  } catch (error) {
    console.error('Error with MongoDB operation:', error);
  } finally {
    console.log("Closing MongoDB connection");
    await mongoClient.close();
  }
}

// Helper: Run mongosh command with --eval.  Used for starting and stopping processors
function runMongoshEval(jsCommand) {
  const args = [
    '--eval', `const database_name="${process.env.MONGODB_DATABASE}"; ${jsCommand}`,
    ...CONNECT_TO_ASP_SHELL_COMMAND
  ];
  spawn('mongosh', args, { stdio: 'inherit' });
}

// Main
if (command === '--setup') {
  await seedCollections();

  const allScripts = [
    './convert_to_farenheit.mongodb.js',
    './generate_maintenance_tickets.mongodb.js',
    './generate_maintenance_windows.mongodb.js',
  ];

  for (const script of allScripts) {
    console.log(`Running script: ${script}`);
    const args = [
      "--eval",
      // 🟢 Fix: wrap string values in quotes, and remove extra linebreaks
      `const database_connection_name="${process.env.ATLAS_DATABASE_CONNECTION_NAME}";
      const database_name="${process.env.MONGODB_DATABASE}";
      const sample_stream_name="${process.env.SAMPLE_STREAM_CONNECTION_NAME}";
      const https_connection_name="${process.env.HTTPS_CONNECTION_NAME}";`,
      ...CONNECT_TO_ASP_SHELL_COMMAND,
      script
    ];
    spawn('mongosh', args, { stdio: 'inherit' });
  }
}

if (command === '--start_processors') {
  runMongoshEval(`
    sp.add_farenheit.start();
    sp.generate_maintenance_windows.start();
    sp.generate_maintenance_tickets.start();
  `);
}

if (command === '--stop_processors') {
  runMongoshEval(`
    sp.add_farenheit.stop();
    sp.generate_maintenance_windows.stop();
    sp.generate_maintenance_tickets.stop();
  `);
}

if (command === '--drop_processors') {
  runMongoshEval(`
    sp.add_farenheit.drop();
    sp.generate_maintenance_windows.drop();
    sp.generate_maintenance_tickets.drop();
  `);
}


// await seedCollections();

// // await createCollections();

// // create vars for the stream scripts
// const convertToFarenheitStreamDef = fs.createReadStream('./convert_to_farenheit.mongodb.js');
// const generateMaintenanceData = fs.createReadStream('./generate_maintenance_data.mongodb.js');


// // const allScripts = [convertToFarenheitStreamDef, generateMaintenanceData]
// const allScripts = [
//     './convert_to_farenheit.mongodb.js',
//     './generate_maintenance_data.mongodb.js',
//     './generate_maintenance_windows.mongodb.js',
// ];


// for (const script of allScripts) {
//   console.log(`Starting script: ${script}`);

//   const commandArgs = [
//     '--eval', `const database_name="${process.env.MONGODB_DATABASE}"`,
//     ...CONNECT_TO_ASP_SHELL_COMMAND,
//     script  // <- your script variable, untouched
//   ];

//   const mongosh = spawn('mongosh', commandArgs, {
//     stdio: 'inherit'  // keep this so you see output
//   });
// }
