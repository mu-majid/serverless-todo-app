import 'source-map-support/register';
import * as uuid from 'uuid';
import { APIGatewayProxyEvent } from 'aws-lambda';

import TodoDBAccessLayer from '../dataLayer/TodoAccess';
import TodoStorageLayer from '../dataLayer/TodoStorage';
import { getUserId } from '../lambda/utils';
import { CreateTodoRequest } from '../requests/CreateTodoRequest';
import { UpdateTodoRequest } from '../requests/UpdateTodoRequest';
import { TodoItem } from '../models/TodoItem';

const todoAccessLayer = new TodoDBAccessLayer();
const todoStorageLayer = new TodoStorageLayer();

export async function createTodo(event: APIGatewayProxyEvent,
  createTodoRequest: CreateTodoRequest): Promise<TodoItem> {
  const todoId = uuid.v4();
  const userId = getUserId(event);
  const createdAt = new Date(Date.now()).toISOString();

  const todoItem = {
    userId,
    todoId,
    createdAt,
    done: false,
    attachmentUrl: `https://${todoStorageLayer.getBucketName()}.s3.amazonaws.com/${todoId}`,
    ...createTodoRequest
  };

  await todoAccessLayer.addTodoToDB(todoItem);

  return todoItem;
}

export async function getTodo(event: APIGatewayProxyEvent) {
  const todoId = event.pathParameters.todoId;
  const userId = getUserId(event);

  return await todoAccessLayer.getTodoFromDB(todoId, userId);
}

export async function getTodos(event: APIGatewayProxyEvent) {
  const userId = getUserId(event);

  return await todoAccessLayer.getAllTodosFromDB(userId);
}

export async function updateTodo(event: APIGatewayProxyEvent,
  updateTodoRequest: UpdateTodoRequest) {
  const todoId = event.pathParameters.todoId;
  const userId = getUserId(event);

  if (!(await todoAccessLayer.getTodoFromDB(todoId, userId))) {
    return false;
  }

  await todoAccessLayer.updateTodoInDB(todoId, userId, updateTodoRequest);

  return true;
}

export async function deleteTodo(event: APIGatewayProxyEvent) {
  const todoId = event.pathParameters.todoId;
  const userId = getUserId(event);

  if (!(await todoAccessLayer.getTodoFromDB(todoId, userId))) {
    return false;
  }

  await todoAccessLayer.deleteTodoFromDB(todoId, userId);

  return true;
}

export async function generateUploadUrl(event: APIGatewayProxyEvent) {
  const bucket = todoStorageLayer.getBucketName();
  const urlExpiration = process.env.SIGNED_URL_EXPIRATION;
  const todoId = event.pathParameters.todoId;

  const createSignedUrlRequest = {
    Bucket: bucket,
    Key: todoId,
    Expires: urlExpiration
  }

  return todoStorageLayer.getPresignedUploadURL(createSignedUrlRequest);
}