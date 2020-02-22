import AWS from 'aws-sdk';

const AWS_ACCESS_KEY = process.env.FOOD_JOURNAL_AWS_ACCESS_KEY;
const AWS_SECRET_KEY = process.env.FOOD_JOURNAL_AWS_SECRET_KEY;
const AWS_REGION = process.env.FOOD_JOURNAL_AWS_REGION;

AWS.config.update({
  'accessKeyId': AWS_ACCESS_KEY,
  'secretAccessKey': AWS_SECRET_KEY,
  'region': AWS_REGION
})

const tableName = "food-journal";
const db = new AWS.DynamoDB.DocumentClient();

module.exports = class FoodDb {

  async fetchLogForMonths(months) {

    const results = await Promise.all(months.map(this.fetchLogForMonth));

    const items = results.flatMap(r => r);

    return items;
  }

  async fetchLogForMonth(month) {
    const result = await db.query({
      "TableName": tableName,
      "KeyConditionExpression": "#entryMonth = :month",
      "ExpressionAttributeNames": {
        "#entryMonth": "entryMonth"
      },
      "ExpressionAttributeValues": {
        ":month": month
      }
    }).promise();

    return result.Items;
  }

  async fetchLogForDay(month, day) {
    const result = await db.get({
      "TableName": tableName,
      "Key": {
        "entryMonth": month,
        "entryDay": day
      }
    }).promise();

    return result.Item;
  }

  async updateEntry(month, day, data) {

    console.log("update:", month, day, data);

    const item = Object.assign({
      "entryMonth": month,
      "entryDay": day
    }, data);

    return await db.put({
      "TableName": tableName,
      "Item": item
    }).promise();
  }

  async deleteEntry(month, day, data) {

    console.log("delete:", month, day, data);

    return await db.delete({
      "TableName": tableName,
      "Key": {
        "entryMonth": month,
        "entryDay": day
      }
    }).promise();
  }

}