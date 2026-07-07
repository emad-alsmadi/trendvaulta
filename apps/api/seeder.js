const { Template } = require('./models/Template');
const { Creator } = require('./models/Creator');
const { creators, templates } = require('./data');
const { connectToDB } = require('./config/db');
require('dotenv').config();

// Import Templates & Creators
const importData = async () => {
  try {
    await connectToDB();
    await Creator.deleteMany({});
    await Template.deleteMany({});
    await Creator.insertMany(creators);
    await Template.insertMany(templates);
    console.log('Data imported');
    process.exit();
  } catch (error) {
    console.log('Error', error);
    process.exit(1);
  }
};

// Remove Templates & Creators
const removeData = async () => {
  try {
    await connectToDB();
    await Template.deleteMany({});
    await Creator.deleteMany({});
    console.log('Data removed');
    process.exit();
  } catch (error) {
    console.log('Error', error);
    process.exit(1);
  }
};
if (process.argv[2] === '-import') {
  importData();
} else if (process.argv[2] === '-remove') {
  removeData();
}
