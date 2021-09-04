'use strict';

const AWS = require("aws-sdk");
const queryString = require("query-string");

const DYNAMO_TABLENAME = "users";

/**
 * 有効なidが指定されているか返す
 * @param  {ParsedQuery} body - query-stringのクエリー解析値
 * @return {bool} - true: 正常なidが指定されている, false: idが異常か指定されていない
 */
 const isId = (body) => {
  return "id" in body && body.id.match(/^([0-9]{1,})$/);
}

/**
 * 有効なunameが指定されているか返す
 * @param  {ParsedQuery} body - query-stringのクエリー解析値
 * @retrun {bool} - true: 正常なunameが指定されている, false: unameが異常か指定されていない
 */
 const isUname = (body) => {
  return "uname" in body && body.uname.match(/^([a-zA-Z0-9]{1,})$/);
}

/**
 * AWS.DynamoDB.DocumentClientを返す
 *  hostから本番かローカルかを判断する
 * @param  {string} host - ホスト名
 * @return {AWS.DynamoDB.DocumentClient}
 */
 const getDynamo = (host) => {
  if (host == "localhost:3000") {
    return new AWS.DynamoDB.DocumentClient({
      egion: 'ap-northeast-1',
      endpoint: "http://localhost:8000"
    });
  } else {
    return new AWS.DynamoDB.DocumentClient();
  }
}

/**
 * 正常応答を返す
 * @param  {any} data - AWS.DynamoDB.DocumentClientからの返り値
 * @return {APIGatewayProxyHandler}
 */
 const responseOk = (data) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ status: true, data: data }),
  };
}

/**
 * エラー応答を返す
 * @param  {any} error - AWSError:AWS.DynamoDB.DocumentClientからのエラー
 * @return {APIGatewayProxyHandler}
 */
 const responseError = (error, statusCode = 500) => {
  return {
    statusCode: error.statusCode || statusCode,
    body: JSON.stringify({ status: false, error: error })
  };
}

/**
 * ユーザーを取得する
 *  GET /<stage>/user/get/{id}
 * @param  {any} event - AWS Lambda event
 * @return {APIGatewayProxyHandler}
 */
 module.exports.get = async (event) => {
  const params = {
    TableName: DYNAMO_TABLENAME,
    Key: {
      id: event.pathParameters.id,
    },
  };
  try {
    const data = await getDynamo(event.headers.Host).get(params).promise();
    return responseOk(data);
  } catch (error) {
    return responseError(error);
  }
};

/**
 * ユーザー一覧を取得する
 *  GET /<stage>/user/list
 * @return {APIGatewayProxyHandler}
 */
 module.exports.list = async (event) => {
  const params = {
    TableName: DYNAMO_TABLENAME
  };
  try {
    const data = await getDynamo(event.headers.Host).scan(params).promise();
    return responseOk(data);
  } catch (error) {
    return responseError(error);
  }
};

/**
 * ユーザーを追加する
 *  POST /<stage>/user/add
 *    id={id}&uname={name}
 * @param  {any} event - AWS Lambda event
 * @return {APIGatewayProxyHandler}
 */
 module.exports.add = async (event) => {
  // 引数チェック
  const body = queryString.parse(event.body);
  let err = [];
  if (!isId(body)) {
    err.push("invalid id")
  }
  if (!isUname(body)) {
    err.push("invalid uname")
  }
  if (err.length > 0) {
    return responseError(err, 400);
  }

  const params = {
    TableName: DYNAMO_TABLENAME,
    Item: {
      id: body.id,
      uname: body.uname
    },
    ReturnValues: "NONE"
  };
  try {
    await getDynamo(event.headers.Host).put(params).promise();
    return responseOk(params.Item);
  } catch (error) {
    return responseError(error);
  }
};

/**
 * ユーザーを更新する
 *  PUT /<stage>/user/update/{id}
 *    uname={name}
 * @param  {any} event - AWS Lambda event
 * @return {APIGatewayProxyHandler} 
 */
 module.exports.update = async (event) => {
  // 引数チェック
  const body = queryString.parse(event.body);
  if (!isUname(body)) {
    return responseError("invalid uname", 400);
  }

  const id = event.pathParameters.id;
  const params = {
    TableName: DYNAMO_TABLENAME,
    Key: {
      id: id,
    },
    ExpressionAttributeValues: {
      ':uname': body.uname,
      ':id': id
    },
    UpdateExpression: 'SET uname = :uname',
    ConditionExpression: 'id = :id',
    ReturnValues: 'ALL_NEW'
  };
  try {
    const data = await getDynamo(event.headers.Host).update(params).promise();
    return responseOk(data);
  } catch (error) {
    return responseError(error);
  }
};

/**
 * ユーザーを削除する
 *  DELETE /<stage>/user/remove/{id}
 * @param  {any} event - AWS Lambda event
 * @return {APIGatewayProxyHandler}
 */
 module.exports.remove = async (event) => {
  const id = event.pathParameters.id;
  const params = {
    TableName: DYNAMO_TABLENAME,
    Key: {
      id: id,
    },
    ReturnValues: "ALL_OLD",
  };
  try {
    const data = await getDynamo(event.headers.Host).delete(params).promise();
    return responseOk(data);
  } catch (error) {
    return responseError(error);
  }
};
