import {MongoClient} from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {};

if (!uri) {
  throw new Error('Missing MONGODB_URI environment variable.');
}

type MongoGlobal = typeof globalThis & {
  _futureOfMilkBookMongoPromise?: Promise<MongoClient>;
};

const mongoGlobal = globalThis as MongoGlobal;

function createClientPromise(): Promise<MongoClient> {
  const client = new MongoClient(uri!, options);
  return client.connect();
}

const clientPromise =
  process.env.NODE_ENV === 'development'
    ? (mongoGlobal._futureOfMilkBookMongoPromise ??=
        createClientPromise())
    : createClientPromise();

export default clientPromise;
