/**
 * DynamoDB Document Client initialization (AWS SDK v3).
 * Uses DynamoDBDocumentClient for automatic JavaScript type marshaling/unmarshaling.
 * Supports dependency injection for unit testing with mock drivers.
 */

const { CONFIG } = require('../config/constants');
const logger = require('../middleware/logger');

let docClientInstance = null;

function initializeRealClient() {
  try {
    const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

    const client = new DynamoDBClient({ region: CONFIG.REGION });
    return DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false,
      },
    });
  } catch (err) {
    logger.warn('AWS SDK v3 not found in local node_modules. Using test/mock driver if set.');
    return null;
  }
}

function getDocClient() {
  if (!docClientInstance) {
    docClientInstance = initializeRealClient();
  }
  return docClientInstance;
}

/**
 * Setter for dependency injection (used in unit test suites).
 */
function setDocClient(mockClient) {
  docClientInstance = mockClient;
}

/**
 * Paginate QueryCommand to retrieve all items across multi-page responses.
 */
async function paginateQuery(params) {
  const docClient = getDocClient();
  const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
  let items = [];
  let lastEvaluatedKey = undefined;
  do {
    const currentParams = { ...params };
    if (lastEvaluatedKey) {
      currentParams.ExclusiveStartKey = lastEvaluatedKey;
    }
    const result = await docClient.send(new QueryCommand(currentParams));
    if (result.Items && result.Items.length > 0) {
      items = items.concat(result.Items);
    }
    if (params.Limit && items.length >= params.Limit) {
      return items.slice(0, params.Limit);
    }
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  return items;
}

/**
 * Paginate ScanCommand to retrieve all items across multi-page responses.
 */
async function paginateScan(params) {
  const docClient = getDocClient();
  const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
  let items = [];
  let lastEvaluatedKey = undefined;
  do {
    const currentParams = { ...params };
    if (lastEvaluatedKey) {
      currentParams.ExclusiveStartKey = lastEvaluatedKey;
    }
    const result = await docClient.send(new ScanCommand(currentParams));
    if (result.Items && result.Items.length > 0) {
      items = items.concat(result.Items);
    }
    if (params.Limit && items.length >= params.Limit) {
      return items.slice(0, params.Limit);
    }
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  return items;
}

module.exports = {
  getDocClient,
  setDocClient,
  paginateQuery,
  paginateScan,
};
