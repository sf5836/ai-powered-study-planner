import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectMongo() {
  await mongoose.connect(env.mongoUri, {
    autoIndex: true,
  });
  return mongoose.connection;
}

export function getMongoState() {
  return mongoose.connection.readyState;
}
